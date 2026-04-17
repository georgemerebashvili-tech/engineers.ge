-- engineers.ge · first-party analytics
-- Privacy-friendly: no raw IPs, first-party cookie visitor_id, daily-salted UA hash.

create extension if not exists pgcrypto;

create table if not exists public.page_views (
  id               bigserial primary key,
  visitor_id       uuid        not null,
  path             text        not null,
  referrer         text,
  referrer_domain  text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  country          text,
  city             text,
  device           text,
  browser          text,
  os               text,
  ua_hash          text,
  bot              boolean     not null default false,
  entered_at       timestamptz not null default now(),
  left_at          timestamptz,
  duration_ms      integer
);

create index if not exists page_views_entered_at_idx
  on public.page_views (entered_at desc);
create index if not exists page_views_path_idx
  on public.page_views (path);
create index if not exists page_views_visitor_idx
  on public.page_views (visitor_id);
create index if not exists page_views_country_idx
  on public.page_views (country);
create index if not exists page_views_referrer_idx
  on public.page_views (referrer_domain);

-- Lock down: only service_role may read or write.
alter table public.page_views enable row level security;
