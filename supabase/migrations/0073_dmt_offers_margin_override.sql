alter table public.dmt_offers
  add column if not exists margin_amount_override numeric(12,2);

comment on column public.dmt_offers.margin_amount_override is
  'Optional manual override for commercial margin (in GEL). When NULL, margin is computed from margin_percent. When set, this absolute value is used and margin_percent is recomputed for display only.';
