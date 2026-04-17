-- engineers.ge · hero ad slots
-- Pricing + occupancy for homepage hero placements. Admin edits these rows and
-- public homepage reads them with server-side fallback defaults.

create table if not exists public.hero_ad_slots (
  slot_key        text primary key check (
    slot_key in ('site', 'cta', 'slogan', 'business', 'childhood', 'b1', 'b2', 'b3')
  ),
  display_name    text not null,
  label           text not null default '',
  sublabel        text not null default '',
  image_url       text not null default '',
  client_name     text not null default '',
  price_gel       numeric(10,2) not null default 0,
  occupied_until  date,
  is_ad_slot      boolean not null default true,
  format_hint     text not null default '',
  size_hint       text not null default '',
  updated_at      timestamptz not null default now()
);

insert into public.hero_ad_slots (
  slot_key, display_name, label, sublabel, image_url, client_name,
  price_gel, occupied_until, is_ad_slot, format_hint, size_hint
)
values
  ('site', 'ობიექტზე', 'ობიექტზე', 'ინჟინერია ველზე',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=70',
    '', 0, null, false, 'JPG / PNG / WEBP', '544 × 280 px'),
  ('cta', 'კალკულატორები', 'კალკულატორები', '7 ინსტრუმენტი · უფასო',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=70',
    'Engineers.ge', 1250, '2026-05-30', true, 'JPG / PNG / WEBP', '532 × 712 px'),
  ('slogan', 'ინჟინერია', 'ინჟინერია.', 'ქართულად · ზუსტად',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=70',
    'Partner A', 690, '2026-05-12', true, 'JPG / PNG / WEBP', '488 × 200 px'),
  ('business', 'ბიზნესი', 'ბიზნესი', 'საინჟინრო სამუშაოზე',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&q=70',
    'Partner B', 620, '2026-06-08', true, 'JPG / PNG / WEBP', '488 × 232 px'),
  ('childhood', 'ბავშვობა', 'ბავშვობა', 'საწყისი',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=70',
    'Partner C', 580, '2026-06-20', true, 'JPG / PNG / WEBP', '488 × 280 px'),
  ('b1', 'HVAC', 'HVAC', 'გათბობა · გაგრილება',
    'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=70',
    'Partner D', 540, '2026-05-25', true, 'JPG / PNG / WEBP', '340 × 432 px'),
  ('b2', 'თბოდანაკარგი', 'თბოდანაკარგი', 'EN 12831',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=900&q=70',
    'Partner E', 960, '2026-07-01', true, 'JPG / PNG / WEBP', '296 × 712 px'),
  ('b3', 'იზოლაცია', 'იზოლაცია', 'ISO 6946',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=70',
    'Partner F', 510, '2026-05-18', true, 'JPG / PNG / WEBP', '340 × 280 px')
on conflict (slot_key) do nothing;

alter table public.hero_ad_slots enable row level security;
