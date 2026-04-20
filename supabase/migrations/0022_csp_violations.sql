-- engineers.ge · CSP violation reports.
-- Browsers POST to /api/csp-report when a resource is blocked by Content-Security-Policy.
-- Admin uses these to debug "site broke after CSP tightening" or "third-party
-- script got blocked" situations, and to decide whether to loosen a directive
-- or fix the source.

create table if not exists public.csp_violations (
  id                bigserial primary key,
  document_uri      text,
  blocked_uri       text,
  violated_directive text,
  effective_directive text,
  original_policy   text,
  source_file       text,
  line_number       integer,
  column_number     integer,
  sample            text,
  disposition       text,               -- "enforce" | "report"
  user_agent        text,
  visitor_id        text,
  created_at        timestamptz not null default now()
);

create index if not exists csp_violations_created_idx on public.csp_violations (created_at desc);
create index if not exists csp_violations_blocked_idx on public.csp_violations (blocked_uri);
create index if not exists csp_violations_directive_idx on public.csp_violations (violated_directive);

alter table public.csp_violations enable row level security;
