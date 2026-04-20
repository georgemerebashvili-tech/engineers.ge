-- engineers.ge · Admin audit log.
-- Every admin mutation (features, flags, settings, users, bug reports, etc.)
-- inserts one row here for forensic history.

create table if not exists public.admin_audit_log (
  id           bigserial primary key,
  actor        text not null,              -- admin username from jwt
  action       text not null,              -- short verb: 'feature.set', 'bug.update', 'user.delete'
  target_type  text,                       -- table/entity kind
  target_id    text,                       -- row id / key
  metadata     jsonb not null default '{}'::jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_actor_idx on public.admin_audit_log (actor);
create index if not exists admin_audit_action_idx on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;
-- service role only. admin panel reads via supabaseAdmin().
