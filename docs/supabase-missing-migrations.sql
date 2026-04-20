-- engineers.ge · add link_url to hero_ad_slots
-- Click-through destination URL for each ad tile.

alter table public.hero_ad_slots
  add column if not exists link_url text not null default '';
-- engineers.ge · visitor registration system
-- users + countries with dynamic country addition

create extension if not exists pgcrypto;

-- Countries (reference table, populated on-demand during registration)
create table if not exists public.countries (
  id            bigserial primary key,
  code          text unique,                  -- ISO 3166-1 alpha-2 (e.g. 'GE')
  name_ka       text not null,
  name_en       text not null,
  flag_emoji    text,
  created_at    timestamptz not null default now()
);

create index if not exists countries_name_ka_idx on public.countries (name_ka);
create index if not exists countries_name_en_idx on public.countries (name_en);

-- Seed common countries (user may add more)
insert into public.countries (code, name_ka, name_en, flag_emoji) values
  ('GE', 'საქართველო', 'Georgia', '🇬🇪'),
  ('US', 'აშშ', 'United States', '🇺🇸'),
  ('GB', 'დიდი ბრიტანეთი', 'United Kingdom', '🇬🇧'),
  ('DE', 'გერმანია', 'Germany', '🇩🇪'),
  ('FR', 'საფრანგეთი', 'France', '🇫🇷'),
  ('TR', 'თურქეთი', 'Turkey', '🇹🇷'),
  ('RU', 'რუსეთი', 'Russia', '🇷🇺'),
  ('AZ', 'აზერბაიჯანი', 'Azerbaijan', '🇦🇿'),
  ('AM', 'სომხეთი', 'Armenia', '🇦🇲'),
  ('UA', 'უკრაინა', 'Ukraine', '🇺🇦'),
  ('IT', 'იტალია', 'Italy', '🇮🇹'),
  ('ES', 'ესპანეთი', 'Spain', '🇪🇸'),
  ('PL', 'პოლონეთი', 'Poland', '🇵🇱'),
  ('NL', 'ნიდერლანდები', 'Netherlands', '🇳🇱'),
  ('GR', 'საბერძნეთი', 'Greece', '🇬🇷'),
  ('IL', 'ისრაელი', 'Israel', '🇮🇱'),
  ('AE', 'არაბთა გაერთიანებული საამიროები', 'United Arab Emirates', '🇦🇪'),
  ('CN', 'ჩინეთი', 'China', '🇨🇳'),
  ('IN', 'ინდოეთი', 'India', '🇮🇳'),
  ('JP', 'იაპონია', 'Japan', '🇯🇵'),
  ('CA', 'კანადა', 'Canada', '🇨🇦'),
  ('AU', 'ავსტრალია', 'Australia', '🇦🇺'),
  ('BR', 'ბრაზილია', 'Brazil', '🇧🇷'),
  ('MX', 'მექსიკა', 'Mexico', '🇲🇽'),
  ('EG', 'ეგვიპტე', 'Egypt', '🇪🇬'),
  ('SA', 'საუდის არაბეთი', 'Saudi Arabia', '🇸🇦')
on conflict (code) do nothing;

alter table public.countries enable row level security;

-- Users: registered visitors
create table if not exists public.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text not null,
  country_id         bigint references public.countries(id) on delete set null,
  language           text not null default 'ka' check (language in ('ka','en','ru','tr','az','hy')),
  profession         text,
  visitor_id         uuid,
  password_hash      text not null,
  password_salt      text not null,
  hash_algo          text not null default 'PBKDF2-SHA256-210000',
  email_verified     boolean not null default false,
  registered_at      timestamptz not null default now(),
  last_login_at      timestamptz
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_country_idx on public.users (country_id);
create index if not exists users_registered_idx on public.users (registered_at desc);
create index if not exists users_language_idx on public.users (language);

alter table public.users enable row level security;
-- engineers.ge · AI settings (Anthropic / Claude API)
-- Single-row table with API key + model preferences, editable from admin.

