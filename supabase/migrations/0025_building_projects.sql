-- Task 022 — building_projects table + RLS + size guard + auto-slug
-- Ships without a Supabase project; apply when DATABASE_URL is provisioned
-- via `npm run db:migrate`. Idempotent — safe to re-run.

create extension if not exists "uuid-ossp";

create table if not exists public.building_projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  slug text,
  schema_version int not null default 1,
  state jsonb not null,
  thumbnail_url text,
  dxf_source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bp_user_updated
  on public.building_projects (user_id, updated_at desc);
create index if not exists idx_bp_slug
  on public.building_projects (user_id, slug);

-- auto-touch updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bp_updated_at on public.building_projects;
create trigger bp_updated_at
  before update on public.building_projects
  for each row execute function public.set_updated_at();

-- slug generator (keeps ა-ჰ)
create or replace function public.gen_slug(raw text) returns text as $$
  select lower(regexp_replace(raw, '[^a-zA-Z0-9\u10A0-\u10FF]+', '-', 'g'));
$$ language sql immutable;

create or replace function public.bp_auto_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.gen_slug(new.name);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists bp_auto_slug_trigger on public.building_projects;
create trigger bp_auto_slug_trigger
  before insert or update on public.building_projects
  for each row execute function public.bp_auto_slug();

-- size guard: reject payloads > 1 MiB
create or replace function public.bp_size_check()
returns trigger as $$
begin
  if octet_length(new.state::text) > 1048576 then
    raise exception 'state exceeds 1MB (%s, max 1048576)', octet_length(new.state::text);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists bp_size_check_trigger on public.building_projects;
create trigger bp_size_check_trigger
  before insert or update on public.building_projects
  for each row execute function public.bp_size_check();

-- RLS: strict per-user ownership
alter table public.building_projects enable row level security;

drop policy if exists "bp own select" on public.building_projects;
create policy "bp own select" on public.building_projects
  for select using (auth.uid() = user_id);

drop policy if exists "bp own insert" on public.building_projects;
create policy "bp own insert" on public.building_projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "bp own update" on public.building_projects;
create policy "bp own update" on public.building_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bp own delete" on public.building_projects;
create policy "bp own delete" on public.building_projects
  for delete using (auth.uid() = user_id);

comment on table public.building_projects is
  'Task 022 — per-user saved building projects. RLS enforces ownership. 1 MiB per state.';
