import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveShortCode } from "../redirect";

function fakeSupabase(rpc: ReturnType<typeof vi.fn>): SupabaseClient {
  return { rpc } as unknown as SupabaseClient;
}

describe("resolveShortCode", () => {
  it("returns the target URL for a known code", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ target_url: "https://example.com/" }], error: null });
    const supabase = fakeSupabase(rpc);

    const result = await resolveShortCode(supabase, "abc1234");

    expect(result).toEqual({ found: true, targetUrl: "https://example.com/" });
    expect(rpc).toHaveBeenCalledWith("resolve_short_link", { p_short_code: "abc1234" });
  });

  it("reports not found when no row matches", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = fakeSupabase(rpc);

    const result = await resolveShortCode(supabase, "doesnotexist");

    expect(result).toEqual({ found: false });
  });

  it("reports not found on a database error instead of throwing", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const supabase = fakeSupabase(rpc);

    const result = await resolveShortCode(supabase, "abc1234");

    expect(result).toEqual({ found: false });
  });

  it("rejects malformed codes without querying the database", async () => {
    const rpc = vi.fn();
    const supabase = fakeSupabase(rpc);

    const result = await resolveShortCode(supabase, "../../etc/passwd");

    expect(result).toEqual({ found: false });
    expect(rpc).not.toHaveBeenCalled();
  });
});
