-- engineers.ge · storyabout.me timeline
-- Life events for the hero owner (single admin) rendered from the bio modal crown button.
-- Public read; admin write via service role.

create table if not exists public.hero_owner_story_events (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year between 1900 and 2200),
  title text not null default '',
  description text not null default '',
  image_url text not null default '',
  accent text not null default '#1f6fd4',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_owner_story_events_year_idx
  on public.hero_owner_story_events (year desc);
create index if not exists hero_owner_story_events_sort_idx
  on public.hero_owner_story_events (sort_order asc);

alter table public.hero_owner_story_events enable row level security;

drop policy if exists "hero_owner_story_events_public_read" on public.hero_owner_story_events;
create policy "hero_owner_story_events_public_read"
  on public.hero_owner_story_events
  for select
  using (true);

-- Seed with the 5 placeholder events matching lib/story-timeline.ts defaults.
-- Admin can edit via /admin/story.
insert into public.hero_owner_story_events (year, title, description, accent, sort_order)
values
  (2024, 'engineers.ge დაფუძნება',
    'ქართული საინჟინრო პლატფორმის დაწყება — უფასო კალკულატორები, Hero რეკლამები, Admin panel.',
    '#1f6fd4', 10),
  (2021, 'Senior HVAC Engineer',
    'დიდი სამრეწველო პროექტი — ვენტილაცია + გათბობა, EN 12831 აუდიტი.',
    '#1a3a6b', 20),
  (2018, 'პირველი საკუთარი პროექტი',
    'Commercial building HVAC დიზაინი — თბილისი, 6000 m².',
    '#1f6fd4', 30),
  (2014, 'საუნივერსიტეტო დიპლომი',
    'საქ. ტექნიკური უნივერსიტეტი — თბო-ენერგეტიკის ფაკულტეტი.',
    '#1a3a6b', 40),
  (2005, 'სკოლის დამთავრება',
    '92-ე საჯარო სკოლა, თბილისი.',
    '#1f6fd4', 50)
on conflict do nothing;

comment on table public.hero_owner_story_events is
  'storyabout.me timeline — life events of the hero owner, sorted by year desc. Admin CRUD via /admin/story.';
