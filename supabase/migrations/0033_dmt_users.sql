-- engineers.ge · DMT users (multi-tenant internal ops app)
-- Standalone user pool for /dmt/* portal — separate from engineers.ge public users + the single admin.

create table if not exists public.dmt_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null default '',
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references public.dmt_users(id) on delete set null,
  last_login_at timestamptz,
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dmt_users_email_idx on public.dmt_users (lower(email));
create index if not exists dmt_users_status_idx on public.dmt_users (status);

-- RLS off — access goes through server-side service role only (lib/dmt/auth.ts).
alter table public.dmt_users disable row level security;

comment on table public.dmt_users is
  'DMT portal users. Multi-tenant ops app at /dmt/*. Separate auth pool from the single engineers.ge admin.';
