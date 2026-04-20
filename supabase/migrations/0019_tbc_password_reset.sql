-- engineers.ge · TBC password reset (email + tokens).
-- Adds email column to tbc_users and creates a token table for resets.

alter table public.tbc_users add column if not exists email text;
create index if not exists tbc_users_email_lower_idx on public.tbc_users (lower(email));

create table if not exists public.tbc_password_reset_tokens (
  token        text primary key,
  user_id      uuid not null references public.tbc_users(id) on delete cascade,
  email        text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  ip           text,
  created_by   text,                    -- admin username who triggered (null if self-service)
  created_at   timestamptz not null default now()
);

create index if not exists tbc_prt_user_idx on public.tbc_password_reset_tokens (user_id);
create index if not exists tbc_prt_expires_idx on public.tbc_password_reset_tokens (expires_at);
create index if not exists tbc_prt_unconsumed_idx on public.tbc_password_reset_tokens (user_id) where consumed_at is null;

alter table public.tbc_password_reset_tokens enable row level security;
