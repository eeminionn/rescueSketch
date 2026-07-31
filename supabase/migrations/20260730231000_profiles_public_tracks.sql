create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_login text not null unique check (char_length(github_login) between 1 and 39),
  github_id bigint not null unique,
  language text not null default 'es' check (language in ('es', 'en')),
  license_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  github_login text not null,
  track_path text not null unique,
  branch_name text not null,
  pull_request_number integer,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected')),
  head_sha text,
  checksum text,
  schema_version text not null,
  ruleset_version text not null,
  catalog_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.public_tracks enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "tracks_select_public_or_own" on public.public_tracks for select to authenticated
  using (status = 'approved' or (select auth.uid()) = owner_id);
create policy "tracks_insert_own" on public.public_tracks for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "tracks_update_own" on public.public_tracks for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.profiles from anon;
revoke all on public.public_tracks from anon;
