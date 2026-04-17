# ROADMAP

## Phase 0 — Setup (Claude)
- [ ] `npx create-next-app@latest` (TS, Tailwind, App Router, ESLint).
- [ ] `next-intl` setup + 6 locale files (`messages/ka.json` ...).
- [ ] Theme provider (light/dark + cookie).
- [ ] `nextjs-toploader` global.
- [ ] `<ShareBar>` component.
- [ ] Supabase project + local env.
- [ ] GitHub repo + Vercel link (engineers.ge როცა დადასტურდება).
- [ ] Migrations: `banners`, `page_views`, `visitors`, `calc_usage`.
- [ ] Admin auth (env + bcrypt + JWT).

## Phase 1 — Analytics core (Claude)
- [ ] `middleware.ts` — visitor_id cookie + log page_view.
- [ ] UA hash util (SHA-256).
- [ ] Cron / Edge function — daily rollup.

## Phase 2 — Home + Banners (Claude → Codex tasks)
- [ ] Banner carousel component.
- [ ] Admin banner CRUD page.
- [ ] Supabase Storage upload (signed URLs).

## Phase 3 — Admin Dashboard (Codex)
- [ ] Auth gate (`/admin` layout).
- [ ] Stats tab: Recharts (line, pie, table).
- [ ] Date range selector.

## Phase 4 — Calculators (Codex, per-calc tasks)
- [ ] Public `/dashboard` page — free-access user dashboard for calculators and visitor tools.
- [ ] Base `<Calculator>` shell (form + cookie state).
- [ ] Rate-limit middleware per calc.
- [ ] First 2–3 calculators (user მოგვცემს ჩამონათვალს).

## Phase 5 — Polish
- [ ] SEO (sitemap, robots, OG tags).
- [ ] i18n (თუ საჭიროა).
- [ ] Performance pass (Lighthouse).
