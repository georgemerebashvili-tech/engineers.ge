-- engineers.ge · donation settings
-- Single-row config table. Admin UI edits recipient + bank list; public modal reads.

create table if not exists public.donation_settings (
  id               integer primary key default 1,
  recipient_name   text not null default '',
  recipient_surname text not null default '',
  banks            jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now(),
  constraint donation_settings_single_row check (id = 1)
);

-- Seed the single row if not present.
insert into public.donation_settings (id, recipient_name, recipient_surname, banks)
values (1, '', '', '[]'::jsonb)
on conflict (id) do nothing;

-- Lock down: only service_role reads/writes. Public read goes via server API.
alter table public.donation_settings enable row level security;
