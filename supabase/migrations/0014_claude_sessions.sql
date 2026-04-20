-- claude_session_events: append-only log of Claude Code hook events
-- server-side `event_at` is source of truth; `client_at` comes from hook payload
-- and is stored for cross-reference but never trusted for aggregates.

create table if not exists public.claude_session_events (
  id          bigserial primary key,
  session_id  text not null,
  kind        text not null check (kind in ('start', 'end', 'stop')),
  event_at    timestamptz not null default now(),
  client_at   timestamptz,
  project     text,
  cwd         text,
  model       text,
  user_agent  text,
  source_ip   text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists claude_session_events_session_idx
  on public.claude_session_events (session_id, event_at);

create index if not exists claude_session_events_event_at_idx
  on public.claude_session_events (event_at desc);

create index if not exists claude_session_events_kind_idx
  on public.claude_session_events (kind, event_at desc);

-- materialised rollup: per-session start/end, duration from server clock.
create or replace view public.claude_sessions as
with starts as (
  select session_id, min(event_at) as started_at
  from public.claude_session_events
  where kind = 'start'
  group by session_id
),
ends as (
  select session_id, max(event_at) as ended_at
  from public.claude_session_events
  where kind in ('end', 'stop')
  group by session_id
),
meta as (
  select distinct on (session_id)
    session_id, project, cwd, model
  from public.claude_session_events
  where project is not null or cwd is not null or model is not null
  order by session_id, event_at desc
)
select
  s.session_id,
  s.started_at,
  e.ended_at,
  case
    when e.ended_at is not null
      then extract(epoch from (e.ended_at - s.started_at))::int
    else null
  end as duration_seconds,
  m.project,
  m.cwd,
  m.model
from starts s
left join ends e on e.session_id = s.session_id
left join meta m on m.session_id = s.session_id;
