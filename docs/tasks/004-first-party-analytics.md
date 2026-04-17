# 004 · First-party Analytics (page_views)

**Status:** implemented (pending Supabase project + env vars)
**Owner:** Claude (impl), Codex (polish / SQL views)

## მიზანი

საიტს ჰქონდეს საკუთარი analytics — ვინ შემოდის, საიდან, რა დრო რჩება რომელ
გვერდზე. ყველაფერი Supabase-ში. GA4 / Vercel Analytics / Plausible — არა.

## არქიტექტურა

```
browser                     edge                        node api                supabase
────────                    ──────                      ────────                ─────────
[page load]
  └─ request ──────▶ middleware.ts
                       └─ set eng_vid (UUID, 1y)
                       └─ pass-through
  ◀──────────────── HTML + cookie
  └─ <Tracker /> mounts
     └─ POST /api/track {path, referrer, utm_*}
                                                  ▶ reads cookie + UA + geo
                                                  ▶ parses UA (ua-parser-js)
                                                  ▶ hashes ip+ua (daily salt)
                                                  ▶ INSERT page_views ─────▶ [row id]
                                                  ◀ {id}
     ◀ {id}
  [path change / tab hidden / pagehide]
     └─ navigator.sendBeacon('/api/track/leave', {id, duration_ms})
                                                  ▶ UPDATE page_views SET left_at, duration_ms
```

## Components

| File | Purpose |
|------|---------|
| `supabase/migrations/0001_page_views.sql` | Table + indexes + RLS |
| `lib/supabase/admin.ts` | Service-role client (lazy, server-only) |
| `middleware.ts` | Sets `eng_vid` cookie on all page routes |
| `components/analytics/Tracker.tsx` | Client beacon on mount + leave |
| `app/api/track/route.ts` | POST — insert row, return id |
| `app/api/track/leave/route.ts` | POST — update duration (beacon target) |
| `app/admin/(authed)/stats/page.tsx` | Server-side query → dashboard |
| `app/admin/(authed)/stats/dashboard.tsx` | Client component, recharts |

## Setup (what the user must do)

1. **Supabase project** — შექმენი `engineers-ge` project [supabase.com](https://supabase.com).
2. **Env vars** (`.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. **Run migration** — Supabase SQL editor-ში ჩასვი და გაუშვი
   `supabase/migrations/0001_page_views.sql`-ის შიგთავსი.
4. **Restart dev** — `npm run dev`.
5. **შედი `/admin/stats`-ზე** — dashboard გიჩვენებს მონაცემს რა წუთიდან გენერირდება.

## KPI-ები და view-ები

- **KPI cards:** views, unique visitors, avg time on page, bounce rate (1-page sessions)
- **Time series:** views + uniques per hour (24h) / per day (7d, 30d)
- **Top pages table:** path, views, uniques, avg duration
- **Sources:** horizontal bar — referrer_domain + UTM
- **Countries:** horizontal distribution list (Vercel geo header)
- **Device / Browser:** pie charts
- **Live:** active visitors in last 5 min (top-right badge)

## Privacy

- არ ვინახავთ raw IP. ვიყენებთ `sha256(ip + ua + YYYY-MM-DD)`-ის პირველ 32 სიმბოლოს
  mere fingerprint-ად (daily rotation).
- `eng_vid` — first-party UUID cookie, `sameSite=lax`, 1 წელი.
- Bot UA-ები filter-დება (`BOT_RE` რეგექსი).
- RLS ჩართულია, მხოლოდ service_role წერს/კითხულობს.

## Out of scope (v1)

- Event tracking (button clicks, calc submits) — მოგვიანებით.
- SQL views / materialized aggregates — ახლა JS-ში ვაკეთებთ aggregate-ს
  (limit 20,000 rows / 30d). ტრაფიკი როცა გაიზრდება, გადავალთ SQL functions-ზე.
- Session stitching (30-min gap = new session) — ახლა visitor_id-ს ვიყენებთ უშუალოდ.
- Cohort / funnel analysis.
- Real-time via Supabase Realtime — ახლა server component-ი 0-revalidate-ით refetch-ობს.

## Acceptance criteria

- [x] `middleware.ts` სვამს `eng_vid` cookie-ს
- [x] `<Tracker />` root layout-ში
- [x] `/api/track` POST insert-ობს და აბრუნებს `id`-ს
- [x] `/api/track/leave` beacon-ი ანახლებს `duration_ms`-ს
- [x] Bot UA → skip
- [x] Same-origin referrer → null
- [x] Vercel geo headers → country/city
- [x] Admin `/admin/stats` ხატავს 4 KPI + line + top pages + sources + countries + live
- [ ] **User steps:** Supabase project + env vars + migration run (outside code)
