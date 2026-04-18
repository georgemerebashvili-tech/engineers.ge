-- engineers.ge · admin users enhancements + referral contacts + soft-delete trash
-- Adds marketing-critical fields (source, referrer, interests, project_count)
-- and a soft-delete system with 10-day auto-purge.

-- 1. Extend users table --------------------------------------------------

alter table public.users
  add column if not exists source               text not null default 'self'
    check (source in ('self','referred')),
  add column if not exists referred_by_user_id  uuid references public.users(id) on delete set null,
  add column if not exists ref_code             text,
  add column if not exists interests            text[] not null default '{}',
  add column if not exists project_count        int not null default 0,
  add column if not exists deleted_at           timestamptz,
  add column if not exists notes                text;

create index if not exists users_source_idx        on public.users (source);
create index if not exists users_referrer_idx      on public.users (referred_by_user_id);
create index if not exists users_deleted_idx       on public.users (deleted_at)
  where deleted_at is not null;
create index if not exists users_interests_gin     on public.users using gin (interests);

-- 2. referral_contacts table (invites created by referrers) --------------

create table if not exists public.referral_contacts (
  id                  uuid primary key default gen_random_uuid(),
  referrer_id         uuid references public.users(id) on delete cascade,
  anon_referrer_email text,                                   -- for logged-out referrers
  first_name          text not null,
  last_name           text not null,
  category            text,                                    -- electrical / low-voltage / mechanical / hvac / architect / student / other
  tags                text[] not null default '{}',
  phone               text,
  phone_disposable    boolean not null default true,
  email               text,
  linkedin_url        text,
  facebook_url        text,
  status              text not null default 'draft'
    check (status in ('draft','sent','registered','rewarded')),
  registered_user_id  uuid references public.users(id) on delete set null,
  reward_amount_gel   numeric(10,2),
  sent_at             timestamptz,
  registered_at       timestamptz,
  rewarded_at         timestamptz,
  deleted_at          timestamptz,                             -- soft delete
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists rc_referrer_idx    on public.referral_contacts (referrer_id);
create index if not exists rc_status_idx      on public.referral_contacts (status);
create index if not exists rc_email_idx       on public.referral_contacts (lower(email));
create index if not exists rc_phone_idx       on public.referral_contacts (phone);
create index if not exists rc_deleted_idx     on public.referral_contacts (deleted_at)
  where deleted_at is not null;
create index if not exists rc_reg_user_idx    on public.referral_contacts (registered_user_id);

alter table public.referral_contacts enable row level security;

-- 3. Cross-check trigger: when a user registers, match referral_contacts
--    by email or phone and flip status to 'registered'.
create or replace function public.link_referral_on_register()
returns trigger
language plpgsql
as $$
declare
  matched record;
begin
  if new.email is null then return new; end if;

  select *
    into matched
    from public.referral_contacts rc
   where rc.deleted_at is null
     and rc.status in ('draft','sent')
     and rc.registered_user_id is null
     and (
       (rc.email is not null and lower(rc.email) = lower(new.email))
       or (rc.phone is not null and regexp_replace(rc.phone, '\D', '', 'g')
           = regexp_replace(coalesce(new.profession, ''), '\D', '', 'g'))
     )
   order by rc.created_at asc
   limit 1;

  if matched.id is not null then
    update public.referral_contacts
       set status = 'registered',
           registered_user_id = new.id,
           registered_at = now(),
           updated_at = now()
     where id = matched.id;

    -- mark user as referred + link back to inviter
    update public.users
       set source = 'referred',
           referred_by_user_id = matched.referrer_id
     where id = new.id
       and source = 'self';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_link_referral_on_register on public.users;
create trigger trg_link_referral_on_register
  after insert on public.users
  for each row execute function public.link_referral_on_register();

-- 4. Soft-delete helpers + 10-day auto-purge -----------------------------

create or replace function public.purge_soft_deleted()
returns table (users_purged int, contacts_purged int)
language plpgsql
as $$
declare
  u_count int := 0;
  c_count int := 0;
begin
  with d as (
    delete from public.users
     where deleted_at is not null
       and deleted_at < now() - interval '10 days'
     returning 1
  )
  select count(*) into u_count from d;

  with d as (
    delete from public.referral_contacts
     where deleted_at is not null
       and deleted_at < now() - interval '10 days'
     returning 1
  )
  select count(*) into c_count from d;

  return query select u_count, c_count;
end;
$$;

comment on function public.purge_soft_deleted() is
  'Call from Vercel Cron (daily) to permanently delete rows soft-deleted more than 10 days ago.';
