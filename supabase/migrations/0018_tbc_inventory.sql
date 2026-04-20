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
