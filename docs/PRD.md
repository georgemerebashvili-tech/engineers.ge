# PRD — engineers.ge

## ვინ იყენებს

- **Owner (admin)** — ერთადერთი, ვინც ატვირთავს ბანერებს და ხედავს სტატისტიკას.
- **ვიზიტორი** — ანონიმურად იყენებს კალკულატორებს 6 ენაზე.

## Auth

- **ერთადერთი ჰარდკოდ მომხმარებელი** — username + password `.env`-ში (`ADMIN_USER`, `ADMIN_PASS_HASH` bcrypt-ით).
- `/admin` login form → signed HttpOnly cookie (JWT, 7 დღე).
- Supabase Auth გამოყენებული არ არის.

## ენები (i18n)

პრიორიტეტით: `ka` (default) · `en` · `ru` · `tr` · `az` · `hy`.
- URL სტრუქტურა: `/ka/...`, `/en/...` და ა.შ.
- ენის არჩევანი cookie-ში (`lang`, 1 წელი).
- ბიბლიოთეკა: `next-intl`.

## Theme

- Light / Dark toggle.
- არჩევანი cookie-ში (`theme`, 1 წელი).
- System preference default-ად.

## Loader

- **Route transition loader** — ყოველ გვერდზე ცვლილებისას (Next.js `loading.tsx` + top-bar progress).
- ბიბლიოთეკა: `nextjs-toploader`.

## Social share

- ყველა გვერდზე share buttons: Facebook, X, LinkedIn, Telegram, WhatsApp, Copy link.
- კომპონენტი `<ShareBar url title />`.

## გვერდები

### ძირითადი ზოგადი გვერდები
- `/` — მთავარი გვერდი.
- `/dashboard` — მომხმარებლის უფასო დეშბორდი, სადაც თავმოყრილია საჯარო ხელსაწყოები.
- `/admin` — ადმინისტრატორის პანელი.

ინდივიდუალური კალკულატორები რჩება child route-ებად (`/calc/[slug]`) და იხსნება `/dashboard`-იდან.

### `/[lang]` მთავარი
- 4–6 ბანერი carousel (auto-rotate 5s, click → `link_url`).
- კალკულატორების grid (cards).
- Share bar footer-ში.

### `/[lang]/calc/[slug]` კალკულატორი
- Input form → result.
- State cookie-ში (`calc_<slug>_state`).
- Rate-limit **ინდივიდუალური** per calc (ცალკე გადავწყვეტთ თითოეულისთვის).
- Share bar.

### `/admin`
- Login form (username + password).
- Tabs:
  - **Hero Ads** — ფასიანი hero slot-ების ფასი, კლიენტი, დაკავების ვადა, live simulation.
  - **Banners** — upload / reorder / activate / link URL.
  - **Stats** — line chart, top pages, unique visitors, geo (ქვეყანა), per-calc usage.
  - **Donate** — დონაციის რეკვიზიტების მართვა.
  - **Share** — footer share ღილაკების ჩართვა/გამორთვა.
  - **Logout**.

## Data Model (Supabase)

```sql
banners (
  id uuid pk, created_at timestamptz default now(),
  image_url text not null, link_url text,
  sort_order int default 0, is_active bool default true
)

page_views (
  id uuid pk, ts timestamptz default now(),
  path text, lang text, visitor_id uuid,
  ua_hash text, country text, referrer text
)

visitors (
  visitor_id uuid pk,
  first_seen timestamptz, last_seen timestamptz,
  total_views int default 0
)

calc_usage (
  id uuid pk, visitor_id uuid,
  calc_slug text, used_at timestamptz default now()
)
```

## Client-side persistence (cookies)

- `visitor_id` — UUID, 1 წელი.
- `lang` — ენის კოდი.
- `theme` — `light` / `dark`.
- `calc_<slug>_state` — კალკულატორის input/result (JSON, base64).
- `admin_jwt` — HttpOnly, Secure, SameSite=Lax.

## Out of scope

- ვიზიტორის რეგისტრაცია.
- Payments / subscriptions.
- Blog / CMS / comments.
