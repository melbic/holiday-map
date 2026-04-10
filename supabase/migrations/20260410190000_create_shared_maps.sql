create extension if not exists pgcrypto with schema extensions;

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  name text null,
  share_id uuid not null unique default gen_random_uuid(),
  edit_secret_hash text not null,
  last_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  title text not null,
  type text not null,
  description text not null default '',
  latitude double precision null,
  longitude double precision null,
  link text null,
  photo text null
);

create index if not exists locations_map_id_idx on public.locations (map_id);
create index if not exists maps_last_changed_at_idx on public.maps (last_changed_at);
