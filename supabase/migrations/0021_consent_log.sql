-- engineers.ge · Cookie consent audit trail.
-- One row per decide() call from the banner. Anonymized: no user_id, just
-- visitor_id cookie + choices. Used by admin to:
--   - see acceptance rate (analytics ON vs OFF)
--   - verify GDPR compliance (proof that user made an explicit choice)
--   - detect banner bugs (sudden spike in "essential-only" decisions)

create table if not exists public.consent_log (
  id            bigserial primary key,
  visitor_id    text,
  analytics     boolean not null,
  marketing     boolean not null,
  action        text not null default 'decide' check (action in ('decide','reopen')),
  pathname      text,
  user_agent    text,
  ip_hash       text,                               -- sha-256 of IP, not raw IP (privacy)
  created_at    timestamptz not null default now()
);

create index if not exists consent_log_created_idx on public.consent_log (created_at desc);
create index if not exists consent_log_visitor_idx on public.consent_log (visitor_id);

alter table public.consent_log enable row level security;
