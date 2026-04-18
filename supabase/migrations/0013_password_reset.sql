-- engineers.ge · password reset tokens
-- Mirrors email_verify_tokens: one-shot bearer token with 1-hour TTL.
-- Tokens are generated server-side (crypto.randomBytes 32 base64url).

create table if not exists public.password_reset_tokens (
  token        text        primary key,
  user_id      uuid        not null references public.users(id) on delete cascade,
  email        text        not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  ip           text
);

create index if not exists prt_user_idx    on public.password_reset_tokens (user_id);
create index if not exists prt_expires_idx on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

-- Weekly housekeeping (cron): purge consumed + expired-1-day rows.
create or replace function public.purge_password_reset_tokens()
returns int language plpgsql as $$
declare removed int := 0;
begin
  with d as (
    delete from public.password_reset_tokens
     where consumed_at is not null
        or expires_at < now() - interval '1 day'
     returning 1
  )
  select count(*) into removed from d;
  return removed;
end;
$$;
