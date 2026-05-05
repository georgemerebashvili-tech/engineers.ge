-- DMT offers: per-manual-lead commercial offers with audit trail.
-- Idempotent and additive only.

create table if not exists public.dmt_offers (
  id          text primary key,
  lead_id     text not null,
  status      text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'rejected', 'cancelled')),
  items       jsonb not null default '[]'::jsonb,
  subtotal    numeric(12,2) not null default 0,
  vat_rate    numeric(5,2),
  vat_amount  numeric(12,2),
  total       numeric(12,2) not null default 0,
  currency    text not null default 'GEL',
  delivery_terms text not null default '',
  payment_terms  text not null default '',
  notes       text not null default '',
  share_token text unique,
  share_token_expires_at timestamptz,
  sent_at     timestamptz,
  approved_at timestamptz,
  approved_by_client text,
  rejected_at timestamptz,
  rejection_reason text,
  created_at  timestamptz not null default now(),
  created_by  text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text not null
);

create index if not exists dmt_offers_lead_idx    on public.dmt_offers (lead_id);
create index if not exists dmt_offers_status_idx  on public.dmt_offers (status);
create index if not exists dmt_offers_share_idx   on public.dmt_offers (share_token) where share_token is not null;
create index if not exists dmt_offers_updated_idx on public.dmt_offers (updated_at desc);

create table if not exists public.dmt_offers_audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  by          text not null,
  action      text not null check (action in ('create', 'update', 'send', 'approve', 'reject', 'delete')),
  offer_id    text not null,
  lead_id     text,
  before_val  jsonb,
  after_val   jsonb,
  notes       text
);

create index if not exists dmt_offers_audit_offer_idx on public.dmt_offers_audit (offer_id);
create index if not exists dmt_offers_audit_at_idx    on public.dmt_offers_audit (at desc);

alter table public.dmt_offers       disable row level security;
alter table public.dmt_offers_audit disable row level security;
