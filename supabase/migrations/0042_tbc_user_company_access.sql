-- engineers.ge · TBC · per-user company visibility.
-- Admins always see everything (no check). For role='user' the rule is:
--   • zero rows here → sees NO companies
--   • rows with specific company_id → sees only those companies
--   • special row with company_id = null → sees ALL companies (wildcard)

create table if not exists public.tbc_user_company_access (
  id         bigserial primary key,
  user_id    uuid not null references public.tbc_users(id) on delete cascade,
  company_id bigint references public.tbc_companies(id) on delete cascade,   -- null = wildcard "ყველა კომპანია"
  created_at timestamptz not null default now(),
  created_by text
);

-- one row per (user, company) pair; the special wildcard row uses coalesce(-1).
create unique index if not exists tbc_user_company_access_unique
  on public.tbc_user_company_access (user_id, coalesce(company_id, -1));

create index if not exists tbc_user_company_access_user_idx
  on public.tbc_user_company_access (user_id);

create index if not exists tbc_user_company_access_company_idx
  on public.tbc_user_company_access (company_id);

alter table public.tbc_user_company_access enable row level security;

comment on table public.tbc_user_company_access is
  'Per-user (role=user) visibility of tbc_companies. Admins bypass this check server-side. company_id=null means wildcard "all companies".';

-- ============================================
-- BACKFILL — preserve pre-migration behavior.
-- Before this migration, ALL users saw ALL companies. Flipping the gate on
-- without a default would silently make every non-admin user see zero
-- companies. Grant wildcard to every existing non-admin user that currently
-- has no access row, so their visible list stays identical. Admin can
-- tighten from the UI later.
-- Idempotent via NOT EXISTS: re-running touches no rows.
-- ============================================
insert into public.tbc_user_company_access (user_id, company_id, created_by)
select u.id, null, 'migration:0042'
from public.tbc_users u
where u.role = 'user'
  and not exists (
    select 1 from public.tbc_user_company_access a
    where a.user_id = u.id
  );
