-- engineers.ge · 404 tracking.
-- Captured from app/not-found.tsx via navigator.sendBeacon. Used by admin to
-- spot broken inbound links, common typos, and traffic from crawlers.

create table if not exists public.not_found_events (
  id           bigserial primary key,
  pathname     text not null,
  referrer     text,
  user_agent   text,
  visitor_id   text,
  created_at   timestamptz not null default now()
);

create index if not exists not_found_events_created_idx on public.not_found_events (created_at desc);
create index if not exists not_found_events_pathname_idx on public.not_found_events (pathname);

alter table public.not_found_events enable row level security;
-- service role only.
