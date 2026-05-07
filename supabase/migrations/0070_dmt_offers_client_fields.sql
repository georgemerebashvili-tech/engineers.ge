-- DMT offers: editable yellow-highlighted PDF fields.

alter table public.dmt_offers
  add column if not exists doc_number_override int,
  add column if not exists doc_date_override date,
  add column if not exists client_company text,
  add column if not exists client_tax_id text,
  add column if not exists client_contact text,
  add column if not exists client_phone text,
  add column if not exists client_address text;
