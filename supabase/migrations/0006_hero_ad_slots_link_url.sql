-- engineers.ge · add link_url to hero_ad_slots
-- Click-through destination URL for each ad tile.

alter table public.hero_ad_slots
  add column if not exists link_url text not null default '';
