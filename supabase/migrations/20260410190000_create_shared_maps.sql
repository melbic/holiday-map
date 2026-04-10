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
  position integer not null,
  title text not null,
  type text not null,
  description text not null default '',
  latitude double precision null,
  longitude double precision null,
  link text null,
  photo text null
);

create index if not exists locations_map_id_idx on public.locations (map_id);
create unique index if not exists locations_map_id_position_idx on public.locations (map_id, position);
create index if not exists maps_last_changed_at_idx on public.maps (last_changed_at);

alter table public.maps enable row level security;
alter table public.locations enable row level security;

revoke all on public.maps from anon, authenticated;
revoke all on public.locations from anon, authenticated;

do $migration$
begin
  execute $create_shared_map$
    create or replace function public.create_shared_map_atomic(
      p_map_id uuid,
      p_name text,
      p_edit_secret_hash text,
      p_locations jsonb
    ) returns table (share_id uuid, last_changed_at timestamptz)
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    declare
      inserted_last_changed_at timestamptz;
    begin
      insert into public.maps (id, name, edit_secret_hash)
      values (p_map_id, nullif(trim(p_name), ''), p_edit_secret_hash)
      returning maps.share_id, maps.last_changed_at into share_id, inserted_last_changed_at;

      insert into public.locations (
        map_id,
        position,
        title,
        type,
        description,
        latitude,
        longitude,
        link,
        photo
      )
      select
        p_map_id,
        (location ->> 'position')::integer,
        location ->> 'title',
        location ->> 'type',
        coalesce(location ->> 'description', ''),
        nullif(location ->> 'latitude', '')::double precision,
        nullif(location ->> 'longitude', '')::double precision,
        nullif(location ->> 'link', ''),
        nullif(location ->> 'photo', '')
      from jsonb_array_elements(p_locations) as location;

      last_changed_at := inserted_last_changed_at;
      return next;
    end;
    $function$
  $create_shared_map$;

  execute $update_shared_map$
    create or replace function public.update_shared_map_atomic(
      p_map_id uuid,
      p_name text,
      p_locations jsonb
    ) returns table (last_changed_at timestamptz)
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    declare
      updated_last_changed_at timestamptz;
    begin
      delete from public.locations where map_id = p_map_id;

      insert into public.locations (
        map_id,
        position,
        title,
        type,
        description,
        latitude,
        longitude,
        link,
        photo
      )
      select
        p_map_id,
        (location ->> 'position')::integer,
        location ->> 'title',
        location ->> 'type',
        coalesce(location ->> 'description', ''),
        nullif(location ->> 'latitude', '')::double precision,
        nullif(location ->> 'longitude', '')::double precision,
        nullif(location ->> 'link', ''),
        nullif(location ->> 'photo', '')
      from jsonb_array_elements(p_locations) as location;

      update public.maps
      set
        name = nullif(trim(p_name), ''),
        last_changed_at = now()
      where id = p_map_id
      returning maps.last_changed_at into updated_last_changed_at;

      last_changed_at := updated_last_changed_at;
      return next;
    end;
    $function$
  $update_shared_map$;

  execute 'revoke all on function public.create_shared_map_atomic(uuid, text, text, jsonb) from public, anon, authenticated';
  execute 'revoke all on function public.update_shared_map_atomic(uuid, text, jsonb) from public, anon, authenticated';
  execute 'grant execute on function public.create_shared_map_atomic(uuid, text, text, jsonb) to service_role';
  execute 'grant execute on function public.update_shared_map_atomic(uuid, text, jsonb) to service_role';
end;
$migration$;
