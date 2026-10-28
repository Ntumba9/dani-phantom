import type { SupabaseClient } from "@supabase/supabase-js";
import { generateShortCode } from "./shortcode";
import { validateDestinationUrl } from "./url";

export type Link = {
  id: string;
  user_id: string;
  short_code: string;
  target_url: string;
  clicks: number;
  created_at: string;
};

export type CreateLinkResult =
  | { ok: true; link: Link }
  | { ok: false; error: string; status: 400 | 401 | 429 | 500 };

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_LINKS = 20;
const MAX_SHORT_CODE_ATTEMPTS = 5;

/**
 * Creates a short link for `userId`. Always writes `user_id` from the
 * authenticated session passed in by the caller, never from client input,
 * so a request cannot create links on another user's behalf.
 */
export async function createLink(
  supabase: SupabaseClient,
  userId: string,
  rawUrl: string,
): Promise<CreateLinkResult> {
  const validation = validateDestinationUrl(rawUrl);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  const { data: recentCount, error: countError } = await supabase.rpc(
    "count_recent_links",
    { p_user_id: userId, p_since: since },
  );
  if (countError) {
    return { ok: false, error: "Could not create link right now.", status: 500 };
  }
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_LINKS) {
    return {
      ok: false,
      error: `You can create at most ${RATE_LIMIT_MAX_LINKS} links every ${RATE_LIMIT_WINDOW_MINUTES} minutes. Try again shortly.`,
      status: 429,
    };
  }

  for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    const { data, error } = await supabase
      .from("links")
      .insert({ user_id: userId, short_code: shortCode, target_url: validation.normalized })
      .select()
      .single();

    if (!error && data) {
      return { ok: true, link: data as Link };
    }

    // Unique violation on short_code: retry with a new code.
    if (error && error.code !== "23505") {
      return { ok: false, error: "Could not create link right now.", status: 500 };
    }
  }

  return { ok: false, error: "Could not generate a unique short code. Try again.", status: 500 };
}

export async function listLinksForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Link[]> {
  const { data, error } = await supabase
    .from("links")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Link[];
}

export type DeleteLinkResult = { ok: true } | { ok: false; error: string; status: 404 | 500 };

/**
 * Deletes a link, scoping the query to `userId` in addition to relying on
 * RLS, so a user can never delete a link they don't own even if the
 * `id` of someone else's link is guessed or leaked.
 */
export async function deleteLinkForUser(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
): Promise<DeleteLinkResult> {
  const { data, error } = await supabase
    .from("links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", userId)
    .select();

  if (error) {
    return { ok: false, error: "Could not delete link.", status: 500 };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Link not found.", status: 404 };
  }
  return { ok: true };
}
