-- engineers.ge · TBC archive guards
-- Purpose: replace hard delete with 30-day archive metadata across TBC entities.

alter table public.tbc_users
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_expires_at timestamptz,
  add column if not exists archive_reason text;

alter table public.tbc_companies
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_expires_at timestamptz,
  add column if not exists archive_reason text;

alter table public.tbc_branches
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_expires_at timestamptz,
  add column if not exists archive_reason text;

alter table public.tbc_branch_comments
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_expires_at timestamptz,
  add column if not exists archive_reason text;

alter table public.tbc_estimate_items
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_expires_at timestamptz,
  add column if not exists archive_reason text;

create index if not exists tbc_users_archived_idx
  on public.tbc_users (archived_at);

create index if not exists tbc_companies_archived_idx
  on public.tbc_companies (archived_at);

create index if not exists tbc_branches_archived_idx
  on public.tbc_branches (archived_at);

create index if not exists tbc_comments_archived_idx
  on public.tbc_branch_comments (branch_id, archived_at, created_at desc);

create index if not exists tbc_estimate_archived_idx
  on public.tbc_estimate_items (branch_id, archived_at, sort_order);
