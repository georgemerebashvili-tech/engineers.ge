# TODO — engineers.ge (running list)

ცხოვრობს სესიებს შორის. User-ი რომ რამეს გაკვრით თქვას საუბრის დროს — **მაშინვე აქ ჩავწერ**, რომ არ დაიკარგოს. Task-ის კეთებისას ჯერ ამ სიას გადავხედავ.

**ფორმატი:** `- [ ] YYYY-MM-DD — აღწერა` → შესრულებისას `[ ]` → `[x]` + `(done YYYY-MM-DD)`.

**პრიორიტეტი:** 🔴 blocker · 🟡 important · 🟢 nice-to-have (უპრიორიტეტო = default).

---

## 🔴 Blockers (online go-live)

- [ ] 2026-04-18 — **Supabase project provision** — user-ის action. დაარეგისტრიროს Supabase project (ან Vercel Marketplace-ის Neon Postgres-ს) და .env.local-ში ჩააწეროს:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  ამის გარეშე: banners upload, analytics, user project storage ვერ იმუშავებს production-ზე.
- [ ] 2026-04-18 — `.env.local` → Vercel env vars migration (preview + production scopes)
- [ ] 2026-04-18 — Vercel deploy (first push) + DNS link (engineers.ge → Vercel)

## 🟡 Auth & Session

- [x] 2026-04-18 — Admin login "დამახსოვრება" checkbox (username localStorage) *(done 2026-04-18)*
- [ ] 2026-04-18 — Admin login credentials → Supabase-based (currently hardcoded env vars per PRD). გადავწყვიტოთ: დავტოვოთ env-ში (მფლობელი ერთადერთი) თუ გადავიტანოთ Supabase-ზე (extensibility)?
- [ ] 2026-04-18 — "Sign in with Google/email" — ვიზიტორებისთვის, რომ პროექტები შეინახონ (Supabase Auth)

## 🟡 Page connectivity

- [ ] 2026-04-18 — Nav-link audit: ყოველი გვერდი ერთმანეთზე წერტილოვნად გადაბმული უნდა იყოს (breadcrumbs, contextual links)
- [ ] 2026-04-18 — `/dashboard-mui` route — 500-ს აბრუნებს, მაგრამ untouchable (MUI reference). ან ვმალავთ nav-იდან, ან restart-ით ვტესტავთ, ან production-build-ში გამოვრიცხოთ
- [ ] 2026-04-18 — Admin-ის შიდა ნავიგაცია (banners / stats / donate / share / tiles / logout) — verify ყველა ტაბი ხელმისაწვდომია

## 🟡 Online project storage (visitor-level)

- [ ] 2026-04-18 — **Visitor sign-in** (email/Google) — რომ ცვლადი მომხმარებელს შეეძლოს საკუთარი კალკულაციის შენახვა
- [ ] 2026-04-18 — Data model: `calc_projects` table
  ```sql
  id uuid pk
  user_id uuid fk auth.users
  calc_slug text (heat-loss, wall-thermal, hvac, …)
  name text
  input_json jsonb
  result_json jsonb
  created_at, updated_at timestamptz
  ```
- [ ] 2026-04-18 — კალკულატორის გვერდზე "შენახვა online"-ის ღილაკი (logged-in users-ისთვის)
- [ ] 2026-04-18 — "ჩემი პროექტები" გვერდი `/dashboard`-ში (list + edit + duplicate + delete)
- [ ] 2026-04-18 — Cookie-based state (`calc_<slug>_state`) fallback-ად unauth users-ისთვის (PRD §Client-side persistence)

## Admin-editable content (older)

- [ ] 2026-04-17 — Hero treemap-ის ყოველი tile-ის **label (`კომპანია N`)**, **sublabel (`კომენტარი N`)**, **client/company name** admin panel-იდან (8 slot: site, cta, slogan, business, childhood, b1, b2, b3). დღეს placeholder-ია `lib/hero-ads.ts`-ში
- [ ] 2026-04-17 — სარეკლამო ბანერები (image upload, replace, remove) admin panel-იდან tile-ების მიხედვით

## Admin panel → "სტანდარტები & წყაროები" (Regulations Watcher)

- [ ] 2026-04-18 — 🟡 გარე წყაროების მონიტორი admin panel-ში:
  - [ ] `regulation_sources` table: `id, title, url, selector (optional), last_hash, last_checked_at, last_changed_at, status`
  - [ ] Vercel Cron (daily/6h) — fetch each URL → hash(content) → compare with `last_hash` → if diff: snapshot + mark changed
  - [ ] Admin UI: list of sources, "changed" badge, diff viewer (old vs new), "approve & publish" button
  - [ ] Seed რამდენიმე კრიტიკული matsne.gov.ge URL-ი (სახანძრო ტექრეგლამენტი, სამშენებლო კოდექსი, HVAC-related normative acts)
  - [ ] Notification: email admin-ს როცა წყარო შეიცვალა (optional Slack/Telegram webhook)

## User-facing → "სტანდარტთან შესაბამისობის შემოწმება"

- [ ] 2026-04-18 — 🟡 compliance helper კალკულატორებში:
  - [ ] კალკულაციის შედეგი → button "შევამოწმო სტანდარტთან შესაბამისობა"
  - [ ] კონკრეტული rule-set-ები (მაგ: `min_fresh_air_per_person_m3h`, `max_U_value_wall`, `min_fire_escape_width_m`) — ინახება `standards_rules` table-ში
  - [ ] შედეგი: ✅ აკმაყოფილებს / ⚠️ საზღვართან / ❌ არ აკმაყოფილებს + reference წყაროზე (matsne URL)
  - [ ] Admin-ს შეუძლია rule-ები დაარედაქტიროს (value, reference URL, applicable calc slugs)
  - [ ] Phase 1: 3-5 ძირითადი rule ერთი კალკულატორისთვის (heat-loss ან HVAC) → iterate

## Admin panel → სარეკლამო (Ads) ტაბი

- [ ] 2026-04-17 — დამოუკიდებელი **"სარეკლამო"** ტაბი admin panel-ში:
  - [ ] სტატისტიკა (views, CTR, revenue per slot, active/inactive)
  - [ ] ცხრილები — არსებული ბანერების სია: დასახელება, slot, clients, ფასი, status
  - [ ] ლოგები + ისტორია (ვინ, როდის, რა შეცვალა; ბანერის rotation history)
  - [ ] გადახდები (payments ledger, outstanding invoices, paid-until)
  - [ ] კლიენტის ბანერის ატვირთვა (client-side upload + admin approval flow)
  - [ ] არსებული ბანერის preview
  - [ ] WhatsApp ნომერი (per-client contact) field
  - [ ] აქციები / sales icons (promo badges, discount tags) — icon set + CMS

---

## Done

- [x] 2026-04-18 — Admin login "დამახსოვრება" (username localStorage persistence)
- [x] 2026-04-18 — Home page (`/`) 500 → 200 (HomeStats MUI → Tailwind rewrite per DESIGN_RULES)
- [x] 2026-04-18 — Dashboard page (`/dashboard`) 500 → 200 (MUI shell → Tailwind per DESIGN_RULES)
- [x] 2026-04-18 — `docs/DESIGN_RULES.md` created (16 sections, binding)
- [x] 2026-04-18 — Cross-reference rule added to CLAUDE.md / AGENTS.md / DESIGN_RULES.md
