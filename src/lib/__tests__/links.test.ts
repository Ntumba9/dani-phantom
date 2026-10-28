import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLink, deleteLinkForUser, listLinksForUser } from "../links";

/**
 * Builds a minimal fake Supabase client. `fromImpl` receives the table name
 * and should return an object exposing exactly the chainable methods the
 * code under test calls; each one returns `this` until the chain is
 * awaited, at which point `then` resolves with the configured result.
 */
function fakeSupabase(opts: {
  rpc?: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from?: (table: string) => Record<string, unknown>;
}): SupabaseClient {
  return {
    rpc: opts.rpc ?? vi.fn(),
    from: opts.from ?? vi.fn(),
  } as unknown as SupabaseClient;
}

function chainResolvingTo(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain as never;
  chain.insert = vi.fn(self);
  chain.select = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.order = vi.fn(self);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (r: typeof result) => unknown) => resolve(result);
  return chain;
}

describe("createLink", () => {
  it("rejects invalid URLs before touching the database", async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    const supabase = fakeSupabase({ rpc, from });

    const result = await createLink(supabase, "user-1", "javascript:alert(1)");

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects creation once the per-user rate limit is hit", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 20, error: null });
    const from = vi.fn();
    const supabase = fakeSupabase({ rpc, from });

    const result = await createLink(supabase, "user-1", "https://example.com");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(429);
    expect(from).not.toHaveBeenCalled();
  });

  it("writes the link with the caller's userId, not anything from the input", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const chain = chainResolvingTo({
      data: { id: "1", user_id: "user-1", short_code: "abc123", target_url: "https://example.com/", clicks: 0, created_at: "now" },
      error: null,
    });
    const from = vi.fn(() => chain);
    const supabase = fakeSupabase({ rpc, from });

    const result = await createLink(supabase, "user-1", "https://example.com");

    expect(result.ok).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", target_url: "https://example.com/" }),
    );
  });

  it("retries with a new short code on a unique-constraint collision", async () => {
    let call = 0;
    const chain: Record<string, unknown> = {};
    const self = () => chain as never;
    chain.insert = vi.fn(self);
    chain.select = vi.fn(self);
    chain.single = vi.fn(() => {
      call += 1;
      if (call < 3) {
        return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate" } });
      }
      return Promise.resolve({
        data: { id: "1", user_id: "user-1", short_code: "zzz999", target_url: "https://example.com/", clicks: 0, created_at: "now" },
        error: null,
      });
    });

    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const from = vi.fn(() => chain);
    const supabase = fakeSupabase({ rpc, from });

    const result = await createLink(supabase, "user-1", "https://example.com");

    expect(result.ok).toBe(true);
    expect(chain.insert).toHaveBeenCalledTimes(3);
  });
});

describe("listLinksForUser", () => {
  it("scopes the query to the given userId", async () => {
    const chain = chainResolvingTo({ data: [], error: null });
    const from = vi.fn(() => chain);
    const supabase = fakeSupabase({ from });

    await listLinksForUser(supabase, "user-1");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});

describe("deleteLinkForUser", () => {
  it("scopes the delete to both the link id and the owner's userId", async () => {
    const chain = chainResolvingTo({ data: [{ id: "link-1" }], error: null });
    const from = vi.fn(() => chain);
    const supabase = fakeSupabase({ from });

    const result = await deleteLinkForUser(supabase, "user-1", "link-1");

    expect(result.ok).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith("id", "link-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("reports not-found instead of silently succeeding when nothing matched", async () => {
    // Simulates another user's link id: RLS/the user_id filter excludes it,
    // so Postgres reports zero rows affected rather than an error.
    const chain = chainResolvingTo({ data: [], error: null });
    const from = vi.fn(() => chain);
    const supabase = fakeSupabase({ from });

    const result = await deleteLinkForUser(supabase, "user-1", "someone-elses-link");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});
