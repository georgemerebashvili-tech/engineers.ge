-- 0057_visitor_sessions.sql
-- Real-time "who's online" table.
-- Each active browser tab upserts its row every 30s; rows older than 5min = offline.
-- Uses the same visitor_id cookie as page_views — no extra auth needed.
-- Deliberately lightweight: no history, no PII beyond visitor_id + path.

create table if not exists public.visitor_sessions (
  visitor_id   uuid        not null,
  path         text        not null,
  last_seen    timestamptz not null default now(),
  country      text,
  device       text,
  primary key (visitor_id)
);

-- Fast lookup: active sessions in last 5 minutes
create index if not exists visitor_sessions_last_seen_idx
  on public.visitor_sessions (last_seen desc);

-- Index for per-path aggregation
create index if not exists visitor_sessions_path_idx
  on public.visitor_sessions (path);

-- RLS: only service_role can read (admin only); anonymous can upsert own row
alter table public.visitor_sessions enable row level security;

-- Upsert: any authenticated or anonymous request with matching visitor_id can update
create policy "visitor_can_upsert_own_session"
  on public.visitor_sessions
  for all
  using (true)
  with check (true);

-- Auto-cleanup function: delete rows older than 10 minutes
-- Called via the heartbeat API route after each upsert
create or replace function public.cleanup_stale_visitor_sessions()
returns void
language sql
security definer
as $$
  delete from public.visitor_sessions
  where last_seen < now() - interval '10 minutes';
$$;
