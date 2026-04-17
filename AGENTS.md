# engineers.ge — Agents Spec

ეს ფაილი არის **ერთიანი წყარო** Claude-სა და Codex-ისთვის. ორივე აგენტი კითხულობს ამ ფაილს ყოველი სესიის დასაწყისში.

## როლები

- **Claude (lead)** — არქიტექტურა, გადაწყვეტილებები, code review, integration.
- **Codex** — ფოკუსირებული implementation tasks-ზე, რომლებსაც Claude მისცემს (იხ. `docs/ROADMAP.md`).
- კონფლიქტის შემთხვევაში: Claude-ის სიტყვა გადამწყვეტია.

## პროექტის მიზანი

პირადი საგანმანათლებლო საიტი ინჟინრებისთვის (`engineers.ge`):
- მთავარ გვერდზე 4–6 ბანერი (rotating, admin-ატვირთული).
- ონლაინ კალკულატორები (cookie-based state, ზოგი შეზღუდული).
- Admin კაბინა მხოლოდ მფლობელისთვის (ბანერების მართვა + სტატისტიკა).
- ვიზიტორების ლოგი (page, timestamp, unique visitor) + dashboard ჩარტებით.

## Stack

| Layer      | Tech                                     |
|------------|------------------------------------------|
| Frontend   | Next.js 15 (App Router) + TypeScript     |
| Styling    | Tailwind CSS + shadcn/ui                 |
| DB / Auth  | Supabase (Postgres, Auth, Storage, RLS)  |
| Hosting    | Vercel                                   |
| Repo       | GitHub                                   |
| Domain     | engineers.ge (Vercel DNS)                |
| Charts     | Recharts (admin dashboard)               |
| Analytics  | Custom (Supabase `page_views` table)     |

## არქიტექტურული წესები

1. **მონაცემები Supabase-ში**, არა localStorage-ში (გარდა კალკულატორების input state-ისა — ის cookie-ში).
2. **RLS ჩართული ყველა table-ზე** — public read მხოლოდ საჭიროს, write admin-ის JWT-ით.
3. **Server Components default-ად**, Client Component მხოლოდ როცა საჭიროა (interaction, cookie read).
4. **ბანერები** — Supabase Storage bucket `banners/`, metadata table `banners` (order, active, link_url).
5. **ლოგი** — middleware `middleware.ts` წერს `page_views`-ში (path, visitor_id cookie, ts, ua-hash, country via Vercel geo).
6. **Visitor ID** — first-party cookie (UUID v4, 1 წელი, HttpOnly=false, SameSite=Lax). IP არ ვინახავთ, მხოლოდ SHA-256(IP+UA) — privacy-friendly.
7. **Secrets** — მხოლოდ `.env.local` (gitignored) + Vercel env vars. არასდროს commit.
8. **კალკულატორების შეზღუდვა** — rate-limit per visitor_id (მაგ. 10 გამოთვლა/დღე უფასოდ, მეტი — TBD).

## Repo Layout (target)

```
/app                 Next.js routes
  /(public)          home, calculators, about
  /admin             protected admin cabin
  /api               route handlers
/components          reusable UI
/lib                 supabase client, utils, analytics
/middleware.ts       log every request
/supabase
  /migrations        SQL migrations
  /seed.sql
/docs
  PRD.md             product requirements
  DESIGN.md          visual design rules (fill after sample arrives)
  ROADMAP.md         task phases
  DECISIONS.md       architectural log (ADR-style)
```

## დიზაინი & სტილი (mandatory read)

- **`docs/DESIGN.md`** — ვიზუალური ენა, კომპოზიცია, patterns, do/don't.
- **`docs/STYLE.md`** — CSS tokens, typography scale, spacing.
- ორივე აგენტმა უნდა წაიკითხოს UI-ს ცვლილებამდე. კონფლიქტში — `DESIGN.md` > `STYLE.md`.

## UX წესები

- 6-ენოვანი i18n (`ka`, `en`, `ru`, `tr`, `az`, `hy`) `next-intl`-ით.
- Light + Dark, cookie-persisted.
- `nextjs-toploader` global + `loading.tsx` skeleton per route.
- Share bar ყველა გვერდზე (FB, X, LinkedIn, Telegram, WhatsApp, Copy).
- Admin auth: hardcoded env vars + JWT cookie (არა Supabase Auth).

## Working rules (ორივე აგენტი)

- **არ ჩაიდინო commit** მომხმარებლის დაუკითხავად.
- **არ შექმნა ფაილი**, რომელიც არ არის ROADMAP-ში ან user request-ში.
- **ყველა schema change** → migration ფაილი `/supabase/migrations/`-ში.
- **Task-ის შესრულებამდე** — წაიკითხე `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`.
- **Task-ის შემდეგ** — თუ ახალი არქიტექტურული გადაწყვეტილება მიიღე, დაამატე `docs/DECISIONS.md`-ში.
- **ენა კოდში** — ცვლადები/კომენტარები ინგლისურად, UI ტექსტი ქართულად.
