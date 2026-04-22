-- engineers.ge · DMT Facebook Lead Ads webhook secrets
-- Singleton row; read/write only via service role (no RLS policies).
-- Admin UI gates access behind owner/admin role + password re-entry.

create table if not exists public.dmt_fb_webhook_settings (
  id                integer primary key default 1,
  verify_token      text,
  app_secret        text,
  page_access_token text,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references public.dmt_users(id) on delete set null,
  constraint dmt_fb_webhook_settings_single_row check (id = 1)
);

insert into public.dmt_fb_webhook_settings (id) values (1)
on conflict (id) do nothing;

alter table public.dmt_fb_webhook_settings enable row level security;
