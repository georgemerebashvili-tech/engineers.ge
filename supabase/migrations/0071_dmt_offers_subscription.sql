-- DMT offers: editable monthly subscription value for generated commercial offers.

alter table public.dmt_offers
  add column if not exists monthly_subscription numeric(10,2);
