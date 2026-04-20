-- engineers.ge · Core Web Vitals + Next.js custom metrics.
-- Captured client-side via next/web-vitals useReportWebVitals hook, POST'd to
-- /api/web-vitals as navigator.sendBeacon. Aggregated in admin at p75/p95.
--
-- Metric names: LCP, CLS, INP, FCP, TTFB (Core Web Vitals) + Next-FID + custom.

create table if not exists public.web_vitals (
  id           bigserial primary key,
  metric       text not null,                -- 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB' | ...
  value        double precision not null,    -- ms (or unitless for CLS)
  rating       text,                         -- 'good' | 'needs-improvement' | 'poor'
  pathname     text not null,
  navigation_type text,                      -- 'navigate' | 'reload' | 'back-forward' | 'prerender'
  user_agent   text,
  viewport     text,
  visitor_id   text,
  created_at   timestamptz not null default now()
);

create index if not exists web_vitals_created_idx on public.web_vitals (created_at desc);
create index if not exists web_vitals_metric_idx on public.web_vitals (metric);
create index if not exists web_vitals_pathname_idx on public.web_vitals (pathname);

alter table public.web_vitals enable row level security;
