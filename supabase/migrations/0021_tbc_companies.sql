-- engineers.ge · TBC companies (clients, contractors, suppliers)

create table if not exists public.tbc_companies (
  id              bigserial primary key,
  name            text not null,
  type            text not null default 'contractor'
                    check (type in ('client','contractor','supplier','other')),
  contact_person  text,
  phone           text,
  email           text,
  address         text,
  tax_id          text,                      -- საიდენტ. ნომერი
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      text,
  updated_at      timestamptz not null default now(),
  updated_by      text
);

create index if not exists tbc_companies_type_idx on public.tbc_companies (type);
create index if not exists tbc_companies_active_idx on public.tbc_companies (active);
create index if not exists tbc_companies_name_idx on public.tbc_companies (lower(name));

alter table public.tbc_companies enable row level security;
