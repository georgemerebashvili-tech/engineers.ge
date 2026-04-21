-- Admin password reset tokens — for single-user admin auth (ADMIN_USER + ADMIN_PASS_HASH env).
-- Separate from `password_reset_tokens` (user accounts) and `tbc_password_reset_tokens` (TBC).
-- Idempotent.

create table if not exists public.admin_password_reset_tokens (
  token        text primary key,
  email        text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  ip           text,
  created_at   timestamptz not null default now()
);

create index if not exists admin_prt_expires_idx on public.admin_password_reset_tokens (expires_at);
create index if not exists admin_prt_unconsumed_idx on public.admin_password_reset_tokens (email) where consumed_at is null;

alter table public.admin_password_reset_tokens enable row level security;
-- No policies — service role only (bypasses RLS). Anon/authenticated cannot read.
