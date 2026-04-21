-- 0039_sazeo_commit_audits.sql
-- Cross-validation for the sazeo tracker: every GitHub push to a DMT repo
-- should correlate with a Claude session from that developer inside a time
-- window around the commit. Commits with no matching session are flagged
-- here so admins can see gaps the hook-based tracker missed (dev disabled
-- hooks, worked outside a marked repo, etc).
--
-- Ingested by POST /sazeo/api/github-webhook, verified via HMAC-SHA256 using
-- env SAZEO_GITHUB_WEBHOOK_SECRET. One row per unique (repo_full, commit_sha).

create table if not exists public.sazeo_commit_audits (
  id                bigserial primary key,
  commit_sha        text not null,
  repo_full         text not null,
  branch            text,
  author_email      text,
  author_name       text,
  author_login      text,
  committed_at      timestamptz not null,
  pushed_at         timestamptz not null default now(),
  developer_id      uuid references public.sazeo_developers(id) on delete set null,
  session_matched   boolean not null default false,
  matched_session_id text,
  matched_event_id  bigint,
  match_window_min  int,
  alert             text,
  raw               jsonb,
  unique (repo_full, commit_sha)
);

create index if not exists sazeo_commit_audits_received_idx
  on public.sazeo_commit_audits (pushed_at desc);
create index if not exists sazeo_commit_audits_dev_idx
  on public.sazeo_commit_audits (developer_id, pushed_at desc);
create index if not exists sazeo_commit_audits_unmatched_idx
  on public.sazeo_commit_audits (pushed_at desc)
  where session_matched = false;

alter table public.sazeo_commit_audits disable row level security;

comment on table public.sazeo_commit_audits is
  'GitHub push events for DMT repos, each correlated with a Claude session from the committing developer. Unmatched rows surface as alerts on /sazeo.';
