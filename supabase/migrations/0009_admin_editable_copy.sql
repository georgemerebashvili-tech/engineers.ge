-- engineers.ge · admin-editable copy
-- Adds visibility toggles and editable text fields for share bar,
-- donation modal, and referral/ad widget. Admin panel writes; public APIs read.

alter table public.share_settings
  add column if not exists visible       boolean not null default true,
  add column if not exists intro_text    text    not null default 'აცნობე ყველას 👉',
  add column if not exists facebook_url  text    not null default '',
  add column if not exists x_url         text    not null default '',
  add column if not exists linkedin_url  text    not null default '',
  add column if not exists telegram_url  text    not null default '',
  add column if not exists whatsapp_url  text    not null default '';

alter table public.donation_settings
  add column if not exists heading_text     text not null default 'მხარდაჭერა',
  add column if not exists description_text text not null default 'engineers.ge უფასოა ყველასთვის. ყოველი ლარი გვეხმარება ახალი ინსტრუმენტების და ქართული საინჟინრო კონტენტის აშენებაში.',
  add column if not exists ad_visible       boolean not null default true,
  add column if not exists ad_text_long     text not null default 'იშოვე 3000 ლარამდე',
  add column if not exists ad_text_short    text not null default '3000 ₾';
