-- engineers.ge · DMT audit log (append-only)
-- Every write in /dmt/* goes here. Trigger-enforced: no UPDATE, no DELETE.
-- Goal: if someone tries to wipe history or backfill false records — DB refuses.

create table if not exists public.dmt_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.dmt_users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists dmt_audit_log_created_idx on public.dmt_audit_log (created_at desc);
create index if not exists dmt_audit_log_actor_idx on public.dmt_audit_log (actor_id, created_at desc);
create index if not exists dmt_audit_log_entity_idx on public.dmt_audit_log (entity_type, entity_id, created_at desc);
create index if not exists dmt_audit_log_action_idx on public.dmt_audit_log (action);

-- Append-only enforcement: block UPDATE and DELETE even for superuser/service role.
create or replace function public.dmt_audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'dmt_audit_log is append-only: % denied', tg_op;
end;
$$;

drop trigger if exists dmt_audit_log_no_update on public.dmt_audit_log;
create trigger dmt_audit_log_no_update
  before update on public.dmt_audit_log
  for each row execute function public.dmt_audit_log_immutable();

drop trigger if exists dmt_audit_log_no_delete on public.dmt_audit_log;
create trigger dmt_audit_log_no_delete
  before delete on public.dmt_audit_log
  for each row execute function public.dmt_audit_log_immutable();

alter table public.dmt_audit_log disable row level security;

comment on table public.dmt_audit_log is
  'DMT portal audit trail. Append-only (UPDATE/DELETE rejected by trigger). Every mutation in /dmt/* writes one row here.';
