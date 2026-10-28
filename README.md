# DANI PHANTOM

A small, self-hosted URL shortener. Register, log in, shorten a URL, share
the short link, and see click counts on your own dashboard.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Auth + Postgres), deployed to Vercel. No Redis, no Docker, no separate
backend — one Next.js app talking directly to Supabase.

## How it works

- **Auth**: Supabase Auth (email + password). Sessions are stored in
  cookies and refreshed by `src/middleware.ts` on every request, which also
  redirects signed-out users away from `/dashboard` — the server, not just
  the UI, enforces who can see the dashboard.
- **Links**: stored in a single `links` table, one row per short link, owned
  by `user_id`. Row Level Security (RLS) policies restrict every select,
  insert, and delete to `auth.uid() = user_id`, so one user's links are
  never visible or mutable by another, even via the raw Supabase REST API.
  The app layer (`src/lib/links.ts`) also scopes every query by the
  session's user id as a second, defense-in-depth check.
- **Redirects**: `GET /:code` (`src/app/[code]/route.ts`) looks up the
  destination through a single Postgres function, `resolve_short_link`.
  That function is the *only* way to read a destination URL without
  owning the link — the `links` table itself has no public read policy,
  so anonymous visitors (and the public REST API) can never enumerate or
  read other users' links, only resolve one specific, already-known code.
  The same function atomically increments the click counter.
- **URL validation**: only `http://` and `https://` destinations are
  accepted (`src/lib/url.ts`); everything else (`javascript:`, `data:`,
  `file:`, etc.) is rejected before it ever reaches the database.
- **Rate limiting**: link creation is capped at 20 links per 10 minutes per
  user, checked against the database (`count_recent_links`) rather than an
  external store, since the brief asks to avoid extra infrastructure.
  This is a simple, "good enough" limit, not a hardened one — see
  [Known limitations](#known-limitations).

## Project structure

```
src/
  app/
    (auth)/login, (auth)/register   -- auth pages + actions.ts (server actions)
    dashboard/                      -- the dashboard page + actions.ts
    [code]/route.ts                 -- the public redirect handler
    auth/callback/route.ts          -- Supabase email-confirmation callback
  lib/
    supabase/{client,server,middleware}.ts -- Supabase client factories
    url.ts, shortcode.ts            -- pure, unit-tested validation/codegen
    links.ts, redirect.ts           -- business logic, unit-tested with a
                                        fake Supabase client (see tests)
  middleware.ts                     -- session refresh + protected routes
supabase/migrations/0001_init.sql   -- schema, RLS policies, SQL functions
```

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com)
   (the free tier is enough).

3. **Apply the migration.** Easiest with the Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   Or paste the contents of `supabase/migrations/0001_init.sql` into the
   SQL editor in the Supabase dashboard and run it.

4. **Configure email auth.** In the Supabase dashboard under
   Authentication -> Providers, email/password sign-up is enabled by
   default. For local development you can disable "Confirm email" under
   Authentication -> Settings so you don't need a working email sender;
   leave it enabled in production.

5. **Set environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   from Project Settings -> API in the Supabase dashboard.

6. **Run it**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, register, confirm your email if
   confirmation is enabled, log in, and create a link.

## Testing

```bash
npm test     # unit tests: URL validation, short codes, redirects,
             # authorization/ownership checks, rate limiting
npm run lint
npm run build
```

Tests cover the pure logic in `src/lib` using a minimal fake Supabase
client (see `src/lib/__tests__`), including:
- only `http(s)` URLs are accepted; `javascript:`, `data:`, `file:` are
  rejected
- short codes are generated from an unambiguous alphabet and validated
  before ever reaching the database
- link creation always writes `user_id` from the authenticated caller,
  never from request input
- listing and deleting a link are always scoped by `user_id`, so deleting
  another user's link id returns "not found" rather than succeeding
- redirect resolution rejects malformed codes without querying the
  database, and treats "no row" / DB errors the same way (no leaking
  which case occurred)
- rate limiting rejects link creation once the per-user window is
  exceeded, before any insert is attempted

These are unit tests against application logic, not a live database.
Before relying on RLS in production, also run the Supabase dashboard's
**Advisors** (Database -> Advisors) after applying the migration, which
flags missing or misconfigured RLS policies.

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" and import the repository.
3. Add the three environment variables from `.env.example` in the Vercel
   project settings (Settings -> Environment Variables). Set
   `NEXT_PUBLIC_SITE_URL` to your production domain (e.g.
   `https://your-app.vercel.app`).
4. In the Supabase dashboard, under Authentication -> URL Configuration,
   add your production URL (and `https://your-app.vercel.app/auth/callback`)
   to the allowed redirect URLs.
5. Deploy. No build configuration is needed beyond the environment
   variables — it's a standard Next.js app.

## Known limitations

- **Rate limiting** is a simple per-user database check (20 links / 10
  minutes), not a hardened distributed limiter. It doesn't throttle by IP,
  so an attacker with many accounts could still create many links overall;
  it only bounds abuse from a single account. Good enough for this app's
  scope without adding Redis or another service.
- **Email delivery**: Supabase's default email provider is rate-limited and
  meant for development. For a real deployment, configure a custom SMTP
  provider in the Supabase dashboard (Authentication -> Settings).
- **No custom domains or expiring links**: out of scope for this version,
  but the schema (`supabase/migrations/0001_init.sql`) is a reasonable
  place to add an `expires_at` column and check it in `resolve_short_link`
  if you want that later.
