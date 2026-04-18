-- calc_events: tracks calculator opens and PDF generations
-- used by admin stats to show per-calc usage

create table if not exists public.calc_events (
  id          bigserial primary key,
  slug        text not null,
  action      text not null check (action in ('open', 'pdf')),
  visitor_id  uuid,
  country     text,
  ua_hash     text,
  created_at  timestamptz not null default now()
);

create index if not exists calc_events_slug_action_idx
  on public.calc_events (slug, action, created_at desc);

create index if not exists calc_events_created_idx
  on public.calc_events (created_at desc);
