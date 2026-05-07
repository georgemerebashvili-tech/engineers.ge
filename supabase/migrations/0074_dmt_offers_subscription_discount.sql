alter table public.dmt_offers
  add column if not exists subscription_regular_price numeric(12,2);

comment on column public.dmt_offers.subscription_regular_price is
  'Optional original (pre-discount) monthly subscription price in GEL. When set AND > monthly_subscription, PDF renders "nacvlad N larisa" clause. NULL = no subscription discount.';
