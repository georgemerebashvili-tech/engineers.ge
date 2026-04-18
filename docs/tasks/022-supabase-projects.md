# Task 022 — Supabase `building_projects` Table + RLS

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 013 (schema), user-level auth (Supabase Auth setup)
**User action:** Supabase project must be provisioned (blocker tracked in TODO.md)

## მიზანი

Server-side persistence მხოლოდ ბოლო state-ის (**no version history**). Each user owns projects via RLS.

## Schema

```sql
-- supabase/migrations/NNNN_building_projects.sql
create extension if not exists "uuid-ossp";

create table public.building_projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  slug text,
  schema_version int not null default 1,
  state jsonb not null,
  thumbnail_url text,            -- public bucket URL or base64
  dxf_source jsonb,              -- filename, hash, size
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bp_user_updated on public.building_projects (user_id, updated_at desc);
create index idx_bp_slug on public.building_projects (user_id, slug);

-- trigger: auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bp_updated_at
  before update on public.building_projects
  for each row execute function public.set_updated_at();

-- auto-generate slug from name
create or replace function public.gen_slug(raw text) returns text as $$
  select lower(regexp_replace(raw, '[^a-zA-Z0-9\u10A0-\u10FF]+', '-', 'g'));
$$ language sql immutable;

create or replace function public.bp_auto_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = public.gen_slug(new.name);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger bp_auto_slug_trigger
  before insert or update on public.building_projects
  for each row execute function public.bp_auto_slug();
```

## RLS

```sql
alter table public.building_projects enable row level security;

create policy "own select" on public.building_projects
  for select using (auth.uid() = user_id);

create policy "own insert" on public.building_projects
  for insert with check (auth.uid() = user_id);

create policy "own update" on public.building_projects
  for update using (auth.uid() = user_id);

create policy "own delete" on public.building_projects
  for delete using (auth.uid() = user_id);
```

## Size limit

`state` JSONB — max 1 MB per project (check via trigger; larger → 413 response).

```sql
create or replace function public.bp_size_check()
returns trigger as $$
begin
  if octet_length(new.state::text) > 1048576 then
    raise exception 'state exceeds 1MB (%, max 1048576)', octet_length(new.state::text);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger bp_size_check_trigger
  before insert or update on public.building_projects
  for each row execute function public.bp_size_check();
```

## Server actions (Next.js)

`app/api/projects/` routes OR server actions in composer page.

```ts
// lib/building/projects.server.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Building } from '@/lib/building/module-schema';

export async function saveProject(building: TBuilding, id?: string) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Unauthorized');

  const payload = {
    user_id: user.user.id,
    name: building.name,
    state: building,
    schema_version: building.schemaVersion,
  };

  if (id) {
    const { data, error } = await supabase.from('building_projects').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('building_projects').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

export async function listProjects() { /* SELECT * WHERE user_id = $uid ORDER BY updated_at DESC */ }
export async function loadProject(id: string) { /* */ }
export async function deleteProject(id: string) { /* */ }
```

## UI integration

In composer page header:
- "☁ Cloud save" button → calls `saveProject`
- Dropdown: "My projects" → lists user's projects → click to load
- Save indicator: "✓ Saved 2m ago"

In `/dashboard/projects`:
- Table: name, updated, thumbnail, actions (open / delete)
- "New project" button → opens composer

## Acceptance

- [ ] Migration applied to Supabase
- [ ] RLS verified: user A cannot read user B's projects
- [ ] Size check: 1.5MB payload rejected with friendly error
- [ ] `saveProject` upsert works (id provided = update, no id = insert)
- [ ] `listProjects` returns only user's rows, sorted by updated_at
- [ ] Thumbnail stored in Supabase Storage bucket `project-thumbs` + URL in DB
- [ ] Projects list page at `/dashboard/projects` live
- [ ] Auto-save debounce 3s after state change (matches localStorage autosave)

## Questions

- [ ] Should we keep last-5 backup versions automatically?
  → **User explicitly said:** no version history, only last state.

---

**Status:** pending · blocks on Supabase provision
