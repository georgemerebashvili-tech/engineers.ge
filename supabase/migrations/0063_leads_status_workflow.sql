alter table public.dmt_leads
  add column if not exists labels text[] not null default '{}',
  add column if not exists offer_status text not null default 'offer_in_progress'
    check (offer_status in ('offer_in_progress', 'offer_accepted', 'offer_rejected')),
  add column if not exists inventory_checked boolean not null default false,
  add column if not exists inventory_checked_at timestamptz,
  add column if not exists inventory_checked_by text,
  add column if not exists invoice_id text,
  add column if not exists invoice_issued_at timestamptz,
  add column if not exists offer_decided_at timestamptz,
  add column if not exists offer_decided_by text;

update public.dmt_leads
   set offer_status = case
     when stage = 'won' then 'offer_accepted'
     when stage = 'lost' then 'offer_rejected'
     else 'offer_in_progress'
   end,
       labels = case
     when stage = 'new' then '{"ახალი"}'
     when stage = 'qualified' then '{"დაინტერესებული"}'
     when stage = 'proposal' then '{"მიმდინარე"}'
     else labels
   end
 where offer_status = 'offer_in_progress'
   and labels = '{}';

create index if not exists dmt_leads_offer_status_idx on public.dmt_leads (offer_status);
create index if not exists dmt_leads_labels_gin_idx on public.dmt_leads using gin (labels);

create table if not exists public.dmt_lead_label_suggestions (
  label text primary key,
  use_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dmt_lead_label_suggestions disable row level security;

insert into public.dmt_lead_label_suggestions (label, use_count) values
  ('ახალი', 0),
  ('დაინტერესებული', 0),
  ('მიმდინარე', 0),
  ('მოლოდინში', 0),
  ('ცხელი', 0),
  ('follow-up', 0)
on conflict (label) do nothing;
