-- engineers.ge · DMT Facebook Lead Ads storage
-- Populated by /api/dmt/fb-webhook via Meta Lead Ads webhook subscription.
-- `leadgen_id` is unique per lead across the Meta platform.

create table if not exists public.dmt_fb_leads (
  id uuid primary key default gen_random_uuid(),
  leadgen_id text not null unique,
  page_id text not null,
  ad_id text,
  adset_id text,
  campaign_id text,
  form_id text,
  form_name text,
  created_time timestamptz not null,
  field_data jsonb not null default '[]'::jsonb,
  full_name text,
  phone text,
  email text,
  lead_status text not null default 'new'
    check (lead_status in ('new','called','scheduled','converted','lost')),
  assigned_to uuid references public.dmt_users(id) on delete set null,
  raw jsonb,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dmt_fb_leads_leadgen_id_idx on public.dmt_fb_leads (leadgen_id);
create index if not exists dmt_fb_leads_page_id_idx on public.dmt_fb_leads (page_id);
create index if not exists dmt_fb_leads_created_time_idx on public.dmt_fb_leads (created_time desc);
create index if not exists dmt_fb_leads_status_idx on public.dmt_fb_leads (lead_status);

alter table public.dmt_fb_leads disable row level security;

comment on table public.dmt_fb_leads is
  'Facebook Lead Ads — populated by /api/dmt/fb-webhook from Meta webhook deliveries. field_data holds the raw form submission.';
