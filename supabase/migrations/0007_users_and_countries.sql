-- engineers.ge · visitor registration system
-- users + countries with dynamic country addition

create extension if not exists pgcrypto;

-- Countries (reference table, populated on-demand during registration)
create table if not exists public.countries (
  id            bigserial primary key,
  code          text unique,                  -- ISO 3166-1 alpha-2 (e.g. 'GE')
  name_ka       text not null,
  name_en       text not null,
  flag_emoji    text,
  created_at    timestamptz not null default now()
);

create index if not exists countries_name_ka_idx on public.countries (name_ka);
create index if not exists countries_name_en_idx on public.countries (name_en);

-- Seed common countries (user may add more)
insert into public.countries (code, name_ka, name_en, flag_emoji) values
  ('GE', 'საქართველო', 'Georgia', '🇬🇪'),
  ('US', 'აშშ', 'United States', '🇺🇸'),
  ('GB', 'დიდი ბრიტანეთი', 'United Kingdom', '🇬🇧'),
  ('DE', 'გერმანია', 'Germany', '🇩🇪'),
  ('FR', 'საფრანგეთი', 'France', '🇫🇷'),
  ('TR', 'თურქეთი', 'Turkey', '🇹🇷'),
  ('RU', 'რუსეთი', 'Russia', '🇷🇺'),
  ('AZ', 'აზერბაიჯანი', 'Azerbaijan', '🇦🇿'),
  ('AM', 'სომხეთი', 'Armenia', '🇦🇲'),
  ('UA', 'უკრაინა', 'Ukraine', '🇺🇦'),
  ('IT', 'იტალია', 'Italy', '🇮🇹'),
  ('ES', 'ესპანეთი', 'Spain', '🇪🇸'),
  ('PL', 'პოლონეთი', 'Poland', '🇵🇱'),
  ('NL', 'ნიდერლანდები', 'Netherlands', '🇳🇱'),
  ('GR', 'საბერძნეთი', 'Greece', '🇬🇷'),
  ('IL', 'ისრაელი', 'Israel', '🇮🇱'),
  ('AE', 'არაბთა გაერთიანებული საამიროები', 'United Arab Emirates', '🇦🇪'),
  ('CN', 'ჩინეთი', 'China', '🇨🇳'),
  ('IN', 'ინდოეთი', 'India', '🇮🇳'),
  ('JP', 'იაპონია', 'Japan', '🇯🇵'),
  ('CA', 'კანადა', 'Canada', '🇨🇦'),
  ('AU', 'ავსტრალია', 'Australia', '🇦🇺'),
  ('BR', 'ბრაზილია', 'Brazil', '🇧🇷'),
  ('MX', 'მექსიკა', 'Mexico', '🇲🇽'),
  ('EG', 'ეგვიპტე', 'Egypt', '🇪🇬'),
  ('SA', 'საუდის არაბეთი', 'Saudi Arabia', '🇸🇦')
on conflict (code) do nothing;

alter table public.countries enable row level security;

-- Users: registered visitors
create table if not exists public.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text not null,
  country_id         bigint references public.countries(id) on delete set null,
  language           text not null default 'ka' check (language in ('ka','en','ru','tr','az','hy')),
  profession         text,
  visitor_id         uuid,
  password_hash      text not null,
  password_salt      text not null,
  hash_algo          text not null default 'PBKDF2-SHA256-210000',
  email_verified     boolean not null default false,
  registered_at      timestamptz not null default now(),
  last_login_at      timestamptz
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_country_idx on public.users (country_id);
create index if not exists users_registered_idx on public.users (registered_at desc);
create index if not exists users_language_idx on public.users (language);

alter table public.users enable row level security;
