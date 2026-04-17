-- engineers.ge · share-bar toggles
-- Admin enables/disables individual share targets.

create table if not exists public.share_settings (
  id           integer primary key default 1,
  facebook     boolean not null default true,
  x            boolean not null default true,
  linkedin     boolean not null default true,
  telegram     boolean not null default true,
  whatsapp     boolean not null default true,
  copy_link    boolean not null default true,
  updated_at   timestamptz not null default now(),
  constraint share_settings_single_row check (id = 1)
);

insert into public.share_settings (id) values (1) on conflict (id) do nothing;

alter table public.share_settings enable row level security;
