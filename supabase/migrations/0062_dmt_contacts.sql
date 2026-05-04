create table if not exists public.dmt_contacts (
  id text primary key,
  name text not null default '',
  company text not null default '',
  position text not null default '',
  phone text not null default '',
  email text not null default '',
  source text not null default 'manual',
  notes text not null default '',
  tags text[] not null default '{}',
  converted_to_lead_id text references public.dmt_leads(id) on delete set null,
  converted_at timestamptz,
  converted_by text,
  created_at timestamptz not null default now(),
  created_by text not null,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create index if not exists dmt_contacts_company_idx on public.dmt_contacts (company);
create index if not exists dmt_contacts_phone_idx on public.dmt_contacts (phone);
create index if not exists dmt_contacts_email_idx on public.dmt_contacts (email);
create index if not exists dmt_contacts_converted_idx on public.dmt_contacts (converted_to_lead_id) where converted_to_lead_id is not null;
create index if not exists dmt_contacts_updated_idx on public.dmt_contacts (updated_at desc);

create table if not exists public.dmt_contacts_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  by text not null,
  action text not null check (action in ('create','update','delete','convert')),
  contact_id text not null,
  contact_label text not null default '',
  column_key text,
  column_label text,
  before_val text,
  after_val text
);

create index if not exists dmt_contacts_audit_contact_idx on public.dmt_contacts_audit (contact_id);
create index if not exists dmt_contacts_audit_at_idx on public.dmt_contacts_audit (at desc);

alter table public.dmt_leads
  add column if not exists from_contact_id text references public.dmt_contacts(id) on delete set null;

create index if not exists dmt_leads_from_contact_idx on public.dmt_leads (from_contact_id) where from_contact_id is not null;

alter table public.dmt_contacts disable row level security;
alter table public.dmt_contacts_audit disable row level security;
