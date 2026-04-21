-- engineers.ge · hero_ad_slots marketing meta
-- Adds per-slot contact phone + promo badge for ads/admin workflows.

alter table public.hero_ad_slots
  add column if not exists contact_phone text not null default '',
  add column if not exists promo_badge text not null default '';
