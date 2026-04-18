-- engineers.ge · AI settings (Anthropic / Claude API)
-- Single-row table with API key + model preferences, editable from admin.

create table if not exists public.ai_settings (
  id                integer primary key default 1,
  anthropic_api_key text,
  default_model     text not null default 'claude-haiku-4-5-20251001',
  enabled           boolean not null default true,
  updated_at        timestamptz not null default now(),
  constraint ai_settings_single_row check (id = 1)
);

insert into public.ai_settings (id) values (1)
on conflict (id) do nothing;

alter table public.ai_settings enable row level security;
