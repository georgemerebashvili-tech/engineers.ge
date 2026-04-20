-- engineers.ge · Bug reports from the test-mode banner.
-- Public endpoint writes here (rate-limited); admin panel reads + updates status.

create table if not exists public.bug_reports (
  id           uuid primary key default gen_random_uuid(),
  feature_key  text,                 -- matches lib/feature-flags.ts registry (nullable — route may have no flag)
  pathname     text not null,
  message      text not null,
  email        text,
  user_agent   text,
  viewport     text,                 -- "1440x900" etc
  status       text not null default 'open' check (status in ('open','in_progress','resolved','archived')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bug_reports_created_idx on public.bug_reports (created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports (status);
create index if not exists bug_reports_feature_idx on public.bug_reports (feature_key);

alter table public.bug_reports enable row level security;
-- no policies → service role only (API writes/reads with admin client).
