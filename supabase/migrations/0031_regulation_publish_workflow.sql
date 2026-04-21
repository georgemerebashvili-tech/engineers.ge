-- engineers.ge · regulation publish workflow
-- Separates latest fetched snapshot from admin-approved/published reference.

alter table public.regulation_sources
  add column if not exists published_hash text,
  add column if not exists published_excerpt text,
  add column if not exists published_snapshot_id bigint,
  add column if not exists published_at timestamptz;

alter table public.regulation_source_snapshots
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists review_note text not null default '';

create index if not exists regulation_source_snapshots_published_idx
  on public.regulation_source_snapshots(source_id, published, fetched_at desc);
