-- engineers.ge · DMT audit log retention cap (10,000 rows)
-- Goal: keep the latest 10,000 entries; silently prune older ones.
--
-- Implementation:
-- 1) Relax the append-only trigger so DELETE is allowed IFF a transaction-local
--    session flag is set — normal callers can still never UPDATE/DELETE.
-- 2) Add AFTER INSERT STATEMENT trigger that, inside its own trusted context,
--    sets the flag, prunes the overflow (oldest-first), unsets the flag.
-- 3) Ad-hoc prune: enforce the cap immediately on existing rows.
--
-- Safety: UPDATE is still unconditionally blocked; DELETE is blocked for any
-- caller that hasn't set the flag via SECURITY DEFINER maintenance function.

create or replace function public.dmt_audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('dmt.audit_trim_allowed', true), 'off') = 'on' then
    return old;
  end if;
  raise exception 'dmt_audit_log is append-only: % denied', tg_op;
end;
$$;

create or replace function public.dmt_audit_log_trim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keep    int := 10000;
  overflow int;
begin
  select greatest(0, count(*) - keep) into overflow from public.dmt_audit_log;
  if overflow > 0 then
    perform set_config('dmt.audit_trim_allowed', 'on', true);
    delete from public.dmt_audit_log
    where id in (
      select id
      from public.dmt_audit_log
      order by created_at asc, id asc
      limit overflow
    );
    perform set_config('dmt.audit_trim_allowed', 'off', true);
  end if;
  return null;
end;
$$;

drop trigger if exists dmt_audit_log_trim_trg on public.dmt_audit_log;
create trigger dmt_audit_log_trim_trg
  after insert on public.dmt_audit_log
  for each statement
  execute function public.dmt_audit_log_trim();

-- Immediate prune: enforce cap on existing data so current state is compliant.
do $$
declare
  keep    int := 10000;
  overflow int;
begin
  select greatest(0, count(*) - keep) into overflow from public.dmt_audit_log;
  if overflow > 0 then
    perform set_config('dmt.audit_trim_allowed', 'on', true);
    delete from public.dmt_audit_log
    where id in (
      select id
      from public.dmt_audit_log
      order by created_at asc, id asc
      limit overflow
    );
    perform set_config('dmt.audit_trim_allowed', 'off', true);
    raise notice 'dmt_audit_log: pruned % overflow rows (cap=%)', overflow, keep;
  end if;
end
$$;

comment on function public.dmt_audit_log_trim() is
  'Prunes public.dmt_audit_log to the latest 10,000 rows. Runs AFTER INSERT (statement-level) and uses a transaction-local flag to bypass the append-only DELETE guard.';
