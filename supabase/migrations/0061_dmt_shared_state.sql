-- DMT shared state: move collaborative DMT pages from browser localStorage to Postgres.

create table if not exists public.dmt_leads (
  id          text primary key,
  name        text not null default '',
  company     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  source      text not null default 'website',
  stage       text not null default 'new',
  owner       text not null default '',
  value       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  created_by  text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text not null
);

create index if not exists dmt_leads_stage_idx on public.dmt_leads (stage);
create index if not exists dmt_leads_updated_idx on public.dmt_leads (updated_at desc);

create table if not exists public.dmt_leads_audit (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  by            text not null,
  action        text not null check (action in ('create','update','delete')),
  lead_id       text not null,
  lead_label    text not null default '',
  column_key    text,
  column_label  text,
  before_val    text,
  after_val     text
);

create index if not exists dmt_leads_audit_lead_idx on public.dmt_leads_audit (lead_id);
create index if not exists dmt_leads_audit_at_idx on public.dmt_leads_audit (at desc);

create table if not exists public.dmt_manual_leads (
  id          text primary key,
  company     text not null default '',
  contact     text not null default '',
  phone       text not null default '',
  contract    numeric(12,2),
  status      text not null default 'ახალი',
  role        text not null default '',
  owner       text not null default '',
  period      text not null default '',
  edited_by   text not null default '',
  edited_at   timestamptz not null default now(),
  created_by  text not null
);

create index if not exists dmt_manual_leads_status_idx on public.dmt_manual_leads (status);
create index if not exists dmt_manual_leads_edited_idx on public.dmt_manual_leads (edited_at desc);

create table if not exists public.dmt_manual_extra_cols (
  id          text primary key,
  label       text not null,
  kind        text not null check (kind in ('text','number','select')),
  width       int not null default 140,
  var_set_id  text,
  options     jsonb not null default '[]'::jsonb,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.dmt_manual_extra_vals (
  lead_id     text not null references public.dmt_manual_leads(id) on delete cascade,
  col_id      text not null references public.dmt_manual_extra_cols(id) on delete cascade,
  value       text,
  primary key (lead_id, col_id)
);

create table if not exists public.dmt_variable_sets (
  id          text primary key,
  name        text not null,
  type        text not null default 'single' check (type in ('single','multi')),
  options     jsonb not null default '[]'::jsonb,
  position    int not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.dmt_page_scopes (
  id          text primary key,
  label       text not null,
  icon        text,
  route       text,
  tables      jsonb not null default '[]'::jsonb,
  position    int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.dmt_leads disable row level security;
alter table public.dmt_leads_audit disable row level security;
alter table public.dmt_manual_leads disable row level security;
alter table public.dmt_manual_extra_cols disable row level security;
alter table public.dmt_manual_extra_vals disable row level security;
alter table public.dmt_variable_sets disable row level security;
alter table public.dmt_page_scopes disable row level security;
