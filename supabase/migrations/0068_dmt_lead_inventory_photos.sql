-- DMT per-lead inventory photos with AI analysis metadata.
-- Idempotent and additive only.

create table if not exists public.dmt_lead_inventory_photos (
  id              text primary key,
  lead_id         text not null,
  photo_url       text not null,
  thumbnail_url   text,
  ai_analyzed     boolean not null default false,
  ai_analysis     jsonb,
  ai_model        text,
  ai_analyzed_at  timestamptz,
  ai_error        text,
  matched_inventory_id uuid,
  matched_qty     int,
  user_notes      text not null default '',
  deleted_at      timestamptz,
  deleted_by      text,
  created_at      timestamptz not null default now(),
  created_by      text not null,
  updated_at      timestamptz not null default now(),
  updated_by      text not null
);

create index if not exists dmt_lead_inventory_photos_lead_idx
  on public.dmt_lead_inventory_photos (lead_id);

create index if not exists dmt_lead_inventory_photos_ai_idx
  on public.dmt_lead_inventory_photos (ai_analyzed)
  where ai_analyzed = false and deleted_at is null;

create index if not exists dmt_lead_inventory_photos_matched_idx
  on public.dmt_lead_inventory_photos (matched_inventory_id)
  where matched_inventory_id is not null;

create index if not exists dmt_lead_inventory_photos_active_idx
  on public.dmt_lead_inventory_photos (lead_id, created_at desc)
  where deleted_at is null;

alter table public.dmt_lead_inventory_photos disable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dmt-lead-photos',
  'dmt-lead-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
