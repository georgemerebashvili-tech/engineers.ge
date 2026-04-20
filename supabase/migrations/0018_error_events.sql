-- engineers.ge · Client-side error events.
-- Captured automatically by app/error.tsx + global-error.tsx via navigator.sendBeacon.
-- Admin panel reads + filters by pathname / error message / resolved state.

create table if not exists public.error_events (
  id           bigserial primary key,
  message      text not null,
  stack        text,
  digest       text,                       -- Next.js error.digest for dedup
  pathname     text not null,
  kind         text not null default 'route' check (kind in ('route','global','api')),
  user_agent   text,
  viewport     text,
  referrer     text,
  visitor_id   text,                       -- eng_vid cookie when present
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists error_events_created_idx on public.error_events (created_at desc);
create index if not exists error_events_digest_idx on public.error_events (digest);
create index if not exists error_events_resolved_idx on public.error_events (resolved);
create index if not exists error_events_pathname_idx on public.error_events (pathname);

alter table public.error_events enable row level security;
-- service role only. admin API uses supabaseAdmin().
