-- TBC: provision public Storage bucket for device photos + a backup table for
-- the base64→storage backfill (so we can roll back if needed). The bucket is
-- public because URLs contain UUID paths; read access is effectively via
-- obscurity + CSP. Writes go through the service-role server only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tbc-photos', 'tbc-photos', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Pre-migration snapshot table. Populated by scripts/migrate-tbc-photos-to-storage.mjs
-- before any device photo fields are rewritten.
create table if not exists public.tbc_branches_photos_backup (
  id            bigserial primary key,
  branch_id     bigint not null,
  devices_pre   jsonb not null,
  migrated_at   timestamptz not null default now(),
  migrated_by   text,
  notes         text
);

create index if not exists tbc_branches_photos_backup_branch_idx
  on public.tbc_branches_photos_backup (branch_id);
