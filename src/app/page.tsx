import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">DANI PHANTOM</h1>
        <p className="mt-2 text-sm text-neutral-600">A simple, self-hosted URL shortener.</p>

        {params.error === "not-found" && (
          <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            That short link doesn&apos;t exist or has been removed.
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {data.user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
