alter table public.dmt_users
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.dmt_users.settings is
  'Per-user DMT UI preferences, e.g. manualLeadsTabColor for /dmt/leads/manual.';
