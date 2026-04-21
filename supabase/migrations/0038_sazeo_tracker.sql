-- 0036_sazeo_tracker.sql
-- Sazeo Claude Code activity tracker — append-only, hash-chained events from
-- contracted developers. Each developer holds a bearer token (hash stored in
-- sazeo_developers.token_hash) and posts batched events to /sazeo/api/events.
-- The ingest route serializes per-developer and computes hash = sha256(prev || canonical)
-- in Node, so the chain is verifiable without DB-side crypto.

create table if not exists public.sazeo_developers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  token_hash  text not null unique,
  disabled_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.sazeo_events (
  id              bigserial primary key,
  developer_id    uuid not null references public.sazeo_developers(id),
  session_id      text,
  event_type      text not null,
  ts_server       timestamptz not null default now(),
  ts_client       timestamptz,
  repo_id         text,
  repo_root       text,
  cwd             text,
  host            text,
  os              text,
  username        text,
  claude_version  text,
  data            jsonb not null default '{}'::jsonb,
  prev_hash       text,
  hash            text not null
);

create index if not exists sazeo_events_dev_ts_idx
  on public.sazeo_events (developer_id, ts_server desc);
create index if not exists sazeo_events_session_idx
  on public.sazeo_events (developer_id, session_id, id);
create index if not exists sazeo_events_type_idx
  on public.sazeo_events (event_type, ts_server desc);
create index if not exists sazeo_events_repo_idx
  on public.sazeo_events (repo_id, ts_server desc);
create index if not exists sazeo_events_data_gin
  on public.sazeo_events using gin (data);

-- Append-only guard. UPDATE/DELETE/TRUNCATE all raise; this is enforced even
-- against service-role writes so accidental maintenance cannot rewrite history.
-- Drop the triggers explicitly in a migration if intentional rebuild is needed.
create or replace function public.sazeo_events_reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'sazeo_events is append-only (op=%)', tg_op;
end;
$$;

drop trigger if exists sazeo_events_no_mutation on public.sazeo_events;
create trigger sazeo_events_no_mutation
  before update or delete on public.sazeo_events
  for each row execute function public.sazeo_events_reject_mutation();

drop trigger if exists sazeo_events_no_truncate on public.sazeo_events;
create trigger sazeo_events_no_truncate
  before truncate on public.sazeo_events
  for each statement execute function public.sazeo_events_reject_mutation();

-- Integrity view: flags rows whose prev_hash doesn't match the prior row's hash
-- within the developer's chain. First event per developer must have prev_hash NULL.
create or replace view public.sazeo_events_integrity as
  select
    id,
    developer_id,
    session_id,
    ts_server,
    prev_hash,
    lag(hash) over (partition by developer_id order by id) as expected_prev,
    (prev_hash is not distinct from lag(hash) over (partition by developer_id order by id)) as ok
  from public.sazeo_events;

alter table public.sazeo_developers disable row level security;
alter table public.sazeo_events     disable row level security;

comment on table public.sazeo_events is
  'Append-only Claude Code activity log for contracted developers. Chain: hash = sha256(prev_hash || canonical_event_json). See sazeo_events_integrity view.';
comment on table public.sazeo_developers is
  'Contracted developer registry. token_hash stores sha256 of the bearer token; raw token lives only with the developer.';
