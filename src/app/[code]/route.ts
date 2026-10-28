import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveShortCode } from "@/lib/redirect";

// Short codes that collide with real app routes so they never 404 into
// the redirect handler and "swallow" links created with those codes.
const RESERVED_CODES = new Set([
  "login",
  "register",
  "dashboard",
  "auth",
  "api",
  "favicon.ico",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (RESERVED_CODES.has(code)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const result = await resolveShortCode(supabase, code);

  if (!result.found) {
    return NextResponse.redirect(new URL("/?error=not-found", _request.url));
  }

  return NextResponse.redirect(result.targetUrl, { status: 302 });
}
