-- Links table: each short link belongs to exactly one user.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  short_code text not null unique,
  target_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists links_user_id_idx on public.links (user_id);
create index if not exists links_created_at_idx on public.links (user_id, created_at desc);

alter table public.links enable row level security;

-- Owners can see only their own links.
create policy "Users can select own links"
  on public.links for select
  using (auth.uid() = user_id);

-- Owners can create links only for themselves.
create policy "Users can insert own links"
  on public.links for insert
  with check (auth.uid() = user_id);

-- Owners can delete only their own links.
create policy "Users can delete own links"
  on public.links for delete
  using (auth.uid() = user_id);

-- No update policy is defined: with RLS enabled and no matching policy,
-- updates are denied by default for every role except the service role.

-- Public redirect lookup, exposed only through this function so the
-- `links` table itself never needs to be readable by anonymous users.
-- SECURITY DEFINER lets it bypass RLS, but it only ever returns a single
-- target_url for a known short_code and atomically increments clicks.
create or replace function public.resolve_short_link(p_short_code text)
returns table (target_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.links
  set clicks = clicks + 1
  where short_code = p_short_code
  returning links.target_url;
end;
$$;

revoke all on function public.resolve_short_link(text) from public;
grant execute on function public.resolve_short_link(text) to anon, authenticated;

-- Helper used by the app to enforce per-user rate limiting on link
-- creation without needing an external store like Redis.
create or replace function public.count_recent_links(p_user_id uuid, p_since timestamptz)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.links
  where user_id = p_user_id
    and created_at > p_since;
$$;

-- Supabase grants EXECUTE on new functions to anon/authenticated/service_role
-- by default, independently of the PUBLIC pseudo-role above. Revoke from
-- anon explicitly so an unauthenticated caller can't pass an arbitrary
-- p_user_id and learn another user's recent link count.
revoke all on function public.count_recent_links(uuid, timestamptz) from public;
revoke execute on function public.count_recent_links(uuid, timestamptz) from anon;
grant execute on function public.count_recent_links(uuid, timestamptz) to authenticated;
