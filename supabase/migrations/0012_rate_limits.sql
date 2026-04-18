-- engineers.ge · durable rate-limit table (replaces in-memory throttle)
-- Used by /api/login + /api/verify-email/resend to survive serverless cold
-- starts and multi-instance Fluid Compute.
--
-- Keyed by (bucket, key) where:
--   bucket = 'login' | 'verify_resend' | 'register' | ...
--   key    = email (lowercased), IP, or composite
--
-- Convention: write-through from app code via supabaseAdmin(). No trigger/RLS
-- surface (service_role only).

create table if not exists public.rate_limits (
  bucket        text        not null,
  key           text        not null,
  fail_count    int         not null default 0,
  locked_until  timestamptz,
  last_attempt  timestamptz not null default now(),
  primary key (bucket, key)
);

create index if not exists rate_limits_locked_idx
  on public.rate_limits (locked_until)
  where locked_until is not null;

alter table public.rate_limits enable row level security;

-- Housekeeping: purge rows older than 30 days and not locked.
create or replace function public.purge_rate_limits()
returns int language plpgsql as $$
declare
  removed int := 0;
begin
  with d as (
    delete from public.rate_limits
     where (locked_until is null or locked_until < now() - interval '1 day')
       and last_attempt < now() - interval '30 days'
     returning 1
  )
  select count(*) into removed from d;
  return removed;
end;
$$;

comment on function public.purge_rate_limits() is
  'Call from Vercel Cron (weekly) to purge stale throttle records.';
