alter table public.dmt_offers
  add column if not exists discount_percent numeric(5,2);

alter table public.dmt_offers
  drop constraint if exists dmt_offers_discount_percent_range;

alter table public.dmt_offers
  add constraint dmt_offers_discount_percent_range
  check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));

comment on column public.dmt_offers.discount_percent is
  'Optional sale discount applied to the grand total after margin. NULL = no discount.';
