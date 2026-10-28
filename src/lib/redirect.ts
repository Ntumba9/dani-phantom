import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidShortCodeFormat } from "./shortcode";

export type ResolveResult =
  | { found: true; targetUrl: string }
  | { found: false };

/**
 * Resolves a short code to its destination URL via the `resolve_short_link`
 * Postgres function. That function is SECURITY DEFINER and only ever
 * returns a single target_url for a known code -- the `links` table itself
 * has no public read policy, so this is the only way to read a destination
 * without owning the link.
 */
export async function resolveShortCode(
  supabase: SupabaseClient,
  code: string,
): Promise<ResolveResult> {
  if (!isValidShortCodeFormat(code)) {
    return { found: false };
  }

  const { data, error } = await supabase.rpc("resolve_short_link", {
    p_short_code: code,
  });

  if (error || !data || data.length === 0) {
    return { found: false };
  }

  const targetUrl = data[0]?.target_url;
  if (typeof targetUrl !== "string") {
    return { found: false };
  }

  return { found: true, targetUrl };
}
