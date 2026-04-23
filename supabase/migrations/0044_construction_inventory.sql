-- engineers.ge · KAYA Construction inventory subsystem (independent, /construction).
-- Isolated from main engineers.ge auth + TBC tables.
-- Access pattern: server API routes only (construction_jwt cookie auth). RLS locked down.

-- ============================================
-- USERS
-- ============================================
create table if not exists public.construction_users (
  id             uuid primary key default gen_random_uuid(),
  username       text unique not null,
  password_hash  text not null,
  display_name   text,
  email          text,
  role           text not null default 'user' check (role in ('admin','user')),
  is_static      boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     text,
  last_login_at  timestamptz
);
create index if not exists construction_users_username_idx on public.construction_users(username);
create index if not exists construction_users_active_idx on public.construction_users(active);

-- ============================================
-- LOGIN EVENTS
-- ============================================
create table if not exists public.construction_login_events (
  id          bigserial primary key,
  username    text not null,
  user_id     uuid,
  ip          text,
  user_agent  text,
  success     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists construction_login_events_created_idx on public.construction_login_events(created_at desc);
create index if not exists construction_login_events_username_idx on public.construction_login_events(username);

-- ============================================
-- SITES (სამშენებლო ობიექტები)
-- ============================================
create table if not exists public.construction_sites (
  id                  int primary key,
  alias               text,
  name                text not null,
  type                text,
  region              text,
  city                text,
  address             text,
  area_m2             numeric,
  budget              numeric,
  comment             text,
  inventory_items     jsonb not null default '[]'::jsonb,
  planned_count       int not null default 0,
  status              text not null default 'general',
  director            text,
  director_phone      text,
  dmt_manager         text,
  dmt_manager_phone   text,
  kaya_manager        text,
  kaya_manager_phone  text,
  planned_start       text,
  planned_end         text,
  annotation          text,
  act                 text,
  notes               text,
  devices             jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now(),
  updated_by          text
);
create index if not exists construction_sites_updated_idx on public.construction_sites(updated_at desc);
create index if not exists construction_sites_status_idx on public.construction_sites(status);
create index if not exists construction_sites_region_idx on public.construction_sites(region);

-- ============================================
-- EQUIPMENT TYPES CATALOG
-- ============================================
create table if not exists public.construction_equipment_types (
  id         bigserial primary key,
  category   text not null,
  subtype    text not null,
  unique(category, subtype)
);

-- ============================================
-- PER-USER SITE PERMISSIONS
-- ============================================
create table if not exists public.construction_site_permissions (
  id          bigserial primary key,
  user_id     uuid not null references public.construction_users(id) on delete cascade,
  site_id     int references public.construction_sites(id) on delete cascade,
  can_edit    boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  text
);
create unique index if not exists construction_site_perm_unique
  on public.construction_site_permissions(user_id, coalesce(site_id, -1));
create index if not exists construction_site_perm_user_idx on public.construction_site_permissions(user_id);

-- ============================================
-- SITE COMMENTS
-- ============================================
create table if not exists public.construction_site_comments (
  id          bigserial primary key,
  site_id     int not null references public.construction_sites(id) on delete cascade,
  author      text not null,
  kind        text not null default 'note' check (kind in ('note','blocker','info','done')),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists construction_comments_site_idx on public.construction_site_comments(site_id, created_at desc);

-- ============================================
-- ESTIMATE ITEMS
-- ============================================
create table if not exists public.construction_estimate_items (
  id          bigserial primary key,
  site_id     int not null references public.construction_sites(id) on delete cascade,
  sort_order  int not null default 0,
  name        text not null,
  item_type   text,
  unit        text,
  qty         numeric not null default 0,
  price       numeric not null default 0,
  total       numeric generated always as (qty * price) stored,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create index if not exists construction_estimate_site_idx on public.construction_estimate_items(site_id, sort_order);

-- ============================================
-- AUDIT LOG
-- ============================================
create table if not exists public.construction_audit_log (
  id          bigserial primary key,
  actor       text not null,
  action      text not null,
  target_type text,
  target_id   text,
  summary     text,
  metadata    jsonb not null default '{}'::jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists construction_audit_created_idx on public.construction_audit_log(created_at desc);
create index if not exists construction_audit_actor_idx on public.construction_audit_log(actor);
create index if not exists construction_audit_action_idx on public.construction_audit_log(action);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================
create table if not exists public.construction_password_reset_tokens (
  token        text primary key,
  user_id      uuid not null references public.construction_users(id) on delete cascade,
  email        text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  ip           text,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists construction_reset_user_idx on public.construction_password_reset_tokens(user_id);
create index if not exists construction_reset_expires_idx on public.construction_password_reset_tokens(expires_at);

-- ============================================
-- RLS: service role only
-- ============================================
alter table public.construction_users                  enable row level security;
alter table public.construction_login_events           enable row level security;
alter table public.construction_sites                  enable row level security;
alter table public.construction_equipment_types        enable row level security;
alter table public.construction_site_permissions       enable row level security;
alter table public.construction_site_comments          enable row level security;
alter table public.construction_estimate_items         enable row level security;
alter table public.construction_audit_log              enable row level security;
alter table public.construction_password_reset_tokens  enable row level security;
