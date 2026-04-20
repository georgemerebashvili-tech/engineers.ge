-- engineers.ge · Admin-editable redirects.
-- Consulted by proxy.ts on every request with a 60s in-memory cache.
-- Pattern: exact-match `source` → `destination`. Wildcards not supported at this MVP.

create table if not exists public.redirects (
  id            bigserial primary key,
  source        text not null unique,                 -- e.g. '/old-path'
  destination   text not null,                        -- e.g. '/new-path' or 'https://external'
  status_code   integer not null default 308 check (status_code in (301, 302, 307, 308)),
  note          text,
  hit_count     bigint not null default 0,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    text,
  updated_at    timestamptz not null default now()
);

create index if not exists redirects_source_idx on public.redirects (source) where enabled = true;
create index if not exists redirects_updated_idx on public.redirects (updated_at desc);

alter table public.redirects enable row level security;
-- service role only.
