-- engineers.ge · hero owner timeline events (storyabout.me Phase 2)
-- Admin-editable list of life/career milestones rendered in the timeline modal.

create table if not exists public.hero_owner_story_events (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  title text not null default '',
  description text not null default '',
  image_url text not null default '',
  accent text not null default '#1f6fd4',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_owner_story_events_order_idx
  on public.hero_owner_story_events (sort_order asc, year desc);

alter table public.hero_owner_story_events enable row level security;

drop policy if exists "hero_owner_story_events_public_read" on public.hero_owner_story_events;
create policy "hero_owner_story_events_public_read"
  on public.hero_owner_story_events
  for select
  using (true);

comment on table public.hero_owner_story_events is
  'Timeline milestones shown in the hero owner "storyabout.me" modal. Public read; admin write via service role.';
