-- engineers.ge · hero owner bio tile (single-row config)
-- stores the "headline" tile photo + name/title/bio rendered on the homepage hero

create table if not exists public.hero_owner (
  id smallint primary key default 1,
  image_url text not null default '',
  name text not null default '',
  title text not null default '',
  bio text not null default '',
  updated_at timestamptz not null default now(),
  constraint hero_owner_singleton check (id = 1)
);

insert into public.hero_owner (id, image_url, name, title, bio)
values (
  1,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=75',
  'გიორგი მერებაშვილი',
  'HVAC ინჟინერი · ენტერპრენერი',
  'გამარჯობა! მე ვარ გიორგი მერებაშვილი — HVAC ინჟინერი და engineers.ge-ის დამფუძნებელი. 10+ წელი ვმუშაობ საინჟინრო პროექტებზე — თბოდანაკარგების გაანგარიშება, ვენტილაციის სისტემის დიზაინი, შენობის ენერგოეფექტურობა. ეს პლატფორმა ქართველი ინჟინრების კოლექტიური ხელსაწყოა: უფასო კალკულატორები EN 12831, ISO 6946 და ASHRAE სტანდარტებით. ჩემი მიზანია გავხადო ქართული ენგინიერინგი უფრო სწრაფი, ზუსტი და ხელმისაწვდომი.'
)
on conflict (id) do nothing;

alter table public.hero_owner enable row level security;

drop policy if exists "hero_owner_public_read" on public.hero_owner;
create policy "hero_owner_public_read"
  on public.hero_owner
  for select
  using (true);
