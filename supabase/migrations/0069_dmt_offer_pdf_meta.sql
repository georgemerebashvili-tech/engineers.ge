-- DMT offer PDF metadata and storage bucket.
-- Idempotent and additive for Task 038.

alter table public.dmt_offers
  add column if not exists doc_number int,
  add column if not exists doc_date date not null default current_date,
  add column if not exists labor_per_unit numeric(10,2),
  add column if not exists labor_total numeric(12,2),
  add column if not exists margin_percent numeric(5,2) default 15,
  add column if not exists margin_amount numeric(12,2),
  add column if not exists include_money_back_guarantee boolean not null default true,
  add column if not exists pdf_url text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_generated_by text,
  add column if not exists pdf_doc_size_bytes int;

create unique index if not exists dmt_offers_doc_number_idx
  on public.dmt_offers (doc_number) where doc_number is not null;

create sequence if not exists public.dmt_offer_doc_seq start with 219;

create or replace function public.dmt_next_offer_doc_number()
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return nextval('public.dmt_offer_doc_seq')::int;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'dmt_offers_audit'
      and constraint_name = 'dmt_offers_audit_action_check'
  ) then
    alter table public.dmt_offers_audit
      drop constraint dmt_offers_audit_action_check;
  end if;

  alter table public.dmt_offers_audit
    add constraint dmt_offers_audit_action_check
    check (action in ('create', 'update', 'send', 'approve', 'reject', 'delete', 'generate_pdf'));
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dmt-offers-pdfs',
  'dmt-offers-pdfs',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
