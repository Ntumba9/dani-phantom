import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listLinksForUser } from "@/lib/links";
import { createLinkAction, deleteLinkAction } from "./actions";
import { logout } from "../(auth)/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const links = await listLinksForUser(supabase, data.user.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-neutral-900">DANI PHANTOM</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">{data.user.email}</span>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium text-neutral-700 underline">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900">Your links</h1>

        {params.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form
          action={createLinkAction}
          className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-start"
        >
          <input
            type="url"
            name="url"
            required
            placeholder="https://example.com/your-long-link"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Shorten
          </button>
        </form>

        {links.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No links yet. Paste a URL above to create your first short link.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <a
                    href={`${siteUrl}/${link.short_code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-neutral-900 underline"
                  >
                    {siteUrl.replace(/^https?:\/\//, "")}/{link.short_code}
                  </a>
                  <p className="truncate text-xs text-neutral-500">{link.target_url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-sm text-neutral-600">{link.clicks} clicks</span>
                  <form action={deleteLinkAction}>
                    <input type="hidden" name="linkId" value={link.id} />
                    <button type="submit" className="text-sm text-red-600 underline">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
