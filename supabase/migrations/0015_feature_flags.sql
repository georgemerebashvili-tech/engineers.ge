-- engineers.ge · Feature flags
-- Per-feature visibility state. Admin toggles between active / test / hidden.
-- Key is the feature registry key (see lib/feature-flags.ts).

create table if not exists public.feature_flags (
  key         text primary key,
  status      text not null default 'active' check (status in ('active','test','hidden')),
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.feature_flags enable row level security;

-- no RLS policies = service role only (admin API).