create table if not exists public.ai_settings (
  id                integer primary key default 1,
  anthropic_api_key text,
  default_model     text not null default 'claude-haiku-4-5-20251001',
  enabled           boolean not null default true,
  updated_at        timestamptz not null default now(),
  constraint ai_settings_single_row check (id = 1)
);

insert into public.ai_settings (id) values (1)
on conflict (id) do nothing;

alter table public.ai_settings enable row level security;
-- engineers.ge · admin-editable copy
-- Adds visibility toggles and editable text fields for share bar,
-- donation modal, and referral/ad widget. Admin panel writes; public APIs read.

alter table public.share_settings
  add column if not exists visible       boolean not null default true,
  add column if not exists intro_text    text    not null default 'აცნობე ყველას 👉',
  add column if not exists facebook_url  text    not null default '',
  add column if not exists x_url         text    not null default '',
  add column if not exists linkedin_url  text    not null default '',
  add column if not exists telegram_url  text    not null default '',
  add column if not exists whatsapp_url  text    not null default '';

alter table public.donation_settings
  add column if not exists heading_text     text not null default 'მხარდაჭერა',
  add column if not exists description_text text not null default 'engineers.ge უფასოა ყველასთვის. ყოველი ლარი გვეხმარება ახალი ინსტრუმენტების და ქართული საინჟინრო კონტენტის აშენებაში.',
  add column if not exists ad_visible       boolean not null default true,
  add column if not exists ad_text_long     text not null default 'იშოვე 3000 ლარამდე',
  add column if not exists ad_text_short    text not null default '3000 ₾';
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
-- claude_session_events: append-only log of Claude Code hook events
-- server-side `event_at` is source of truth; `client_at` comes from hook payload
-- and is stored for cross-reference but never trusted for aggregates.

