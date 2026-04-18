-- engineers.ge · referral-code generation + email verification + engineer verify
-- Complements 0010_users_referrals_trash.sql. Everything idempotent.

-- 1. users: add verified_engineer + backfill ref_code -------------------------

alter table public.users
  add column if not exists verified_engineer        boolean not null default false,
  add column if not exists verified_engineer_at     timestamptz,
  add column if not exists verified_engineer_by     uuid references public.users(id) on delete set null,
  add column if not exists email_verified_at        timestamptz,
  add column if not exists fraud_score              int     not null default 0,
  add column if not exists disposable_email         boolean not null default false;

create index if not exists users_ref_code_uidx
  on public.users (lower(ref_code))
  where ref_code is not null;

create index if not exists users_verified_eng_idx
  on public.users (verified_engineer)
  where verified_engineer = true;

-- Ref-code generator: short base36 of random bytes, prefixed
create or replace function public.generate_ref_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  tries     int := 0;
begin
  loop
    candidate := 'ge_' || lower(substr(md5(gen_random_uuid()::text), 1, 6));
    perform 1 from public.users where lower(ref_code) = candidate;
    if not found then
      return candidate;
    end if;
    tries := tries + 1;
    if tries > 8 then
      return 'ge_' || lower(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
    end if;
  end loop;
end;
$$;

-- Backfill ref_code for existing users
update public.users
   set ref_code = public.generate_ref_code()
 where ref_code is null;

-- Trigger: assign ref_code on insert if missing
create or replace function public.users_assign_ref_code()
returns trigger language plpgsql as $$
begin
  if new.ref_code is null or length(new.ref_code) < 3 then
    new.ref_code := public.generate_ref_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_assign_ref_code on public.users;
create trigger trg_users_assign_ref_code
  before insert on public.users
  for each row execute function public.users_assign_ref_code();

-- 2. Email verification tokens ------------------------------------------------

create table if not exists public.email_verify_tokens (
  token        text    primary key,
  user_id      uuid    not null references public.users(id) on delete cascade,
  email        text    not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz
);

create index if not exists evt_user_idx    on public.email_verify_tokens (user_id);
create index if not exists evt_expires_idx on public.email_verify_tokens (expires_at);

alter table public.email_verify_tokens enable row level security;

-- 3. Fraud-flag helper view (admin quick review) ------------------------------

create or replace view public.users_review_queue as
  select
    u.id,
    u.email,
    u.name,
    u.registered_at,
    u.email_verified,
    u.verified_engineer,
    u.disposable_email,
    u.fraud_score,
    u.source,
    u.referred_by_user_id,
    u.ref_code
  from public.users u
  where u.deleted_at is null
    and (
      u.disposable_email = true
      or u.fraud_score > 0
      or (u.source = 'referred' and u.email_verified = false)
      or u.verified_engineer = false
    )
  order by u.registered_at desc;
