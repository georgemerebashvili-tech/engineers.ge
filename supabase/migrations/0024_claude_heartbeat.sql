-- 0024_claude_heartbeat.sql
-- Allow `heartbeat` as a valid `kind` on claude_session_events.
-- Heartbeats are emitted every ~60 seconds by a background launch agent
-- while Claude Code is running, giving a higher-resolution picture of
-- actual usage than start/end brackets alone.

alter table public.claude_session_events
  drop constraint if exists claude_session_events_kind_check;

alter table public.claude_session_events
  add constraint claude_session_events_kind_check
  check (kind in ('start', 'end', 'stop', 'heartbeat'));

-- Aggregate view: hours per day per session — now factors heartbeats too.
-- A session is "active" between its first event and its last heartbeat
-- (or end/stop, whichever is later). 2-minute slack absorbs missed pings.
create or replace view public.claude_session_activity as
  select
    session_id,
    min(event_at) as started_at,
    max(event_at) as last_seen_at,
    count(*) filter (where kind = 'heartbeat') as heartbeats,
    count(*) filter (where kind = 'start') as starts,
    count(*) filter (where kind in ('end','stop')) as ends,
    extract(epoch from (max(event_at) - min(event_at))) / 60.0 as span_minutes,
    any_value(project) as project,
    any_value(cwd) as cwd,
    any_value(model) as model
  from public.claude_session_events
  group by session_id;
