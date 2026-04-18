# TODO — engineers.ge (running list)

ცხოვრობს სესიებს შორის. User-ი რომ რამეს გაკვრით თქვას საუბრის დროს — **მაშინვე აქ ჩავწერ**, რომ არ დაიკარგოს. Task-ის კეთებისას ჯერ ამ სიას გადავხედავ.

**ფორმატი:** `- [ ] YYYY-MM-DD — აღწერა` → შესრულებისას `[ ]` → `[x]` + `(done YYYY-MM-DD)`.

**პრიორიტეტი:** 🔴 blocker · 🟡 important · 🟢 nice-to-have (უპრიორიტეტო = default).

---

## 🟢 Delegated to Codex

- [ ] 2026-04-18 — **Task 006** · სადარბაზოს დაწნეხვის ინტერაქტიული სიმულაციები. Claude visuals done. [`docs/tasks/006-stair-pressurization-simulations.md`](./tasks/006-stair-pressurization-simulations.md)

### Phase 1 — Ventilation suite (master plan: [`PLAN-ventilation-suite.md`](./PLAN-ventilation-suite.md))

- [x] 2026-04-18 — **Task 007** · Physics engine shared library (`_physics-engine.js`) — blocks all below. [`docs/tasks/007-physics-engine.md`](./tasks/007-physics-engine.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 008** · Stair physics upgrade + formulas tab + export. [`docs/tasks/008-stair-physics-upgrade.md`](./tasks/008-stair-physics-upgrade.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 009** · Elevator shaft pressurization simulator. [`docs/tasks/009-elevator-shaft-press.md`](./tasks/009-elevator-shaft-press.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 010** · Parking ventilation simulator (CO + smoke extract). [`docs/tasks/010-parking-ventilation.md`](./tasks/010-parking-ventilation.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 011** · Corridor / lobby pressurization simulator. [`docs/tasks/011-corridor-pressurization.md`](./tasks/011-corridor-pressurization.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 012** · Rules & Formulas reference page (`/calc/docs/physics` + KaTeX). [`docs/tasks/012-rules-formulas-page.md`](./tasks/012-rules-formulas-page.md) *(done 2026-04-18)*

### Phase 2 — Module Library + Building Composer

- [x] 2026-04-18 — **Task 013** · Module serialization format (Zod schema). [`tasks/013-module-format.md`](./tasks/013-module-format.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 014** · Composer page (`/calc/building-composer`). [`tasks/014-composer-page.md`](./tasks/014-composer-page.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 015** · Floor stacking (InstancedMesh × N). [`tasks/015-floor-stacking.md`](./tasks/015-floor-stacking.md) *(done 2026-04-18)*
- [x] 2026-04-18 — **Task 016** · Inter-module connections (snap, align, share). [`tasks/016-inter-module-connections.md`](./tasks/016-inter-module-connections.md) *(Claude MVP + Codex wiring done 2026-04-18)*
- [x] 2026-04-18 — **Task 017** · Save/Load via shared `_project-bridge.js` — ?project= URL binding, JSON import/export, browser-print PDF, project badge, Save as / Rename in wall-editor + composer. *(Claude ✅ 2026-04-18)*

### Phase 2.5 — Wall editor + Coohom parity + Fire safety

- [ ] 2026-04-18 — **Task 024** · Wall editor MVP (Claude ✅) + full library/snap/rooms (Codex). [`tasks/024-wall-editor.md`](./tasks/024-wall-editor.md)
- [ ] 2026-04-18 — **Task 025** · Projects Gate + Tabs pattern (Claude ✅ UI). [`tasks/025-project-gate.md`](./tasks/025-project-gate.md)
- [ ] 2026-04-18 — **Task 026** · Coohom-parity editor + 🔥 fire-safety mode (Phase B/C/D, ~28 days). Spec: [`specs/coohom-parity-spec.md`](./specs/coohom-parity-spec.md) · Task: [`tasks/026-coohom-parity.md`](./tasks/026-coohom-parity.md)
- [x] 2026-04-18 — **Task 027** (Claude ✅ design) · Portable editor foundation: [`_editor-ui.css`](../public/calc/_editor-ui.css) + [`_editor-panels.js`](../public/calc/_editor-panels.js) + wall-editor integration. Codex picks up wiring: [`tasks/027-editor-foundation-wiring.md`](./tasks/027-editor-foundation-wiring.md)
- [x] 2026-04-18 — **Phase B.3 Arc wall** · 3-point curve · Claude ✅
- [x] 2026-04-18 — **Phase B.4 PIP** · draggable mini 2D/3D preview · Claude ✅
- [x] 2026-04-18 — **Phase B.5 Multi-floor** · floor archive + switcher · Claude ✅
- [x] 2026-04-18 — **Phase B.6 3D toggle** · Three.js extrude walls · Claude ✅
- [x] 2026-04-18 — **Phase D Fire-mode MVP** · fire tool + time-lapse + smoke/CO overlays + scenario/standard selectors · Claude ✅
- [ ] 2026-04-18 — **Task 028** · Fire physics wiring + evac A* + door force gauges + PDF report (Codex). [`tasks/028-fire-physics-wiring.md`](./tasks/028-fire-physics-wiring.md)
- [ ] 2026-04-18 — 📷 **Screenshot requests** (20 items: File/Save/Toolkit/Gallery menus, left-column icons, Window/Opening dropdowns, context menu tooltips, Door/Window/Room right-panel forms) — see coohom-parity-spec §N

### Phase 3 — DXF import + Claude AI wall detection + Server save

- [x] 2026-04-19 — **Task 018 MVP** · Custom DXF parser (`_dxf-parser.js`) — LINE/LWPOLYLINE/CIRCLE/ARC/TEXT/INSERT + wall-editor "⬆ DXF" button with auto-scale (mm/cm/m) detection + confirm dialog. *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **Task 019 MVP** · Wall heuristic cleanup — snap endpoints (5cm), deduplicate, orthogonalize (3°), merge colinear-adjacent, drop degenerate. "🪄 Clean" topbar button + auto-prompt after DXF import. *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **Task 020 MVP** · Claude Vision wall detection — `/api/ai/detect-walls` (POST image+scale → walls JSON via Claude Sonnet 4.6, strict Zod schema) + wall-editor "🤖 AI walls" button (image upload + scale prompt + confidence report + auto-cleanup). *(Claude ✅ 2026-04-19)* · **რეალური გამოყენება: ANTHROPIC_API_KEY admin → AI settings**
- [x] 2026-04-19 — **Task 021** · 3D wall extrude with opening cutouts — segment-based decomposition (pier / sill / lintel chunks) for door/window holes in 3D, zero CSG deps. *(Claude ✅ 2026-04-19)*
- [ ] 2026-04-18 — **Task 022** · Supabase `building_projects` table + RLS. [`tasks/022-supabase-projects.md`](./tasks/022-supabase-projects.md) · **Supabase provision saitkveli**
- [ ] 2026-04-18 — **Task 023** · Autosave (3-layer: memory / localStorage / Supabase). [`tasks/023-autosave.md`](./tasks/023-autosave.md)

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
- [x] 2026-04-18 — `/dashboard-mui` route — სრულად ამოღებულია (MUI purge); route აღარ არსებობს. *(done 2026-04-18)*
- [x] 2026-04-18 — Admin-ის შიდა ნავიგაცია — ყველა sidebar entry შემოწმდა და მუშაობს (stats · tiles · banners/4-children · share · donate · users · referrals · ai · password · logout). *(audited 2026-04-18)*

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
- [x] 2026-04-18 — Cookie-based calc state fallback: [`public/calc/_draft-store.js`](../public/calc/_draft-store.js) — localStorage primary + 30-დღიანი cookie fallback (privacy-mode proof), auto `restoreInputs` + `autosaveInputs({debounce:400})`, cookie 3.5KB cap (pare-to-inputs fallback). Integrated პირველ calc-ში (`wall-thermal`). სხვა HTML კალკები მიიღებენ 2 ხაზით (`<script src>` + `DraftStore.create(slug).autosaveInputs()`). *(done 2026-04-18)*

## Admin-editable content (older)

- [x] 2026-04-17 — Hero treemap-ის ყოველი tile-ის **label**, **sublabel**, **client_name**, image_url, link_url უკვე ადმინიდან რედაქტირდება [`/admin/tiles`](../app/admin/(authed)/tiles/page.tsx). DB: `hero_ad_slots` ([0004_hero_ad_slots.sql](../supabase/migrations/0004_hero_ad_slots.sql)) — 8 slot (site, cta, slogan, business, childhood, b1, b2, b3). `lib/hero-ads.ts` ახლა defaults fallback-ია. *(verified 2026-04-18)*
- [x] 2026-04-17 — სარეკლამო ბანერები image upload/replace/remove: [`/admin/tiles`](../app/admin/(authed)/tiles/page.tsx) ახლა real upload [`/api/admin/upload-image`](../app/api/admin/upload-image/route.ts)-ით Supabase Storage `public-assets` bucket-ში (5MB cap, JPG/PNG/WEBP/GIF/SVG). publicUrl ავტომატურად ჩაწერდება `image_url`-ში. Remove ღილაკი ასუფთავებს ველს. *(done 2026-04-18)*

## 🟡 Admin · რეგისტრირებული მომხმარებლები redesign — 2026-04-18

**სტატუსი:** UI + schema მზადაა, ველოდები Supabase provision-ს.

- [x] 2026-04-18 — Migration `0010_users_referrals_trash.sql` — adds `source`, `referred_by_user_id`, `ref_code`, `interests[]`, `project_count`, `deleted_at`, `notes` ველები users-ზე; `referral_contacts` table; cross-check trigger; `purge_soft_deleted()` RPC
- [x] 2026-04-18 — `/admin/users` redesign — 6 KPI (სულ, ახალი 7 დღე, თვით, მოწვეული, verified, ტოპ მომწვევი), 2 ჩარტი (Area რეგისტრაცია 30 დღე · Bar ტოპ მომწვევები), expandable rows (კონტაქტი / პროფილი / წყარო), ძიება + 4 ფილტრი (წყარო, მიმართულება, ქვეყანა, ენა), Active/Trash ტაბები
- [x] 2026-04-18 — Soft-delete flow — `DELETE /api/admin/users/:id` (soft), `POST /api/admin/users/:id/restore`, `DELETE /api/admin/users/:id?purge=1` (hard). Trash ყუთი აჩვენებს დარჩენილ დღეებს.
- [x] 2026-04-18 — Vercel Cron `/api/cron/purge-deleted` (ყოველდღე 03:00) — `purge_soft_deleted()` RPC-ს იძახებს, 10 დღეზე ძველ soft-deleted ჩანაწერებს საბოლოოდ შლის. Headers: `x-vercel-cron: 1` ან `Authorization: Bearer $CRON_SECRET`.
- [x] 2026-04-18 — Graceful empty state (Supabase down → helpful message + bullet list, არა red query failed error)

### Blocked on Supabase provision:
- [ ] 2026-04-18 — Migration `0010` გაშვება Supabase project-ზე
- [ ] 2026-04-18 — Migration `0011_referral_verification.sql` გაშვება — ref_code auto-gen, email_verify_tokens, verified_engineer, disposable_email/fraud_score ველები, users_review_queue view
- [ ] 2026-04-18 — Migration `0009_admin_editable_copy.sql` გაშვება — share-bar visibility/intro_text, donation heading/description, ad_text, per-platform share URLs
- [ ] 2026-04-18 — `RESEND_API_KEY` env var-ი (email verification links გაგზავნისთვის)
- [ ] 2026-04-18 — `CRON_SECRET` env var-ი Vercel-ზე (cron auth-ისთვის)
- [x] 2026-04-18 — `/api/register` update — `source`, `ref_code`, `interests` ველების ჩაწერა (`eng_ref` cookie + body `ref`-იდან). Ref attribution + disposable-email ბლოკი + email verification token. *(done 2026-04-18)*
- [ ] 2026-04-18 — `project_count` — როცა user save-ავს `calc_projects`-ში, trigger ან nightly sum-ით განვაახლო
- [x] 2026-04-18 — RegisterPromptModal — interests multi-select + ref_code ავტო-ამოკითხვა cookie-დან *(done 2026-04-19 — 11 interest chip-ები (HVAC/ventilation/electrical/fire-safety/… ქართული label-ებით, max 12), `interests` ველი `/api/register` body schema-ში + `createUser()` persists to `users.interests` text[]. ref_code API-მ უკვე `eng_ref` cookie fallback-ით კითხულობდა, client-side explicit პასვაც აღარ საჭიროა.)*
- [ ] 2026-04-18 — referral_contacts import — /dashboard/referrals localStorage ჩანაწერები → Supabase-ზე upload

## 🟡 Referral program — 2026-04-18 ("იშოვე 3000 ლარამდე")

User brief: homepage-ზე მოცურავე ღილაკი (chat-bubble style, bottom-right) "იშოვე 3000 ლარამდე". Click → modal წესებით. Ცნება: ვიზიტორი მოიწვევს ინჟინრებს → თუ ისინი დარეგისტრირდებიან → 10 ლარი მოწვეულ უნიკალურ კონტაქტზე (მაქს 3000 ლარი = 300 კაცი ერთ მონაწილეზე, ან dynamic cap).

- [ ] 2026-04-18 — **Referral floating widget** homepage-ზე (და საიტზე საერთოდ)
  - პოზიცია: `fixed bottom-right`, z-index 90 (modal-ზე ქვემოთ)
  - pill/bubble design: ფულის ნიშნით ikon + text "იშოვე 3000 ლარამდე"
  - click → program rules modal
  - mobile: compact (icon only + small label)
  - dismissible (x) → cookie `referral_widget_dismissed=1` 30 დღე

- [ ] 2026-04-18 — **Program rules modal**
  - Title: "მოიწვიე ინჟინრები · მიიღე ფული"
  - Rules:
    - გიორგი მერებაშვილი, კეთილი საქმის პოპულარიზაციის მიზნით, გარკვეულ პერიოდში იხდის გასამრჯელოს
    - ფასი: **10 ლარი** თითოეული უნიკალური დარეგისტრირებული კონტაქტისთვის
    - მაქსიმუმი 1 მონაწილეზე: **3000 ლარი** (= 300 კონტაქტი)
    - წესი: კონტაქტი უნიკალური უნდა იყოს (ემაილი + ტელეფონი ჯვარედინი შემოწმება); სისტემა ავტომატურად ამოწმებს რეგისტრირებულ users-ს
    - გადახდა: კონტაქტი რომ დარეგისტრირდება → status → "rewarded"
    - კონტაქტს უნდა ჰქონდეს სამომხმარებლო წესებზე თანხმობა რეგისტრაციისას (ჩართულია — RegisterPromptModal + RegistrationTrigger გვაქვს)
  - CTA: "მოიწვიე ახლა" → redirect `/dashboard/referrals`
  - ეშმაკური მონატანი: "ჩვენ დაგეხმარებით — გაგიმარტივებთ"

- [ ] 2026-04-18 — **`/dashboard/referrals` page** (public, არა admin)
  - KPI zone ზემოდან (dashboard-style):
    - სულ დამატებული კონტაქტი
    - გაგზავნილი მოწვევა
    - რეგისტრირებული (გამწვანებული)
    - დასარიცხი ჯამი (GEL)
  - Add contact form:
    - სახელი, გვარი
    - კატეგორია (dropdown): ელექტრო ინჟინერი / სუსტი დენების ინჟინერი / მექანიკური ინჟინერი / HVAC ინჟინერი / არქიტექტორი / სტუდენტი / სხვა
    - Hashtags (multi-select chip input): #ventilation #hvac #electrical #fire-safety #bim #cad …
    - ტელეფონი (WhatsApp-ისთვის) · ერთჯერადი flag (gaagzavnis mere system წაშლის თუ user არჩევს)
    - Email
    - LinkedIn URL (optional)
    - Facebook URL (optional)
    - Submit → ინახავს
  - Contacts table (mepflow stylistic reference):
    - columns: სახელი · გვარი · კატეგორია · tags · ტელ. · email · LinkedIn · FB · status · action
    - status values: `draft` | `sent` | `registered` | `rewarded`
    - search bar full-system
    - filter per column (popover)
    - pagination 50/100/200 (DESIGN_RULES §12 compliance — ეს KAYA rule-ია, მაგრამ engineers.ge-ზე ჯერ არა — bootstrap-ად საკმარისია basic table)
    - action per row: "გაგზავნე WhatsApp-ზე" (opens `wa.me/<phone>?text=<msg+link>`)
    - WhatsApp link template-ში — referral URL-ში UTM/ref კოდი (=sender id + contact id) რომ auto-attribute-ს გავაკეთოთ რეგისტრაციისას
  - Cross-check logic:
    - როცა ახალი user დარეგისტრირდება RegistrationTrigger-ით → match email/phone referred_contacts-ში → თუ match → ref contact status=`registered`, increment referrer balance
    - admin panel-ში cross-check view: referrals ↔ users table join (data-health tool)
  - Privacy:
    - ერთჯერადი ტელეფონი option (default checked): გაგზავნის შემდეგ ტელეფონი ჩანაცვლდება `+***` placeholder-ით bazaში
    - თუ user არჩევს "დატოვე ტელეფონი" — შენახდება, მაგრამ პერსონალური მონაცემების პოლიტიკაში user უნდა დაეთანხმოს (UI-ზე hint)
    - referrer-მა რეგისტრაციისას მიიღო თანხმობა (გასწორდება ცალკე გვერდით: "პერსონალური მონაცემების დამუშავების წესები კონტაქტების დამატებისას")

- [ ] 2026-04-18 — **WhatsApp send scheme**
  - MVP: `wa.me/<phone>?text=<encoded>` link (user-ს ხელით გადავამისამართებთ — free, არანაირი API)
  - message template (ka): "გამარჯობა, {სახელი}! გეკაცნებათ გიორგი მერებაშვილი. engineers.ge-ზე უფასო საინჟინრო ხელსაწყოებს ვთავაზობთ — დაარეგისტრირდი ამ ლინკზე: {REF_URL}"
  - Phase 2 (optional): Meta WhatsApp Business API / Twilio Conversations — require business account approval, ~$0.005/msg

- [ ] 2026-04-18 — **Sidebar nav entry** "მოიწვიე მეგობრები" (Users icon) → /dashboard/referrals (logged-in ან open)

- [x] 2026-04-18 — **Admin cross-check page** [`/admin/referrals`](../app/admin/(authed)/referrals/page.tsx) — top referrers + referred users table (verified / flagged / disposable markers). Sidebar entry დამატდა `მომხმარებლები` სექციაში. *(done 2026-04-18)*
  - ✅ referrer-ების balance (reward_gel)
  - ✅ referred users cross-join by `referred_by_user_id`
  - ⏳ manual reward approve/reject — bucket after payments MVP

- [ ] 2026-04-18 — **Data model (Supabase, როცა provision-დება)**
  ```sql
  referrers (
    id uuid pk,
    user_id uuid fk users,  -- referrer account (optional; could be anon + email)
    anon_email text,
    created_at timestamptz
  )
  referred_contacts (
    id uuid pk,
    referrer_id uuid fk referrers,
    first_name text, last_name text,
    category text,
    tags text[],
    phone text,  -- nullable (may be erased after send)
    phone_disposable bool default true,
    email text,
    linkedin_url text, facebook_url text,
    status text default 'draft',  -- draft | sent | registered | rewarded
    registered_user_id uuid fk users,  -- set by cross-check job
    sent_at, registered_at, rewarded_at timestamptz,
    reward_amount_gel numeric
  )
  ```
  - MVP ბოლო-ბოლო localStorage-ზე (non-Supabase) — მაგრამ UI ისე ავაწყო რომ swap API backend-ით მინიმალური იყოს

- [x] 2026-04-18 — **Registration terms verification** — `RegistrationTrigger` + `RegisterPromptModal` **უკვე** ითხოვს თანხმობას (3 checkbox: terms / dataStorage / privacy). OK. მესამე პირების კონტაქტების იმპორტის consent gate დამატდა [`/dashboard/referrals`](../app/(withSidebar)/dashboard/referrals/workspace.tsx) გვერდზე — პირველ ვიზიტზე გამოდის modal (checkbox-ით "მაქვს კონტაქტების მფლობელთა თანხმობა"), localStorage-ში `eng_referral_consent_v1=1` ინახება. *(done 2026-04-19)*

## 🟡 User brief — 2026-04-18 (visual + structure overhaul)

- [x] 2026-04-18 — **`/` home — real DB stats** *(verified 2026-04-19)*. [`components/home-stats.tsx`](../components/home-stats.tsx) + [`lib/home-stats.ts`](../lib/home-stats.ts) — `page_views` + `calc_events` ცხრილები; hardcoded/simulated data არ არის; DB offline → graceful empty state + "DB OFFLINE" badge.

- [x] 2026-04-18 — **`/ads` — editable prices from admin** *(verified 2026-04-19)*. ფასები `hero_ad_slots.price_gel` (admin editable via [`/admin/tiles`](../app/admin/(authed)/tiles/form.tsx) numeric input). ads-simulator live render via getHeroAdSlots(). Default 300, override via DB.

- [ ] 2026-04-18 — **`/dashboard` — redesign: KAYA-style sidebar**
  - მარცხენა sidebar: collapsed (icons only) → hover expand → pin (🖌 ღილაკი ზევით, Stepup-ის მსგავსად)
  - sidebar-ში "საინჟინრო tabs" (კალკულატორები, projects, ა.შ.) — გადავიტანოთ ამ მენიუში
  - reference ვიზუალი: user-ის მოცემული screenshot (Stepup sidebar — pin button, sections: მთავარი/CRM/Custom Solutions/ADMIN, badges)
  - შეესაბამებოდეს `DESIGN_RULES §5` (5-zone layout) + Stepup-ის pattern-ს

- [x] 2026-04-18 — **`/preview` — DELETE** *(done 2026-04-19)*
- [x] 2026-04-18 — **`/admin/donate` — DELETE** *(done 2026-04-19 — page + api/admin/donate route + sidebar entry removed; public api/donate/info retained so `share_settings`/`donation_settings` DB-driven DonateModal still works)*
- [x] 2026-04-18 — **`/admin/share` — DELETE** *(done 2026-04-19 — page + api/admin/share route + sidebar entry removed; public api/share/settings retained)*

- [ ] 2026-04-18 — **`/calc/heat-loss` — შინაარსი აკლია**
  - გვერდი არსებობს მაგრამ content ცარიელია (ან ფრაგმენტულია)
  - აუდიტი: რა უნდა შეიცავდეს (inputs: ფართი, კედლის U-value, ფანჯრები, ventilation…; outputs: kW, kcal/h; reference standard)
  - შევავსო საჭირო კომპონენტებით

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

- [x] 2026-04-19 — Task 018 composer DXF parser integration (`lib/dxf/parse.ts`, `lib/dxf/to-three.ts`, `components/composer/dxf-panel.tsx`) + layer toggles + camera auto-fit + local classification cache helpers
- [x] 2026-04-18 — Admin login "დამახსოვრება" (username localStorage persistence)
- [x] 2026-04-18 — Home page (`/`) 500 → 200 (HomeStats MUI → Tailwind rewrite per DESIGN_RULES)
- [x] 2026-04-18 — Dashboard page (`/dashboard`) 500 → 200 (MUI shell → Tailwind per DESIGN_RULES)
- [x] 2026-04-18 — `docs/DESIGN_RULES.md` created (16 sections, binding)
- [x] 2026-04-18 — Cross-reference rule added to CLAUDE.md / AGENTS.md / DESIGN_RULES.md
- [x] 2026-04-18 — Task 007 physics engine (`public/calc/_physics-engine.js`) + simulator imports
- [x] 2026-04-18 — Task 008 stair physics upgrade (`public/calc/stair-pressurization.html`) + formulas tab + JSON/PDF flow
- [x] 2026-04-18 — Task 009 elevator shaft pressurization (`public/calc/elevator-shaft-press.html`) + formulas/export/import + piston motion
- [x] 2026-04-18 — Task 010 parking ventilation (`public/calc/parking-ventilation.html`) + CO chart + 3D smoke/jet fans + registry wiring
- [x] 2026-04-18 — Task 011 corridor / lobby pressurization (`public/calc/floor-pressurization.html`) + door toggles + cross-shaft context + registry wiring
- [x] 2026-04-18 — Task 012 rules & formulas page (`app/(withSidebar)/calc/docs/physics/page.tsx`) + KaTeX install + searchable reference catalog
- [x] 2026-04-18 — Task 013 module serialization (`lib/building/module-schema.ts`, `lib/building/module-utils.ts`) + Zod validation + fixture round-trip
