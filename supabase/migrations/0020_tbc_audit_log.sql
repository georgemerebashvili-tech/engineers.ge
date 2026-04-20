-- engineers.ge · TBC audit log — every mutation (branch edits, device adds,
-- comments, estimates, user CRUD, password resets, login success/fail).
-- Includes full content in metadata jsonb so admins can see what was written.

create table if not exists public.tbc_audit_log (
  id           bigserial primary key,
  actor        text not null,               -- username (or 'anonymous' for failed logins)
  action       text not null,               -- e.g. 'branch.update', 'device.add', 'comment.post'
  target_type  text,                        -- 'branch','device','comment','estimate','user', null
  target_id    text,                        -- branch id, user id, comment id, etc.
  summary      text,                        -- short human-readable sentence (may be null)
  metadata     jsonb not null default '{}'::jsonb,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists tbc_audit_created_idx   on public.tbc_audit_log (created_at desc);
create index if not exists tbc_audit_actor_idx     on public.tbc_audit_log (actor);
create index if not exists tbc_audit_action_idx    on public.tbc_audit_log (action);
create index if not exists tbc_audit_target_idx    on public.tbc_audit_log (target_type, target_id);

alter table public.tbc_audit_log enable row level security;
-- service role only (accessed exclusively via supabaseAdmin() in server routes)