create table if not exists public.claude_session_events (
  id          bigserial primary key,
  session_id  text not null,
  kind        text not null check (kind in ('start', 'end', 'stop')),
  event_at    timestamptz not null default now(),
  client_at   timestamptz,
  project     text,
  cwd         text,
  model       text,
  user_agent  text,
  source_ip   text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists claude_session_events_session_idx
  on public.claude_session_events (session_id, event_at);

create index if not exists claude_session_events_event_at_idx
  on public.claude_session_events (event_at desc);

create index if not exists claude_session_events_kind_idx
  on public.claude_session_events (kind, event_at desc);

-- materialised rollup: per-session start/end, duration from server clock.
create or replace view public.claude_sessions as
with starts as (
  select session_id, min(event_at) as started_at
  from public.claude_session_events
  where kind = 'start'
  group by session_id
),
ends as (
  select session_id, max(event_at) as ended_at
  from public.claude_session_events
  where kind in ('end', 'stop')
  group by session_id
),
meta as (
  select distinct on (session_id)
    session_id, project, cwd, model
  from public.claude_session_events
  where project is not null or cwd is not null or model is not null
  order by session_id, event_at desc
)
select
  s.session_id,
  s.started_at,
  e.ended_at,
  case
    when e.ended_at is not null
      then extract(epoch from (e.ended_at - s.started_at))::int
    else null
  end as duration_seconds,
  m.project,
  m.cwd,
  m.model
from starts s
left join ends e on e.session_id = s.session_id
left join meta m on m.session_id = s.session_id;
-- engineers.ge · TBC branch inventory subsystem (independent, /tbc).
-- Isolated from main engineers.ge auth + tables.
-- Access pattern: server API routes only (tbc_jwt cookie auth). RLS locked down; service role reads/writes.

-- ============================================
-- USERS (static admins + registered users)
-- ============================================
create table if not exists public.tbc_users (
  id             uuid primary key default gen_random_uuid(),
  username       text unique not null,
  password_hash  text not null,
  display_name   text,
  role           text not null default 'user' check (role in ('admin','user')),
  is_static      boolean not null default false,  -- admin_givi, admin_temo → cannot be deleted
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     text,                            -- username of creator
  last_login_at  timestamptz
);
create index if not exists tbc_users_username_idx on public.tbc_users(username);
create index if not exists tbc_users_active_idx on public.tbc_users(active);

-- ============================================
-- LOGIN EVENTS (who logged in, when, from where)
-- ============================================
create table if not exists public.tbc_login_events (
  id          bigserial primary key,
  username    text not null,
  user_id     uuid,
  ip          text,
  user_agent  text,
  success     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists tbc_login_events_created_idx on public.tbc_login_events(created_at desc);
create index if not exists tbc_login_events_username_idx on public.tbc_login_events(username);

-- ============================================
-- BRANCHES (master list, shared state)
-- ============================================
create table if not exists public.tbc_branches (
  id                  int primary key,
  alias               text,
  name                text not null,
  type                text,
  region              text,
  city                text,
  address             text,
  area_m2             numeric,
  monthly_fee         numeric,
  comment             text,
  inventory_items     jsonb not null default '[]'::jsonb,
  planned_count       int not null default 0,
  status              text not null default 'general',
  director            text,
  director_phone      text,
  dmt_manager         text,
  dmt_manager_phone   text,
  tbc_manager         text,
  tbc_manager_phone   text,
  planned_start       text,
  planned_end         text,
  annotation          text,
  act                 text,
  notes               text,
  devices             jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now(),
  updated_by          text
);
create index if not exists tbc_branches_updated_idx on public.tbc_branches(updated_at desc);
create index if not exists tbc_branches_status_idx on public.tbc_branches(status);
create index if not exists tbc_branches_region_idx on public.tbc_branches(region);

-- ============================================
-- EQUIPMENT TYPES (catalog, for dropdowns)
-- ============================================
create table if not exists public.tbc_equipment_types (
  id         bigserial primary key,
  category   text not null,
  subtype    text not null,
  unique(category, subtype)
);

-- ============================================
-- PER-USER BRANCH PERMISSIONS (phase 2 ready)
-- If a user has zero rows here AND role='user' → they see nothing until admin assigns.
-- Admins always see everything (no permission check).
-- Special row: branch_id = null means "all branches".
-- ============================================
create table if not exists public.tbc_branch_permissions (
  id          bigserial primary key,
  user_id     uuid not null references public.tbc_users(id) on delete cascade,
  branch_id   int references public.tbc_branches(id) on delete cascade,   -- null = all
  can_edit    boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  text
);
create unique index if not exists tbc_branch_perm_unique
  on public.tbc_branch_permissions(user_id, coalesce(branch_id, -1));
create index if not exists tbc_branch_perm_user_idx on public.tbc_branch_permissions(user_id);

-- ============================================
-- BRANCH CHAT / ANNOUNCEMENTS (phase 2)
-- "მონტაჟი ვერ მოხდა", "ამწე მიუდგომელია"
-- ============================================
create table if not exists public.tbc_branch_comments (
  id          bigserial primary key,
  branch_id   int not null references public.tbc_branches(id) on delete cascade,
  author      text not null,          -- username
  kind        text not null default 'note' check (kind in ('note','blocker','info','done')),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists tbc_comments_branch_idx on public.tbc_branch_comments(branch_id, created_at desc);

-- ============================================
-- BRANCH COST ESTIMATES (phase 3 ready)
-- per branch: many estimate rows with qty × price
-- ============================================
create table if not exists public.tbc_estimate_items (
  id          bigserial primary key,
  branch_id   int not null references public.tbc_branches(id) on delete cascade,
  sort_order  int not null default 0,
  name        text not null,
  item_type   text,                      -- device / labor / transport / crane / other
  unit        text,                      -- ც, მ, კგ, სთ
  qty         numeric not null default 0,
  price       numeric not null default 0,
  total       numeric generated always as (qty * price) stored,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create index if not exists tbc_estimate_branch_idx on public.tbc_estimate_items(branch_id, sort_order);

-- ============================================
-- RLS: lock all tables, access only via service role (server API)
-- ============================================
alter table public.tbc_users              enable row level security;
alter table public.tbc_login_events       enable row level security;
alter table public.tbc_branches           enable row level security;
alter table public.tbc_equipment_types    enable row level security;
alter table public.tbc_branch_permissions enable row level security;
alter table public.tbc_branch_comments    enable row level security;
alter table public.tbc_estimate_items     enable row level security;
