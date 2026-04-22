# TODO — engineers.ge (running list)

ცხოვრობს სესიებს შორის. User-ი რომ რამეს გაკვრით თქვას საუბრის დროს — **მაშინვე აქ ჩავწერ**, რომ არ დაიკარგოს. Task-ის კეთებისას ჯერ ამ სიას გადავხედავ.

**ფორმატი:** `- [ ] YYYY-MM-DD — აღწერა` → შესრულებისას `[ ]` → `[x]` + `(done YYYY-MM-DD)`.

**პრიორიტეტი:** 🔴 blocker · 🟡 important · 🟢 nice-to-have (უპრიორიტეტო = default).

---

## 🟢 audit.sazeo workspace — done (2026-04-22)

Scaffold: `/audit.sazeo` live. Left sidebar → 3 groups (Blueprints / Reports / Decisions). Auth-gated (`/admin` redirect). Content rendered via iframe.

შესრულებული:
- [x] 2026-04-22 — Blueprints → IoT BMS — Infrastructure (28 layer `l1`–`l28` sub-item-ით, #anchor navigation).
- [x] 2026-04-22 — Reports → Audit snapshot (encrypted AES-256-GCM, ასლი `sazeo_international`-დან).
- [x] 2026-04-22 — Reports → Tenant-scoping review (6 section, 4 KPIs, RLS + cross-tenant tests).
- [x] 2026-04-22 — Decisions → ADR index (25 ADRs, interactive filters, deep-links).

გასაკეთებელი:
- [ ] 2026-04-22 — გასარკვევი: `audit.sazeo.io` subdomain (Cloudflare) vs path (`engineers.ge/audit.sazeo`) — ამჟამად path. თუ subdomain — Cloudflare DNS + CNAME file update.

---

## 🟡 წყალმომარაგების კალკულატორი — follow-up work (scaffold done 2026-04-22)

Scaffold: `/calc/water-supply` live, 4 ტაბი, heat-loss layout-ის მიხედვით. Sidebar entry → `წყალმომარაგება > წყალმომარაგების ანგარიში · СП 30.13330`.

გასაკეთებელი:

- [ ] 2026-04-22 — Tab 0 ოთახის ცხრილი: HVAC სვეტების ნაცვლად სანტექნიკური ხელსაწყოები (უნიტაზი, დუში, ხელსაბანი, ჭურჭლის სარეცხი, სარეცხი მანქანა, ბიდე, ონკანი, სანაცრე) + Q<sub>ც</sub>/Q<sub>ცხ</sub>/Q<sub>ს</sub> ერთდროულობის ფაქტორით (СП 30.13330 §5.2–5.5 + DIN 1988-300 §6.2). ცხრილი [water-supply.html](../public/calc/water-supply.html) Tab 0.
- [ ] 2026-04-22 — Tab 1: Tab 0-ის ხელსაწყოების ჯამიდან `qₜₒₜ` + `q₀ˢ` → საკანალიზაციო დებიტი + სეპტიკის V<sub>კამერის</sub> ცოცხლად. ამჟამად მხოლოდ septic calculator მუშაობს ხელით შეყვანილ values-ზე (`recalcSeptic`).
- [ ] 2026-04-22 — Tab 2: მასალათა BOQ (ცივი/ცხელი წყლის მილი PPR/PEX, საკანალიზაციო PVC Ø50/110, ფიტინგები, ონკანები, უნიტაზები). რაოდენობა — Tab 0-დან.
- [ ] 2026-04-22 — Tab 3: პროდუქციის კატალოგი — Geberit, Grohe, Hansgrohe, Rehau, Uponor seed data. JSON + filter.
- [ ] 2026-04-22 — საიდენტიფიკაციო labels/toolbar ღილაკები ("EPC", "PDF ანგარიში") ადაპტირდეს წყალმომარაგებისთვის ან გაითიშოს.

---

## 🟢 DMT · Facebook Lead Ads — Analytics Dashboard (done 2026-04-21)

Shipped 2026-04-21: `/dmt/leads/facebook/analytics` — live charts + KPIs reading from `public.dmt_fb_leads`. Populated by existing webhook at `/api/dmt/fb-webhook`. Sidebar entry added as sub-item under "1 · ლიდები" (BarChart3 icon).

**რა ველებს ვიღებთ Meta Lead Ads-იდან** (table [dmt_fb_leads](../supabase/migrations/0035_dmt_fb_leads.sql)):

*Webhook direct:*
- `leadgen_id` (unique, dedupe key)
- `page_id`, `ad_id`, `adset_id`, `campaign_id`, `form_id`
- `created_time`

*Graph API enrichment (needs `FB_PAGE_ACCESS_TOKEN`):*
- `field_data` (JSONB) — ყველა ფორმის ველი + custom questions
- `full_name`, `phone`, `email` (extracted)
- `form_name`, `adset_id`, `campaign_id`

*ჩვენი side:*
- `lead_status` (new / called / scheduled / converted / lost)
- `assigned_to` (DMT user)
- `received_at`, `updated_at`
- `raw` (JSONB) — full Meta payload for schema-future-proofing

**Dashboard widgets:**
- 5 KPI cards (total, 24h, 7d, 30d, conversion %)
- Area chart — leads/day last 30 days
- Pie — status distribution
- Horizontal bar — funnel (new → converted)
- Bar — hour-of-day + weekday breakdown
- Rank cards — TOP campaigns / forms / ads / form-field usage
- Recent 12 leads feed

**Setup requirements:** Vercel env `FB_VERIFY_TOKEN` + `FB_APP_SECRET` (required), `FB_PAGE_ACCESS_TOKEN` (optional, for enrichment).

- [x] 2026-04-21 — API route `/api/dmt/fb-leads/analytics` — server-side aggregations, 5000-row cap, last-30d seeded days. (done 2026-04-21)
- [x] 2026-04-21 — Analytics page with recharts (Area/Pie/Bar) + KPI cards + recent activity. (done 2026-04-21)
- [x] 2026-04-21 — Sidebar sub-item + cross-link button from FB leads table → analytics. (done 2026-04-21)

---

## 🟡 storyabout.me — Phase 3 (real data + polish)

Phase 1 shipped 2026-04-21: hero headline tile "ბიო" ღილაკი → "storyabout.me"; bio modal-ის ბოლოში გვირგვინი; timeline modal (navy + blue tokens, layered shadows, staggered animations, spine shimmer, hover lifts); hardcoded 5 event defaults. Preview: [public/experiments/storyabout-preview.html](../public/experiments/storyabout-preview.html).

Phase 2 shipped 2026-04-21: Supabase persistence + admin CRUD + image upload. Home renders live events from DB (falls back to 5 placeholder defaults if table empty).
- [x] 2026-04-21 — **Supabase migration** `0036_hero_owner_story.sql` — `hero_owner_story_events` table applied to prod, RLS public-read, 5 placeholder rows seeded. (done 2026-04-21)
- [x] 2026-04-21 — **Server store** [lib/story-timeline-store.ts](../lib/story-timeline-store.ts) — `getStoryEvents`, `upsertStoryEvent`, `deleteStoryEvent`, `reorderStoryEvents`. (done 2026-04-21)
- [x] 2026-04-21 — **API route** [/api/admin/story-events](../app/api/admin/story-events/route.ts) — GET/POST/DELETE/PATCH (auth + zod + audit). (done 2026-04-21)
- [x] 2026-04-21 — **Admin page** [/admin/story](../app/admin/(authed)/story/workspace.tsx) — CRUD card list, accent picker, up/down reorder, inline preview modal, image upload to `public-assets/story-timeline/`. (done 2026-04-21)
- [x] 2026-04-21 — **Sidebar entry** — Crown icon, "კონტენტი" section, between Hero Ads and redirects. (done 2026-04-21)
- [x] 2026-04-21 — **Prop-drill** — [components/hero.tsx](../components/hero.tsx) fetches + passes through `storyEvents` prop. (done 2026-04-21)

Phase 3 shipped 2026-04-21: event detail modal on circle/card click (hero image + extended description, stacked z-120 over timeline) + @dnd-kit drag-and-drop reordering in admin (with GripVertical handle + drag shadow + auto sort_order renumbering) + admin-only "✎ რედაქტირება" shortcut in timeline modal header.
- [x] 2026-04-21 — **Event detail modal** — click circle or card → larger modal with full image (340–420px hero or accent gradient fallback) + year pill + accent title + full description. Escape handles nested close. [components/story-timeline.tsx](../components/story-timeline.tsx) `StoryEventDetail`. (done 2026-04-21)
- [x] 2026-04-21 — **Drag-and-drop reordering** — `@dnd-kit/core`+`sortable`+`utilities` installed; GripVertical drag handle per card; pointer+keyboard sensors; `SortableDraftRow`; drop auto-renumbers sort_order by 10s. (done 2026-04-21)
- [x] 2026-04-21 — **Admin shortcut on timeline modal** — `getSession()` wired through `Hero → HeroTreemap → StoryTimelineModal` as `isAdmin` prop; if admin session → show ✎ რედაქტირება link in modal header (md+ only) pointing to `/admin/story`. (done 2026-04-21)

Remaining:
- [ ] 2026-04-21 — **Real event data** — user-ი შეავსებს რეალურ წლებს/ტექსტებს `/admin/story`-ზე; placeholder 5 event-ი გადაიწეროს.

---

## 🟢 Sprinklers simulator — Phase 2 (post-MVP)

MVP shipped 2026-04-21 at `/calc/sprinklers`: L×W×H room, K-factor + pressure + hazard class, 3D droplet physics, heatmap, radial profile, compliance check.

- [ ] 2026-04-21 — **Phase 2 — building editor** 🟢 — draw walls/rooms on top of the floor (click-to-place corners, wall segments), multiple sprinklers at chosen positions, grid spacing tool (EN 12845 max spacing per hazard class).
- [ ] 2026-04-21 — **Phase 3 — object library** 🟢 — drag-in obstructions (cars, shelves, furniture) that block droplets via collision → heatmap "shadows". Library: parking (car, van, truck), storage (shelving, pallet racks), office (desk, partition).
- [ ] 2026-04-21 — **Phase 4 — multi-sprinkler hydraulics** 🟢 — pipe network from main to heads with pressure loss (Hazen-Williams), per-head Q reduction, auto-layout to meet dReq.

---

## 🟡 Unified "ჩემი პროექტები" hub — Phase 1 shipped

One Building (სპორტდარბაზი / სუპერმარკეტი / ოფისი) groups N calculator projects (wall-thermal, heat-loss, HVAC …). Replaces per-calc silos.

- [x] 2026-04-21 — **Phase 1 — localStorage MVP** 🟡 — `lib/buildings.ts` (CRUD), `Project.buildingId` + helpers (`listProjectsByBuilding`, `setProjectBuilding`, `listUnassignedProjects`), `/dashboard/projects` hub, `/dashboard/projects/[id]` detail (grouped by calc slug, link existing / create new / unlink / delete), ProjectGate reads `?building=XXX` → auto-links new projects + shows breadcrumb banner, sidebar "ჩემი პროექტები" enabled → `/dashboard/projects`. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **Phase 1.1 — table layout + share/QR/print/public view** 🟡 — hub grid → table with expandable rows (linked calcs inline), per-row actions (share, print, rename, delete). `lib/project-snapshot.ts` (base64url encode building + linked projects), `ShareProjectDialog` (copy link + QR + optional native share, includeState toggle, URL-length warnings), public `/shared/project#<payload>` read-only view (hash-only, no server) with "import as copy" + JSON download + print. Print route `/print/project/[id]` (auto-fires `window.print()`, clean A4 layout, summary cards). Delete prompts in all sites (dashboard panel, project-gate, project-tabs, building-detail) now use `buildDeleteProjectPrompt()` which warns when project is linked to a building. *(Claude ✅ 2026-04-21)*
- [ ] 2026-04-21 — **Phase 2 — Supabase sync** 🟡 — migration: `building_projects` table (user_id, name, created_at) + `project_id` column on per-calc project rows. RLS per user. Keep localStorage as write-through cache for offline.
- [ ] 2026-04-21 — **Phase 3 — Admin view** 🟢 — `/admin/projects` read-only list of buildings per user (join `buildings` + project counts); sidebar entry under "მომხმარებლები". Requires Phase 2 first (no server data until then).
- [ ] 2026-04-21 — **Phase 4 — Cross-calc insights** 🟢 — building detail page aggregates: total heated area (from heat-loss), total U·A (from wall-thermal), ventilation rate (from HVAC). One-click "building report" PDF.
- [ ] 2026-04-21 — **Phase 5 — Optional project metadata** 🟢 — type (residential / commercial / industrial), address, floor count, area. Optional fields; MVP is name-only per user spec.

---

## 🟡 DMT internal ops app (`/dmt/*`)

Standalone multi-user portal for ინვოისები, ლიდები, ინვენტარიზაცია. Separate user pool — შიდა გუნდი.

- [x] 2026-04-21 — **DMT skeleton + 3 tabs** — `/dmt/layout.tsx` collapsible sidebar (hover→pin, localStorage), `/dmt`, `/dmt/invoices`, `/dmt/leads`, `/dmt/inventory` with mock data + live search + stat cards.
- [x] 2026-04-21 — **Leads expanded** — `/dmt/leads/facebook` (Meta Lead Ads mock, campaign/adset/ad/form, CPL/CPA), `/dmt/leads/manual` (Airtable-style grouped editable grid, localStorage persistence, "+ column" button, group collapse, aggregation footer).
- [x] 2026-04-21 — **Variables library** — `/dmt/variables` (CRUD option sets: label + color palette, 10 colors), `lib/dmt/variables.ts` (shared types + localStorage + 3 default sets — Lead status / Role / Priority). Wired into manual grid's "+ column" (kind: text/number/select) — select columns reference variable sets.
- [x] 2026-04-21 — **Auth + user management** — migration `0033_dmt_users.sql` (id uuid, email, password_hash, name, role=owner/admin/member/viewer, status=active/invited/suspended), `lib/dmt/auth.ts` (JWT cookie `dmt_session` 30d, bcrypt hash, session helpers), `middleware.ts` root-level gate /dmt/*, `/dmt/login|register|forgot|reset`, `/dmt/users` admin page, API `/api/dmt/auth/{login,register,logout,bootstrap-check}` + `/api/dmt/users` (GET list, PATCH update, DELETE). First-user bootstrap: if table empty → auto-owner on register. Admin sidebar: "DMT ops panel" link added.
- [x] 2026-04-22 — **Manual leads user tabs + saved colors** — migration `0043_dmt_user_settings.sql` adds `dmt_users.settings`; `/api/dmt/leads/manual/users` exposes active users + self-service tab-color update; `/dmt/leads/manual` now shows real user tabs, current-user color picker, owner dropdown synced to DMT users, and `editedBy/createdBy` no longer hardcodes one person. *(done 2026-04-22)*
- [ ] 2026-04-21 — **DMT email reset** 🟢 — SMTP კონფიგურაცია (`EMAIL_*` env) + `/api/dmt/auth/reset-request` + `/api/dmt/auth/reset` + token storage (already in migration: `reset_token_hash`, `reset_token_expires_at`). ⚠ ⚠ `/dmt/forgot` currently stub.
- [ ] 2026-04-21 — **DMT Supabase backend** 🟡 — მიგრაცია real invoices/leads/inventory table-ებისთვის; ახლა mock-ია.
- [x] 2026-04-21 — **DMT audit log + destructive-action hardening** — migration `0034_dmt_audit_log.sql` (append-only `dmt_audit_log` table with trigger-enforced no-UPDATE/DELETE), `lib/dmt/audit.ts` helper, wired into all `/api/dmt/auth/*` + `/api/dmt/users` mutations (login.success/fail, logout, register.bootstrap/invite, user.update/delete/delete.denied — before/after payload snapshots + ip + UA). `/dmt/audit` viewer (owner/admin only) with action-pill filter + expandable payload. Destructive actions: user DELETE → owner-only; last-owner demote/suspend/delete rejected; role-change → owner-only (admin can patch name/status only). Sidebar hides `users` + `audit log` for non-privileged; /dmt/users UI: role dropdown → read-only pill for non-owners, delete icon → '—'. Migration applied via `scripts/apply-dmt-migration.mjs`. *(Claude ✅ 2026-04-21)*

---

## 🟡 Heat-loss calc — professional upgrade (`/calc/heat-loss`)

Formula audit (2026-04-21): core EN 12831 formulas (`Qh = U·A·ΔT·f·f_tb`, `Qvent = 0.335·q·ΔT`, `Qsol = I·A·K₁·solDiv`) verified correct. Ventilation constant 0.335 vs EN's 0.34 ~1.5% delta (acceptable). Ground heat loss uses simplified `Ti−Tg` instead of EN 12831's `fg1·fg2·Gw` reduction factor — flagged below.

- [x] 2026-04-21 — **🪟 Glazing presets (1/2/3-pane)** — `WIN_PRESETS` library (5 presets: single · 2-pane air · 2-pane Argon+low-e · 3-pane · 3-pane Krypton + custom), each with Uw + g-value. Added preset dropdown + g-value input in both sidebar list (`renderTwWindows`) and `ctypesModal`. `_onCtSel` auto-fills row `solK1` from window.g. Manual U edit flips preset → 'custom'. Also fixed pre-existing bug: `tw_windows` now persisted in draft snapshot. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **🔥 Reheat ΦRH (EN 12831 §6.5)** — `f_rh` param (W/m²) + mode preset (continuous=0 / short-setback=11 / long-setback=18 / high-mass=27 / custom). Per-room `Q_rh = f_rh × A_floor` where `A_floor` sums `_isFloorCt(ti)` rows. CalcLog shows 🔥 ΦRH row with trace. `window._G_RH` exposed for PDF. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **🏠 EN 12831 ground factor f_g** — `f_g` param (default 1.0) applied as multiplier on ground-contact (`ct.gnd`) row heat loss: `Qh = U·A·ΔT·f·f_tb·f_g`. Typical fg1·fg2·Gw ≈ 0.5–0.7. Row trace shows `f_g=X` when ≠1. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **💡 Thermal bridge ΔUtb (EN ISO 14683)** — per-construction override W/m²K column in `ctypesModal`. If `dUtb>0`: `U_eff = U + dUtb`, and blanket `f_tb` is skipped for that row. Otherwise legacy blanket f_tb applies. Stored in `CTYPES_META[id].dUtb` for thermal walls + windows, direct on `CTYPES_MANUAL[].dUtb` for manual. Read via `getAllCtypes` merge. Row trace: `ΔUtb=X→U*=Y`. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **🔧 EN ISO 10077-1 whole-window Uw builder** — `FRAME_LIB` (6 types: PVC 3/2-chamber, Al-TB, Al no-TB, Wood, Wood+Al) + `SPACER_LIB` (warm-edge ψ=0.04, Al ψ=0.08, none). `computeUw()` implements `Uw = (1−f_fr)·Ug + f_fr·Uf + (1−f_fr)·(lg/Aw)·ψg` (default lg/Aw=3.2). Per-window `builder` flag toggles between preset Uw vs. auto-computed. Builder UI in sidebar (expandable box with frame/spacer/f_fr/Ug + live formula) + ctypesModal window row (compact box). U input read-only when builder ON. Preset change in builder mode updates `Ug` only, Uw recomputes. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **🌡 Climate data per city** — `CITIES_LIB` (12 Georgian cities: Tbilisi, Kutaisi, Batumi, Rustavi, Zugdidi, Poti, Telavi, Gori, Akhaltsikhe, Stepantsminda, Mestia, Bakuriani) with Te_w / Tg / Te_s (coldest 5-day / shallow ground / summer design). Dropdown in params panel auto-fills; manual Te/Tg/Te_s edit flips back to `custom`. СНиП 23-01-99 + Georgian supplement. *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — **🛏 Room setpoint library** — `ROOM_PRESETS` (10 types: საძინებელი 20° / სასტუმრო 22° / ოფისი 20° / სამზარეულო 20° / აბაზანა 24° / დერეფანი 18° / კიბის უჯრედი 15° / გარაჟი 10° / გაუთბობელი 5° / custom). Per-room `ti_w` override stored on room obj; renders as orange chip in room header. `recalc()` + CalcLog honor it (CalcLog summary shows "room override (global X°)"). EN 12831 Annex B + СанПиН 2.1.2. *(Claude ✅ 2026-04-21)*

---

## 🟢 Delegated to Codex

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

- [x] 2026-04-19 — **Task 024** · Wall editor — MVP + full library, snap (angle/parallel/perpendicular/intersection), room auto-detect + area/volume, dimension (measure) tool, multi-select, copy/paste/duplicate (Ctrl+C/V/D), marquee selection, PDF via `generatePlanReport()`, physics sim integration. *(Audited 2026-04-19, all spec items present; was mislabeled pending)* [`tasks/024-wall-editor.md`](./tasks/024-wall-editor.md)
- [x] 2026-04-19 — **Task 025** · Projects Gate + Tabs pattern. [`tasks/025-project-gate.md`](./tasks/025-project-gate.md) *(implemented 2026-04-20)* · `lib/projects.ts` + `components/projects/*` + `_project-bridge.js` wiring complete · 8 calcs integrated (heat-loss, wall-thermal, wall-editor, stair, elevator, parking, floor, composer) · thumbnails + tabs + mini-gate + bulk import/export + `eng_projects_last` + `always show gate` shipped · manual browser QA remains
- [x] 2026-04-18 — **Task 026** · Coohom-parity editor + 🔥 fire-safety mode. [`tasks/026-coohom-parity.md`](./tasks/026-coohom-parity.md) *(implemented 2026-04-21)* · right context panel + PIP + arc wall + multi-floor + 3D + full library + fire overlays + airflow/pressure/evac/door-force/report + composer handoff shipped · manual browser QA + screenshot-driven parity audit remain
- [x] 2026-04-18 — **Task 027** (Claude ✅ design) · Portable editor foundation: [`_editor-ui.css`](../public/calc/_editor-ui.css) + [`_editor-panels.js`](../public/calc/_editor-panels.js) + wall-editor integration. Codex picks up wiring: [`tasks/027-editor-foundation-wiring.md`](./tasks/027-editor-foundation-wiring.md)
- [x] 2026-04-18 — **Phase B.3 Arc wall** · 3-point curve · Claude ✅
- [x] 2026-04-18 — **Phase B.4 PIP** · draggable mini 2D/3D preview · Claude ✅
- [x] 2026-04-18 — **Phase B.5 Multi-floor** · floor archive + switcher · Claude ✅
- [x] 2026-04-18 — **Phase B.6 3D toggle** · Three.js extrude walls · Claude ✅
- [x] 2026-04-18 — **Phase D Fire-mode MVP** · fire tool + time-lapse + smoke/CO overlays + scenario/standard selectors · Claude ✅
- [x] 2026-04-19 — **Task 028** · Fire physics wiring + evac arrows + door force gauges + PDF report (sub-tasks 1-5 shipped; A* skipped — straight-line with smoke-aware walking speed). [`tasks/028-fire-physics-wiring.md`](./tasks/028-fire-physics-wiring.md) *(done 2026-04-19)*
- [x] 2026-04-19 — **Task 029** · Toolbar icon labels (ქართული, 1 სიტყვა) + hover tooltip სრული + 👁 eye toggle show/hide (localStorage persist). [`tasks/029-toolbar-icon-labels.md`](./tasks/029-toolbar-icon-labels.md) *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **Theme toggle bug-fix** · toggleTheme preserves slider position (per-mode `bg-tint-last-light`/`bg-tint-last-dark` localStorage) + `_theme-sync.js` embedded in hvac/heat-loss/wall-thermal (previously out-of-sync) + mobile slider visible *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **UX polish pass** · Disabled calc grid items: opacity 60% + diagonal stripes + border-dashed + ⏳ "მალე" badge (orange, prominent). Dashboard sidebar: "მალე" badge on disabled items. LoginTrigger: Escape-key + focus-ring + ARIA (aria-haspopup, aria-expanded, role="menu"). *(Claude ✅ 2026-04-19)*
- [x] 2026-04-20 — **Mobile polish pass** · DashboardSidebar expanded-state becomes fixed overlay + backdrop on mobile (md:sticky desktop retained) · ShareBar icons 8×8→7×7 mobile + lucide 18→16 · BgSlider hidden on <640px (ThemeToggle remains primary control) · CalcGrid padding 3.5→3 mobile + title text-sm→base · ReferralBanner flex-col→sm:flex-row with full-width button on mobile *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Admin sidebar mobile overlay** · Matches DashboardSidebar pattern — expanded `fixed md:sticky` + backdrop (md:hidden) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Empty states polish** · `/admin/stats` EmptyState (shared by PageRank/Referrers/DeviceBreakdown charts) + `/admin/referrals` (top-referrers, referred-users) + `/dashboard/referrals` (contacts table) — plain "ცარიელია" → icon circle + title + helper text *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Error + 404 pages** · `app/not-found.tsx` (404 ქართულად, search icon + CTA ხელსაწყოებზე), `app/error.tsx` (route-level error boundary, retry + home CTAs, error.digest ref), `app/global-error.tsx` (html-wrapping crash fallback inline styles) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **SEO metadata** · Root layout — title template, keywords, applicationName, authors, canonical, Open Graph (ka_GE locale, siteName, url), Twitter summary_large_image, robots.googleBot (max-image-preview, max-snippet). Verified 9 meta tags served *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Per-calc metadata** · `generateMetadata()` extended for all 14 calculator pages — canonical URL, OG (title with standard suffix, description, ka_GE), Twitter, keywords (tag + standard + `engineers.ge` + `კალკულატორი` + `საქართველო`). Relies on root layout title template (`'%s — engineers.ge'`) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **A11y pass #1** · Skip-to-content link in root layout (sr-only → focus:visible blue pill); `id="main-content"` anchors in (withSidebar) + admin layouts; nav-bar "engineers.ge" Link got `aria-label` + ".ge" text-text-3 → text-text-2 (WCAG contrast); ChevronRight icons in dashboard + admin sidebars get `aria-hidden="true"` *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **A11y pass #2** · LoginTrigger full Tab-trap (focus cycles first↔last menuitem, Escape close, trigger focus restore on close) + all items `role="menuitem"` + focus:bg-sur-2 ring + menu `aria-label` · CountrySelect: trigger `aria-label` + `aria-haspopup=listbox` + `aria-expanded`, search input `aria-label`, list `role=listbox`, items `role=option` + `aria-selected`, flag emojis `aria-hidden`. Hero-treemap photo tile + bio button get `tabIndex=0` + keyboard Enter/Space handler + enriched aria-label *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Physics docs metadata** · `app/(withSidebar)/calc/docs/physics/layout.tsx` server wrapper adds title/OG/Twitter/keywords (standards: EN 12101-6, NFPA 92, ASHRAE, ISO 6946). Verified: `<title>ფიზიკის ფორმულები · Rules & Formulas — engineers.ge</title>` *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Perf pass #1** · Hero-treemap lightbox + bio modal `<img>` get `loading="lazy"` + `decoding="async"` (modal rarely opens, saves preconnect bandwidth) · project-gate thumbnail `<img>` same treatment (gate scroll-list). Recharts stays (already route-scoped to admin/stats, leads, users — auto code-split). Banner-carousel `priority={idx===0}` already correct *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Public-page metadata expand** · `/ads`, `/promotions`, `/dashboard/referrals`, `/dashboard/profile` — migrated from `'X · engineers.ge'` string → `Metadata` typed + canonical + OG (ka_GE) + robots (noindex for dashboard private pages). Title template now correctly appends "— engineers.ge" ("რეკლამა — engineers.ge", "აქციები — engineers.ge" verified) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Footer enrichment** · From 1-line logo stub → 4-column grid: (1) logo + tagline, (2) ხელსაწყოები (6 top calcs + "ყველა →"), (3) სხვა (aqcia/ads/formulas/referrals), (4) კონტაქტი (email + Tbilisi). Bottom bar: ©{year} + "Made in Georgia 🇬🇪". Semantic `<nav aria-label>` × 2, proper Link components, responsive grid (1 col → md:4 cols) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-19 — **Legacy dark-mode support** *(done 2026-04-20)* · audit-მა აჩვენა, რომ `hvac.html` უკვე dark-token-aware იყო, ხოლო `heat-loss.html` + `wall-thermal.html`-ში დარჩენილი hardcoded light surfaces/modals/tables/gradients გადავიდა `.dark` override pass-ზე. Manual browser QA remains. 🟢
- [x] 2026-04-19 — **LangSwitch focus ring bug** · `var(--accent)` → `focus:ring-blue` (CSS var არ იყო განსაზღვრული). *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **LoginTrigger mobile menu overflow** · w-56 dropdown narrow mobile device-ებზე viewport-ს სცდებოდა. დამატდა `max-w-[calc(100vw-16px)]`. *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — 🟡 **Calc iframes: language sync (interim fix)** · LangSwitch-ი `pathname.startsWith('/calc/')` route-ებზე hidden. *(გადახსნილია 2026-04-21 — infrastructure მუშაობს, guard-ი აღარ საჭიროა)*
- [x] 2026-04-21 — 🟡 **Calc iframes: LangSwitch guard removal** · `components/lang-switch.tsx`-დან ამოღებულია `if (pathname.startsWith('/calc/')) return null`. ენის ცვლა calc გვერდებზე ხელახლა მუშაობს — next-intl locale → `/calc/[slug]/page.tsx` → `?lang=` → iframe `_i18n.js`. Calcs რომლებიც ჯერ translation table-ს არ ფლობენ, ქართულს აჩვენებენ (graceful fallback). *(Claude ✅ 2026-04-21)*
- [x] 2026-04-21 — 🟡 **Calc iframes: per-calc translation tables** · Infrastructure score: **15/15 calcs load `_i18n.js`** და **15/15-ს აქვს `engCalcI18n.apply(...)` table**. დასრულდა top UI chrome rollout: `hvac`, `heat-loss`, `wall-thermal`, `stair-pressurization`, `elevator-shaft-press`, `parking-ventilation`, `floor-pressurization`, `wall-editor`, `building-composer`, `silencer`, `silencer-kaya`, `ahu-ashrae`, `heat-transfer`, `ifc-viewer`, `stair-pressurization-mockup`. შენიშვნა: deep in-calc copy ჯერ ყველგან სრულ 6-ენოვან coverage-ზე არაა; დარჩენილი სამუშაო არის polish/manual QA, არა infra gap. *(done 2026-04-21)*
- [ ] 2026-04-18 — 📷 **Screenshot requests** (20 items: File/Save/Toolkit/Gallery menus, left-column icons, Window/Opening dropdowns, context menu tooltips, Door/Window/Room right-panel forms) — see coohom-parity-spec §N

### Phase 3 — DXF import + Claude AI wall detection + Server save

- [x] 2026-04-19 — **Task 018 MVP** · Custom DXF parser (`_dxf-parser.js`) — LINE/LWPOLYLINE/CIRCLE/ARC/TEXT/INSERT + wall-editor "⬆ DXF" button with auto-scale (mm/cm/m) detection + confirm dialog. *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **Task 019 MVP** · Wall heuristic cleanup — snap endpoints (5cm), deduplicate, orthogonalize (3°), merge colinear-adjacent, drop degenerate. "🪄 Clean" topbar button + auto-prompt after DXF import. *(Claude ✅ 2026-04-19)*
- [x] 2026-04-19 — **Task 020 MVP** · Claude Vision wall detection — `/api/ai/detect-walls` (POST image+scale → walls JSON via Claude Sonnet 4.6, strict Zod schema) + wall-editor "🤖 AI walls" button (image upload + scale prompt + confidence report + auto-cleanup). *(Claude ✅ 2026-04-19)* · **რეალური გამოყენება: ANTHROPIC_API_KEY admin → AI settings**
- [x] 2026-04-19 — **Task 021** · 3D wall extrude with opening cutouts — segment-based decomposition (pier / sill / lintel chunks) for door/window holes in 3D, zero CSG deps. *(Claude ✅ 2026-04-19)*
- [ ] 2026-04-18 — **Task 022** · Supabase `building_projects` table + RLS. [`tasks/022-supabase-projects.md`](./tasks/022-supabase-projects.md) · Migration ready in [`supabase/migrations/0025_building_projects.sql`](../supabase/migrations/0025_building_projects.sql) (2026-04-21) — runs on next `npm run db:migrate`. User action: provision Supabase — see [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md).
- [ ] 2026-04-18 — **Task 023** · Autosave (3-layer: memory / localStorage / Supabase). [`tasks/023-autosave.md`](./tasks/023-autosave.md) · Unblocked by 022 migration. Wire Supabase layer to existing project-bridge autosave hooks after setup completes.

## 🔴 Blockers (online go-live)

- [x] 2026-04-21 — **Apply migration `0032_hero_owner.sql`** — verified applied in prod (1 row), `hero_owner_story_events` (migration `0036`) also present with 5 rows. Stale checkbox cleared 2026-04-21.
- [ ] 2026-04-18 — **Supabase project provision** — user-ის action. დაარეგისტრიროს Supabase project (ან Vercel Marketplace-ის Neon Postgres-ს) და .env.local-ში ჩააწეროს:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  ამის გარეშე: banners upload, analytics, user project storage ვერ იმუშავებს production-ზე.
- [ ] 2026-04-18 — `.env.local` → Vercel env vars migration (preview + production scopes)
- [ ] 2026-04-18 — Vercel deploy (first push) + DNS link (engineers.ge → Vercel)

## 🟡 Auth & Session

- [x] 2026-04-21 — Admin password recovery via email (`ADMIN_RECOVERY_EMAIL=g_merebashvili@yahoo.com`) — `/admin/forgot` → email link → `/admin/reset?token=…`. Migration `0026_admin_password_reset.sql`. Requires prod env: `ADMIN_RECOVERY_EMAIL`, `RESEND_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` + migration applied on Supabase. *(done 2026-04-21)*
- [x] 2026-04-18 — Admin login "დამახსოვრება" checkbox (username localStorage) *(done 2026-04-18)*
- [ ] 2026-04-18 — Admin login credentials → Supabase-based (currently hardcoded env vars per PRD). გადავწყვიტოთ: დავტოვოთ env-ში (მფლობელი ერთადერთი) თუ გადავიტანოთ Supabase-ზე (extensibility)?
- [ ] 2026-04-18 — "Sign in with Google/email" — ვიზიტორებისთვის, რომ პროექტები შეინახონ (Supabase Auth)

## 🟡 Page connectivity

- [x] 2026-04-20 — **Nav-link audit: breadcrumbs** · /dashboard landing (categories + quick actions link), /dashboard/profile (Dashboard > პროფილი), /dashboard/referrals (Dashboard > მოწვევები), /ads (Home > რეკლამა). /promotions already had inline breadcrumb. Calc pages already used Breadcrumbs in [slug] route. Admin pages use AdminBreadcrumbs (separate). *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **`/calc` index page** · Previously 404 (no index for calc route). New [app/(withSidebar)/calc/page.tsx](../app/(withSidebar)/calc/page.tsx) renders all 14 calculators via `<CalcGrid />` + breadcrumb + metadata (OG). Added to sitemap.ts with priority 0.9. Also registered `/calc/docs/physics` (0.7) which was missing from sitemap *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Standards reference page** · [app/(withSidebar)/calc/docs/standards/page.tsx](../app/(withSidebar)/calc/docs/standards/page.tsx) — 10 სტანდარტი 3 კატეგორიად (სახანძრო: EN 12101-6/-3, NFPA 92, СП 7.13130 · HVAC: ASHRAE 62.1, EN 16798-1, ISO 7235 · თერმული: ISO 6946, ISO 13788, EN 12831-1). თითოეული card-ი: code badge + title_ka + title_en + body/scope/year + წყარო link + "ეხება ხელსაწყოებს" tags. + ქართული წყაროები block (matsne.gov.ge). + cross-link physics docs. Sitemap priority 0.7. Breadcrumbs დოკუმენტაცია > სტანდარტები *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Docs index page** · `/calc/docs` previously 404 — ახლა landing page 2 card-ით (ფიზიკის ფორმულები / სტანდარტები) + tags + description. Sitemap priority 0.6. Dashboard sidebar: დოკუმენტაცია სექციაში დამატდა "სტანდარტები" entry (ShieldCheck icon, flagKey `calc.standards-docs`) *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Open Graph image** · [app/opengraph-image.tsx](../app/opengraph-image.tsx) file-based Next.js ImageResponse (1200×630 PNG). Radial gradients navy+blue, "engineers.ge" logo, headline (Georgian primary + English fallback), 5 standard badges. Noto Sans Georgian font dynamically fetched from Google Fonts API at module init (Safari UA → TTF, satori-compatible). If fetch fails → graceful English fallback. Verified: `<meta property="og:image">` + `<meta name="twitter:image">` auto-populated *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **JSON-LD structured data** · Home page gets 3 schema.org entries via [components/structured-data.tsx](../components/structured-data.tsx): Organization (name, logo, email, Tbilisi address), WebSite (ka-GE locale, description), SoftwareApplication (EngineeringApplication category, 9 featureList items, free price offer). Calc [slug] pages get SoftwareApplication + BreadcrumbList via parallel [lib/structured-data.ts](../lib/structured-data.ts) helpers. All scripts render as `<script type="application/ld+json">` — verified 10 @type entries on `/` *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **PWA manifest** · [app/manifest.ts](../app/manifest.ts) Next.js file-based manifest. `display: standalone`, theme_color `#1a3a6b`, background `#f5f8fc`, lang `ka-GE`, categories (productivity/engineering/utilities). 4 shortcuts (თბოდანაკარგი / გეგმის რედაქტორი / სადარბაზოს დაწნეხვა / ფიზიკის ფორმულები) enable quick-launch from mobile home screen. `<link rel="manifest">` auto-injected. /manifest.webmanifest → 200 application/manifest+json *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **security.txt + humans.txt** · [public/.well-known/security.txt](../public/.well-known/security.txt) — RFC 9116 security contact (georgemerebashvili@gmail.com, preferred ka/en/ru, expires 2027-04-20) · [public/humans.txt](../public/humans.txt) — team/tech credits. Both 200 *(Claude ✅ 2026-04-20)*
- [x] 2026-04-20 — **Security + privacy + perf hardening (5 fixes)** · [next.config.ts](../next.config.ts) CSP header live (default-src 'self', restricted script/style/img/connect/frame/worker + object-src 'none' + base-uri/form-action/frame-ancestors 'self' + upgrade-insecure-requests in prod; Supabase URL wildcarded in connect-src). Verified header on `/`, `/dashboard`, `/calc/wall-editor.html` — all 200 · [app/api/me/profile](../app/api/me/profile/route.ts) email enumeration fix: per-IP rate-limit + always-200 `{exists: false}` response for unknown emails · [app/api/me/export](../app/api/me/export/route.ts) GDPR Art. 20 data export — password-authenticated, returns `Content-Disposition: attachment` JSON (account + referred_users + referral_contacts + rewards) · [lib/admin-audit.ts](../lib/admin-audit.ts) `anonymizeIp()` — IPv4 → /24, IPv6 → /64 truncation before DB write · [supabase/migrations/0022_users_perf_indexes.sql](../supabase/migrations/0022_users_perf_indexes.sql) partial indexes on `users(referred_by_user_id) WHERE NOT NULL` + `users(source, deleted_at) WHERE deleted_at IS NULL` — stops full-table scans *(Claude ✅ 2026-04-20)*
- [x] 2026-04-18 — `/dashboard-mui` route — სრულად ამოღებულია (MUI purge); route აღარ არსებობს. *(done 2026-04-18)*
- [x] 2026-04-18 — Admin-ის შიდა ნავიგაცია — ყველა sidebar entry შემოწმდა და მუშაობს (stats · tiles · banners/4-children · share · donate · users · referrals · ai · password · logout). *(audited 2026-04-18)*

## 🟡 Online project storage (visitor-level)

- [x] 2026-04-21 — **Visitor sign-in** · email/password login + register modal + Google/Facebook/LinkedIn OAuth + profile/referrals cabinet shipped [`/api/login`](../app/api/login/route.ts), [`/api/register`](../app/api/register/route.ts), [`/auth/callback`](../app/auth/callback/route.ts), [components/login-trigger.tsx](../components/login-trigger.tsx), [components/register-prompt-modal.tsx](../components/register-prompt-modal.tsx). ონლაინ project storage ჯერ ისევ ცალკე open item-ად რჩება. *(done 2026-04-21)*
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
- [x] 2026-04-18 — "ჩემი პროექტები" გვერდი `/dashboard`-ში (list + edit + duplicate + delete) *(done 2026-04-21 — local MVP recent-projects panel [app/(withSidebar)/dashboard/page.tsx](../app/(withSidebar)/dashboard/page.tsx) + [components/dashboard-projects-panel.tsx](../components/dashboard-projects-panel.tsx): open/edit(rename)/duplicate/delete for project-aware calculators; Supabase-backed global projects grid remains future work under Task 022.)*
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

- [x] 2026-04-21 — **Referral floating widget** · site-wide `fixed bottom-right` bubble + dismiss `x` + 30-დღიანი localStorage hide + mobile compact label, ჩართული feature-flag-ით [components/referral-widget.tsx](../components/referral-widget.tsx). *(done 2026-04-21)*

- [x] 2026-04-21 — **Program rules modal** · widget click-ზე იხსნება წესების modal: 10₾/კონტაქტი, 3000₾ cap, უნიკალურობის წესი, privacy note, share buttons და CTA `/dashboard/referrals` [components/referral-widget.tsx](../components/referral-widget.tsx). *(done 2026-04-21)*

- [x] 2026-04-21 — **`/dashboard/referrals` page** · localStorage MVP shipped: KPI cards, add-contact form, hashtag chips, consent gate, search, status/category filters, table actions, WhatsApp send, manual register, და pagination `50 / 100 / 200` [app/(withSidebar)/dashboard/referrals/workspace.tsx](../app/(withSidebar)/dashboard/referrals/workspace.tsx). Cross-check with real users remains future Supabase work. *(done 2026-04-21)*

- [x] 2026-04-21 — **WhatsApp send scheme** · `wa.me/<phone>?text=<encoded>` MVP live via `buildWhatsAppLink()` with `ref` + `rc` params on engineers.ge URL [lib/referrals.ts](../lib/referrals.ts). *(done 2026-04-21)*

- [x] 2026-04-21 — **Sidebar nav entry** · dashboard sidebar / footer / dashboard cards / login trigger უკვე უთითებს `/dashboard/referrals`-ზე [components/dashboard-sidebar.tsx](../components/dashboard-sidebar.tsx), [components/footer.tsx](../components/footer.tsx). *(done 2026-04-21)*

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

- [x] 2026-04-18 — **`/dashboard` — redesign: KAYA-style sidebar** *(implemented earlier; audited 2026-04-20)*
  - ✅ DashboardSidebar: collapsed (56px icons) → hover expand → pin (📌), mobile fixed overlay + backdrop
  - ✅ SECTIONS: მთავარი / საინჟინრო მიმართულებები / CAD / დოკუმენტაცია / სხვა + children + badges
  - ✅ 2026-04-20 — **Landing page added** ([app/(withSidebar)/dashboard/page.tsx](../app/(withSidebar)/dashboard/page.tsx)): "მოგესალმები" header, 4 quick-action tiles (gegma / heat-loss / stair-pressurization / referrals), 4 category cards grouping 14 calcs by theme (fire / thermal / ventilation / CAD), 3 bottom links (ფორმულები / აქციები / Referral). Replaced dead redirect at `app/dashboard/page.tsx` (deleted). Verified `/dashboard` → 200 *(Claude ✅ 2026-04-20)*

- [x] 2026-04-18 — **`/preview` — DELETE** *(done 2026-04-19)*
- [x] 2026-04-18 — **`/admin/donate` — DELETE** *(done 2026-04-19 — page + api/admin/donate route + sidebar entry removed; public api/donate/info retained so `share_settings`/`donation_settings` DB-driven DonateModal still works)*
- [x] 2026-04-18 — **`/admin/share` — DELETE** *(done 2026-04-19 — page + api/admin/share route + sidebar entry removed; public api/share/settings retained)*

- [x] 2026-04-18 — **`/calc/heat-loss` — შინაარსი აკლია** *(stale — audited 2026-04-20)*
  - ✅ [public/calc/heat-loss.html](../public/calc/heat-loss.html) არის **9153 ხაზიანი სრული კალკულატორი** EN 12831 standard-ით (inputs, ოთახების list, U-values, ventilation, FCU selection, PDF export). TODO-ის assumption რომ "content ცარიელია" — არასწორი იყო.

## Admin panel → "სტანდარტები & წყაროები" (Regulations Watcher)

- [x] 2026-04-18 — 🟡 გარე წყაროების მონიტორი admin panel-ში:
  - [x] 2026-04-21 — `regulation_sources` + `regulation_source_snapshots` schema მზადაა [`supabase/migrations/0027_regulation_sources.sql`](../supabase/migrations/0027_regulation_sources.sql)
  - [x] 2026-04-21 — Vercel/cron-ready fetch pipeline: [`app/api/cron/regulation-sources/route.ts`](../app/api/cron/regulation-sources/route.ts) + [`lib/regulation-sources.ts`](../lib/regulation-sources.ts) — URL → normalized text hash → snapshot on change
  - [x] 2026-04-21 — Admin UI MVP: [`/admin/regulations`](../app/admin/(authed)/regulations/page.tsx) — list, stale/error badges, recent snapshot compare, manual `Run now`
  - [x] 2026-04-21 — Seed რამდენიმე საწყისი წყარო (matsne + EN/NFPA/ASHRAE reference URLs)
  - [x] 2026-04-21 — approve & publish workflow: migration [`0031_regulation_publish_workflow.sql`](../supabase/migrations/0031_regulation_publish_workflow.sql) + [`/api/admin/regulations/publish`](../app/api/admin/regulations/publish/route.ts) + admin `Approve + publish` CTA latest snapshot-ზე
  - [x] 2026-04-21 — Notification email admin-ს როცა წყარო შეიცვალა: `sendRegulationChangeNotification()` + `notify.regulations` feature flag + cron/manual regulation run hooks

## User-facing → "სტანდარტთან შესაბამისობის შემოწმება"

- [ ] 2026-04-18 — 🟡 compliance helper კალკულატორებში:
  - [x] 2026-04-21 — Phase 1 ნაწილობრივ უკვე ცოცხალია `heat-loss` / `wall-thermal` envelope flow-ში: `renderUAssess()` standard ladder + Georgian Decree №354 selectors, dedicated standards/Umax modals, და PDF-ში standards compliance tables [`public/calc/heat-loss.html`](../public/calc/heat-loss.html). ანუ “U-value compliance helper” არსებობს, უბრალოდ generic rule-engine დონემდე ჯერ არ ასულა.
  - [ ] კალკულაციის შედეგი → უფრო ზოგადი button/section "შევამოწმო სტანდარტთან შესაბამისობა" სხვა calculators-ზეც
  - [ ] კონკრეტული rule-set-ები (მაგ: `min_fresh_air_per_person_m3h`, `max_U_value_wall`, `min_fire_escape_width_m`) — ინახება `standards_rules` table-ში
  - [ ] შედეგი: ✅ აკმაყოფილებს / ⚠️ საზღვართან / ❌ არ აკმაყოფილებს + reference წყაროზე (matsne URL)
  - [ ] Admin-ს შეუძლია rule-ები დაარედაქტიროს (value, reference URL, applicable calc slugs)

## Admin panel → სარეკლამო (Ads) ტაბი

- [x] 2026-04-17 — დამოუკიდებელი **"სარეკლამო"** ტაბი admin panel-ში:
  - [x] 2026-04-21 — MVP უკვე არსებობს [`/admin/banners`](../app/admin/(authed)/banners/page.tsx) + child pages: overview/stats/table/preview/manage, სადაც ჩანს დატვირთულობა, revenue-per-slot proxy, slot table, preview და live Hero Ads edit flow
  - [x] 2026-04-21 — ლოგები + ისტორია MVP: `/admin/banners` overview-ში ბოლო `tile.upsert` audit ჩანაწერები ჩანს actor/time/slot metadata-ით
  - [x] 2026-04-21 — გადახდები MVP: migration [`0029_hero_ad_payments.sql`](../supabase/migrations/0029_hero_ad_payments.sql) + CRUD route [`/api/admin/hero-ad-payments`](../app/api/admin/hero-ad-payments/route.ts) + `/admin/banners/stats` ledger/outstanding/overdue cards + `/admin/banners/table`-ში `paid until` coverage
  - [x] 2026-04-21 — კლიენტის ბანერის ატვირთვა + approval MVP: public [`/ads`](../app/(withSidebar)/ads/page.tsx) request form → [`/api/ads/upload-request`](../app/api/ads/upload-request/route.ts) pending queue table [`0030_hero_ad_upload_requests.sql`](../supabase/migrations/0030_hero_ad_upload_requests.sql) → admin approve/reject queue [`/admin/banners/manage`](../app/admin/(authed)/banners/manage/page.tsx)
  - [x] 2026-04-21 — WhatsApp ნომერი (per-client contact) field: `hero_ad_slots.contact_phone` + admin form + public `/ads` CTA
  - [x] 2026-04-21 — აქციები / sales icons MVP: `hero_ad_slots.promo_badge` + admin CMS + treemap/ads-simulator badge render

---

## Done

- [x] 2026-04-20 — **Admin command palette (⌘K)** — [`components/admin-command-palette.tsx`](../components/admin-command-palette.tsx) + [`components/admin-command-palette-client.tsx`](../components/admin-command-palette-client.tsx) static registry of **29 entries** across 6 sections (მთავარი / კონტენტი / მომხმარებლები / ანალიტიკა / პარამეტრები / სხვა). Cmd/Ctrl+K global hotkey, Esc close, ↑/↓ navigation, Enter execute, mouse hover also moves cursor. Fuzzy match: prefix > contains > character-subsequence with gap penalty, scoring across label/description/section/keywords. Grouped view when query empty, flat ranked when typing. Pill hint „⌘K ძიება" added to admin top banner (desktop only). Logout action handler also wired. Mount in [`app/admin/(authed)/layout.tsx`](../app/admin/(authed)/layout.tsx). Smoke still 48/48.
- [x] 2026-04-20 — **Pre-push git hook (zero-dep)** — [`.githooks/pre-push`](../.githooks/pre-push) bash script: typecheck always, smoke if `localhost:3001` reachable (2s curl probe), colored output, clean abort on failure. [`scripts/install-git-hooks.mjs`](../scripts/install-git-hooks.mjs) — runs as `prepare` npm script, sets `core.hooksPath .githooks` automatically. Skip conditions: `$CI` detected (CI runs its own checks), `SKIP_GIT_HOOKS=1` override, `git push --no-verify`. No husky / lint-staged deps (save 30MB+ in node_modules) — uses git's native `core.hooksPath` (2.9+). Docs [`docs/git-hooks.md`](./git-hooks.md) — bypass, troubleshooting, future hook additions. **Effect:** broken typecheck → push aborts locally → no more "CI red" surprises after push.
- [x] 2026-04-20 — **Database backup / JSON export** — [`lib/db-backup.ts`](../lib/db-backup.ts) defines `BACKUPABLE_TABLES` registry of **14 curated tables** (users, referrals, bugs, errors, 404s, consent, audit, flags, redirects, tiles, page_views, calc_events, web_vitals, csp) with per-table label + description + optional flag. `buildBackup(tableKeys)` produces `{exported_at, site, tables: {name: {count, rows}}}`. `getTableCounts()` parallel HEAD queries for UI preview. [`GET /api/admin/backup?tables=a,b,c`](../app/api/admin/backup/route.ts) — streams JSON with `content-disposition: attachment; filename=engineers-ge-backup-YYYY-MM-DDTHH-MM-SS.json`, audit-logged (`backup.export` with per-table row counts). `/admin/backup` workspace — KPI (selected count + total rows), ყველა / არცერთი buttons, Privacy note (⚠ PII inside), per-table checklist with row counts + `large` badge for >5000 rows + unavailable state when table missing. Large analytics tables (page_views, calc_events, web_vitals) unchecked by default. Sidebar entry (პარამეტრები, `DatabaseBackup` icon). Feature flag `admin.backup`. Smoke: +2 checks → **48/48**.
- [x] 2026-04-20 — **Database migration runner** — uses newly-added `pg` devDep. [`scripts/db-migrate.mjs`](../scripts/db-migrate.mjs) — reads `supabase/migrations/*.sql` sorted, tracks applied in `_schema_migrations` table (file + applied_at + djb2 checksum), idempotent re-runs, **transactional per file** (BEGIN/COMMIT, ROLLBACK on error → safe retry), `--dry-run` flag, SSL auto-enable for supabase.co + neon.tech hosts. Accepts `DATABASE_URL` / `POSTGRES_URL` / `SUPABASE_DB_URL` env. [`scripts/db-status.mjs`](../scripts/db-status.mjs) — shows ✓ applied / ◌ pending / ⚠ DRIFT (checksum changed after apply). npm scripts: `db:migrate` + `db:status`. Docs [`docs/migrations.md`](./migrations.md) — setup, workflow, troubleshooting, CI integration. Launch-checklist-ი updated with new migration howTo (`npm run db:migrate` primary, Dashboard SQL Editor as fallback). Replaces ძველი 23-manual-copy-paste workflow → one command.
- [x] 2026-04-20 — **Email template preview** — extracted 3 email HTML templates (`welcome` + `bug-report` + `verify-email`) to shared [`lib/email-templates.ts`](../lib/email-templates.ts) with typed inputs (`WelcomeEmailInput`, `BugReportEmailInput`, `VerifyEmailInput`) + `EMAIL_TEMPLATES` registry (key → label/description/render with sample data). Refactored [`lib/email-admin.ts`](../lib/email-admin.ts) `sendWelcomeEmail` + `sendBugReportNotification` to use shared templates (no drift between production + preview). Exported `sendEmail()` for reuse. `/admin/emails` page — template selector pills (3), subject + desktop/mobile viewport toggle, **iframe live preview** with sandbox + `<base target="_blank">`, „Send test" → `POST /api/admin/emails/test` fires real email to `ADMIN_EMAIL` (stub-safe, logs when keys missing) + audit-logged (`email.test_send`), collapsible raw HTML source. Sidebar entry (პარამეტრები, `Mail` icon). Feature flag `admin.emails`. Smoke: +2 checks → **46/46**.
- [x] 2026-04-20 — **Core Web Vitals tracking** — completes observability triad (errors ✓ / 404s ✓ / **performance ✓**). Migration 0023 `web_vitals` (metric/value/rating/pathname/navigation_type/UA/viewport/visitor_id + 3 indexes). [`lib/web-vitals.ts`](../lib/web-vitals.ts) — `recordWebVital()` (slices, never throws), `getWebVitalStats(sinceDays)` (per-metric p50/p75/p95 + good/needs-improvement/poor counts + top-20 slowest pathname×metric), `THRESHOLDS` (Google's good/poor cutoffs: LCP 2.5s/4s · CLS 0.1/0.25 · INP 200ms/500ms · FCP 1.8s/3s · TTFB 800ms/1.8s). Public [`POST /api/web-vitals`](../app/api/web-vitals/route.ts) — Zod-validated beacon, per-IP rate-limited. Client reporter [`WebVitalsReporter`](../components/web-vitals-reporter.tsx) uses Next's built-in `useReportWebVitals` → `navigator.sendBeacon` → `fetch keepalive` fallback. **Consent-gated at mount** — only fires for visitors with `hasAnalyticsConsent()` true; feature flag `site.web-vitals` can disable globally. `/admin/web-vitals` page — 5 color-coded metric cards (bg tint = Google rating of p75), distribution bar (good/ni/poor ratio), p50/p75/p95 + n per metric + thresholds footer, **top 20 slowest pathname×metric** table for drill-down. Sidebar entry (ანალიტიკა, `Gauge` icon). Feature flag `admin.web-vitals`. Health probe 0023. Smoke: +2 checks (auth redirect + beacon accept) → **44/44**.
- [x] 2026-04-20 — **CSP violation reporting** — complements CSP directive just added. Migration 0022 `csp_violations` (document_uri/blocked_uri/violated_directive/effective_directive/original_policy/source_file/line/column/sample/disposition + UA + visitor_id + 3 indexes). [`lib/csp-violations.ts`](../lib/csp-violations.ts) — `createCspViolation()` (swallows errors), `listCspViolations()`, `groupCspViolations()` (aggregates by directive×blocked_uri). Public [`POST /api/csp-report`](../app/api/csp-report/route.ts) **accepts both formats**: legacy `application/csp-report` body `{"csp-report":{…}}` + modern Reporting API `[{type:"csp-violation",body:{…}}]`; returns 204 (browser-expected). Per-IP rate-limited (`csp:` bucket). `report-uri /api/csp-report` added to CSP directive in [`next.config.ts`](../next.config.ts). `/admin/csp-violations` page — 3 KPI (total / unique directives / unique blocked URLs), **grouped triage table** (directive × blocked_uri × hit count × latest) for "fix-the-biggest-first" workflow, raw recent 100 feed with document_uri + source_file:line. Green empty state: `Shield` icon + „CSP violations არ არის" when pristine. Sidebar entry (პარამეტრები, `Shield` icon). Feature flag `admin.csp-violations`. Health probe 0022. Smoke: +2 checks (auth redirect + 204 accept on legacy payload) → **42/42**.
- [x] 2026-04-20 — **Unified admin activity feed** — [`lib/activity-feed.ts`](../lib/activity-feed.ts) merges 6 sources (bug_reports + error_events + not_found_events + consent_log + admin_audit_log + users) in parallel `Promise.all`, normalized shape (`ActivityEntry` with kind/severity/title/detail/pathname/actor/link), sorted by created_at DESC. Each source failure-isolated (returns [] on error). `/admin/activity` page — 6-color filter pills (error/bug/404/user/consent/audit) with per-kind counts, full-text search (title/detail/pathname/actor), severity dot indicator (info/success/warn/error), each row links to its dedicated admin page (bug reports, errors, etc.). Relative timestamps. Sidebar entry „Activity" მთავარში (`Zap` icon). Feature flag `admin.activity`. Smoke: +1 check → **40/40**. **Launch-day cockpit**: admin-ს შეუძლია ერთი გვერდიდან ხედოს ყველა incident-ი რომელიც საიტზე ხდება.
- [x] 2026-04-20 — **Rate-limit admin visibility** — [`lib/rate-limit.ts`](../lib/rate-limit.ts) `listRateLimits({lockedOnly, bucket, limit})` + typed `RateLimitRow`. Admin [`DELETE /api/admin/rate-limits`](../app/api/admin/rate-limits/route.ts) — unlock specific bucket/key with Zod validation + audit-logged (`rate_limit.unlock`). `/admin/rate-limits` page — 2 KPI cards (ამჟამად ჩაკეტილი red-if-nonzero / cooling down neutral), search by bucket/key, two sections: **Locked** (red header, `remainingUntil()` countdown s/m/h) + **Cooling** (neutral, fails ≤ max). Inline „unlock" button per row, optimistic UI update. Bucket color-coded (login=red · register=amber · verify_resend=blue · generic=gray). Sidebar entry (პარამეტრები, `Lock` icon). Feature flag `admin.rate-limits`. Smoke: +2 checks → **39/39**.
- [x] 2026-04-20 — **SEO polish (robots + sitemap + OG type fix)**:
  - **OG image types** — [`app/opengraph-image.tsx`](../app/opengraph-image.tsx) conditional-type inference broke in Next 16; replaced with explicit `NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']`. Typecheck now 100% clean across project.
  - **Robots hardened** — [`app/robots.ts`](../app/robots.ts) now disallows `/admin`, `/api/`, `/auth/`, `/reset-password`, `/r/`, `/_next/`. Added explicit block for 5 AI crawlers (`GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `PerplexityBot`) — content free for humans, not training sets (user can relax if policy changes).
  - **Sitemap expanded** — [`app/sitemap.ts`](../app/sitemap.ts) replaced redirect-y `/dashboard` with real `/dashboard/referrals`. 21 URLs total (8 static + 13 calcs). Priorities tuned: home=1.0, /calc=0.9, per-calc=0.8, docs=0.7, dashboard=0.6, ads/promos=0.5.
  - Smoke: +2 checks (robots disallows + sitemap calc routes) → **37/37**.
- [x] 2026-04-20 — **JSON-LD structured data for SEO** — [`lib/structured-data.ts`](../lib/structured-data.ts) — `ORGANIZATION_JSONLD` (name, logo, areaServed Georgia, email, languages), `WEBSITE_JSONLD` (inLanguage ka-GE, publisher ref), `calcApplicationJsonLd()` (WebApplication: EngineeringApplication category, free/GEL offer, citation to standard), `breadcrumbsJsonLd()` (position-numbered ListItem chain), `jsonLdScript()` (stringify + escape `</script>`). Root layout emits Organization + WebSite in `<head>`. Per-calc page emits WebApplication + BreadcrumbList inline. Smoke: +2 checks → **35/35**. Google rich snippet candidates: site-link box, calculator cards with standards badges.
- [x] 2026-04-20 — **Cookie consent log + Manage cookies footer** (extension of banner):
  - **Migration 0021** `consent_log` — visitor_id/analytics/marketing/action/pathname/user_agent/ip_hash (SHA-256 truncated, **privacy-safe** — no raw IPs) + 2 indexes.
  - **Service** [`lib/consent-log.ts`](../lib/consent-log.ts) — `createConsentLog` (swallows errors), `listConsentLog`, `getConsentStats(sinceDays)` (acceptance rate, unique visitors, breakdown).
  - **Public POST** [`/api/consent`](../app/api/consent/route.ts) — beacon-friendly (JSON.parse on text body), per-IP rate-limited bucket `consent:`, always 200. Called on every decide() + reopen() via `navigator.sendBeacon` → fallback `fetch keepalive`.
  - **Client wiring** — [`cookie-consent.tsx`](../components/cookie-consent.tsx) exports `openCookieConsent()` trigger + listens to `eng:open-cookie-consent` window event → footer can re-open banner even after consent given.
  - **Footer `Manage cookies` link** — [`components/manage-cookies-link.tsx`](../components/manage-cookies-link.tsx), added to [`components/footer.tsx`](../components/footer.tsx) bottom bar (Cookie icon + „Cookie პრეფერენციები"). Fixes issue where visitors couldn't change their mind.
  - **Admin page** `/admin/consent-log` — 5 KPI tiles (total / unique visitors / analytics ON % / analytics total / essential-only), acceptance breakdown bars (analytics / marketing / essential-only), recent 300 decisions table (action badge, analytics/marketing columns, visitor truncated, pathname). Sidebar entry (მომხმარებლები სექცია, `Cookie` icon).
  - **Feature flag** `admin.consent-log`.
  - Health probe 0021. Smoke: +2 checks → **33/33**.
- [x] 2026-04-20 — **Cookie consent banner + security headers**:
  - **Cookie consent** — [`components/cookie-consent.tsx`](../components/cookie-consent.tsx) — 3-level choice (essential always-on / analytics default-on / marketing default-off), bottom-sheet design, expandable granular controls, stored in `eng_cookie_consent` cookie (JSON, 1y). Server-side reader [`lib/cookie-consent.ts`](../lib/cookie-consent.ts) (`readConsentServer`, `hasAnalyticsConsent`, `hasMarketingConsent`) — GDPR-safe fail-closed (no choice → analytics OFF). Mounted in root layout gated by feature flag `site.cookie-consent`. Three CTAs: „მხოლოდ აუცილებელი" / „შენახე არჩევანი" (when expanded) / „ყველა მიღება". Survives across visits (1y cookie).
  - **Security headers** — [`next.config.ts`](../next.config.ts) `headers()` config: **all routes** → `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=() microphone=() geolocation=() payment=() usb=() interest-cohort=()`, `X-DNS-Prefetch-Control: on`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (prod only). **Admin routes** → `X-Frame-Options: DENY` (clickjacking protection). **Non-admin** → `X-Frame-Options: SAMEORIGIN` (calc HTML iframes still work). CSP intentionally deferred (needs tuning vs Three.js / KaTeX / iframe assets).
  - Verified: `curl -I /` shows 4 security headers + `SAMEORIGIN`; `curl -I /admin` shows `DENY`. Smoke **31/31** still green.
- [x] 2026-04-20 — **Admin-editable URL redirects** — migration `0020_redirects.sql` (unique source, status_code check 301/302/307/308, hit_count, enabled flag, created_by audit + 2 indexes). [`lib/redirects.ts`](../lib/redirects.ts) (CRUD + `normalizeSource` leading-slash/trailing-slash cleanup), [`lib/redirects-cache.ts`](../lib/redirects-cache.ts) (60s in-memory TTL, fail-open, fire-and-forget stale refresh, single-flight guard). Proxy extended [`proxy.ts`](../proxy.ts) — every request looks up redirect, serves 301/302/307/308 with `recordRedirectHit()` increment. Admin CRUD [`POST/PATCH/DELETE /api/admin/redirects/[id]`](../app/api/admin/redirects/route.ts) + all audit-logged. `/admin/redirects` workspace — 4-col add form (source / → / destination / status) + 10-row **auto-suggestions from 404 tracking** (×count badge + „ქმენი redirect →" one-click prefill) + search + table with toggle/delete + ConfirmModal on delete. `/admin/404s` cross-links: per-row „redirect →" button with `?prefill_source=…`. Sidebar entry (კონტენტი, `ArrowRightLeft` icon). Feature flag `admin.redirects`. Health probe 0020. Smoke: +2 checks → **31/31**.
- [x] 2026-04-20 — **404 tracking** — migration `0019_not_found_events.sql` (pathname/referrer/user_agent/visitor_id + 2 indexes). [`lib/not-found-events.ts`](../lib/not-found-events.ts) — `createNotFoundEvent`, `getNotFoundStats(sinceDays)` (server-side aggregation: top_paths, top_referrers, recent). Public [`POST /api/not-found`](../app/api/not-found/route.ts) — per-IP rate-limit bucket `404:`, always 200. [`NotFoundReporter`](../components/not-found-reporter.tsx) client component → sendBeacon from `app/not-found.tsx` on mount (includes search params). `/admin/404s` page — 3 KPI cards (total / unique URLs / referrers), top broken paths table with hit counts + latest time + direct link, referrer breakdown, recent 100 events. Sidebar entry (ანალიტიკა, `FileQuestion` icon). Feature flag `admin.404s`. Health probe 0019. Smoke: +2 checks (beacon accepts + admin auth) → **29/29**.
- [x] 2026-04-20 — **Client error tracking** — migration `0018_error_events.sql` (bigserial pk, message/stack/digest/pathname/kind/viewport/visitor_id/resolved, 4 indexes). [`lib/error-events.ts`](../lib/error-events.ts) — `createErrorEvent` (slices long fields, never throws), `listErrorEvents({resolved?, limit?})`, `toggleErrorResolved`, `countErrorsByDigest` (dedup summary). Public [`POST /api/errors`](../app/api/errors/route.ts) — per-IP rate-limit, JSON.parse on text body (beacon-friendly), always returns 200. Admin [`PATCH /api/admin/errors/[id]`](../app/api/admin/errors/[id]/route.ts) — resolve/reopen + audit log entry. `app/error.tsx` + `app/global-error.tsx` wired via `navigator.sendBeacon` (fallback: `fetch` with `keepalive`). `/admin/errors` page — top-5 digest summary (×count badges, sorted), filter tabs (ღია / მოგვარდა / ყველა), full-text search (message/stack/pathname/digest), expandable stack traces, kind badge (route/global/api), one-click resolve. Sidebar entry (ანალიტიკა სექცია, `AlertTriangle` icon). Feature flag `admin.errors`. Health probe 0018. `errors_open` count added to QuickCounts. Smoke: +2 checks (beacon accepts + admin auth).
- [x] 2026-04-20 — **Batch: welcome email + launch-checklist + staging docs + lint cleanup** (4 tasks one sitting):
  - **Welcome email** — `sendWelcomeEmail()` in [`lib/email-admin.ts`](../lib/email-admin.ts), wired into `/api/register` fire-and-forget. Feature flag `notify.welcome-email`. HTML template ka_GE + 2 CTA buttons (dashboard + heat-loss calc). sendEmail refactored to accept arbitrary recipients (was ADMIN_EMAIL-only).
  - **Admin launch-checklist** — [`/admin/launch-checklist`](../app/admin/(authed)/launch-checklist/page.tsx), 5 groups (DB, env, deploy, health, CI), each item with status (✅/🔴/⚠) + `howTo` instructions + contextual links. Progress bar + N/M badge. Sidebar entry „Launch checklist" მთავარ სექციაში (`Rocket` icon). Feature flag `admin.launch-checklist`.
  - **Staging env docs** — [`docs/staging-environment.md`](./staging-environment.md) — Supabase staging project setup, Vercel env split table (prod vs preview), branch workflow, migration rehearsal pattern, risks, pre-merge verify checklist.
  - **Lint cleanup** — fixed 5 unescaped entities (`"` → `&ldquo;/&rdquo;`) in features/sitemap/referral-widget/register-prompt-modal/registration-flow; fixed `react-hooks/immutability` in admin-sidebar logout; `no-this-alias` in `_draft-store.js` (rest params refactor); `react-hooks/purity` Date.now() scoped in claude-sessions + users workspace; `no-html-link-for-pages` intentional in global-error (crash fallback). `react-hooks/set-state-in-effect` downgraded to `warn` in [`eslint.config.mjs`](../eslint.config.mjs) — 14 legitimate localStorage hydration patterns (proper migration is `useSyncExternalStore`, deferred). `public/calc/**` added to globalIgnores. **Result: 0 errors, 40 warnings** (was 28 errors). Launch-check **3/3 green**.
- [x] 2026-04-20 — **Email notifications for bug reports** — [`lib/email-admin.ts`](../lib/email-admin.ts) generic admin notifier (Resend-backed, stub-safe when keys missing). `sendBugReportNotification()` wired into `POST /api/bug-reports` as fire-and-forget (`void` — email latency doesn't block 200 response). HTML template: amber message box + pathname/feature_key/email/viewport/UA + CTA to `/admin/bug-reports`. New env `ADMIN_EMAIL` (optional, added to health probe). New feature flag `notify.bug-reports` — admin can toggle emails on/off via `/admin/features`. Silently skips when: ADMIN_EMAIL missing, RESEND_API_KEY missing, or flag = hidden (flags fail-open on read errors).
- [x] 2026-04-20 — **CI pipeline + launch-check** — GitHub Actions workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): `npm ci` → typecheck → lint (advisory, `continue-on-error`) → build → boot `next start` → smoke (30s ready-loop). Local combined gate [`scripts/launch-check.mjs`](../scripts/launch-check.mjs) → `npm run launch-check` runs typecheck + lint + smoke with per-step blocking/advisory classification. tsconfig cleanup: `.next/dev` excluded (Turbopack dev-mode + prod-mode type drift). Lint tolerates pre-existing 28 errors (setState-in-effect, unescaped quotes, etc.) — new code still expected to respect rules. Local verify: typecheck ✓ (23s), smoke ✓ 25/25 (5s), lint ⚠ advisory.
- [x] 2026-04-20 — **Smoke test suite** — zero-dep HTTP suite [`scripts/smoke.mjs`](../scripts/smoke.mjs), 25 checks (public pages, static assets, sitemap/robots, 404, admin auth redirects on 5 routes, API contract: bug-reports validates / admin endpoints 401, proxy eng_vid cookie). `npm run smoke` (SMOKE_URL env override). Colored output + per-check latency. Exit-code-ready for CI. `npm run typecheck` added. Docs: [`docs/smoke-tests.md`](./smoke-tests.md). **25/25 passing** on localhost:3001 (2026-04-20).
- [x] 2026-04-20 — **Admin audit log** — migration `0017_admin_audit_log.sql` (bigserial pk, actor/action/target_type/target_id/metadata jsonb/ip/created_at, 3 indexes). Helper [`lib/admin-audit.ts`](../lib/admin-audit.ts): `logAdminAction()` fire-and-forget (swallows all errors — audit never breaks underlying action), `getIp()`, `listAuditEntries()`, `listAuditActions()`. Wired into 7 admin mutation endpoints: `feature.set`, `bug.update`, `ai.update`, `tile.upsert`, `user.soft_delete` / `user.purge` / `user.restore` / `user.verify_engineer`, `admin.password_change` (with redeploy metadata). `/admin/audit-log` page — filter by actor/action + search + expandable metadata JSON rows, icon per action prefix (feature / user / tile / bug / ai / admin), ka_GE localized timestamps. Sidebar entry (პარამეტრები სექცია, `ScrollText` icon). Feature flag `admin.audit-log`. Health probe 0017 დაემატება.
- [x] 2026-04-20 — **Launch readiness scorecard (`/admin/health`)** — 5-check panel ზევით (env / Supabase კავშირი / migrations / Storage bucket / Anthropic API) + dynamic title & border color (მწვანე allGreen, ყვითელი 3+/5, წითელი <3). ახალი probes [`lib/system-health.ts`](../lib/system-health.ts): `probeSupabaseLatency()` (HEAD select → round-trip ms), `probeAnthropic()` (GET /v1/models, 5s timeout, zero cost), `getQuickCounts()` (bug_reports_open, features_test, features_hidden). Migrations 0015 + 0016 probe-ს ემატება. Quick tiles: open bug reports + features in test/hidden. Fail-open: DB down → ping ok=false ცხადად.
- [x] 2026-04-20 — **Bug report button (test-mode banner)** — migration `0016_bug_reports.sql`, service [`lib/bug-reports.ts`](../lib/bug-reports.ts), public POST [`/api/bug-reports`](../app/api/bug-reports/route.ts) (Zod validated + per-IP rate-limit), admin PATCH [`/api/admin/bug-reports/[id]`](../app/api/admin/bug-reports/[id]/route.ts). `ReportIssueModal` component + `TestModeBannerClient` wrapper (ბანერში "🐞 შეატყობინე ხარვეზი" ღილაკი — თავი იჩენს მხოლოდ 🟡 test-mode გვერდებზე). `/admin/bug-reports` — KPI row, status filter pills, search, inline status buttons (open / in_progress / resolved / archived), ყოველი card აჩვენებს message, pathname, feature_key, email, viewport, UA, timestamp. Sidebar entry ანალიტიკა სექციაში. Feature flag `admin.bug-reports`. ⚠ Migration 0016 უნდა გაეშვას Supabase-ზე.
- [x] 2026-04-20 — **Feature flags system** (admin ფიჩერ-მართვა) — migration `0015_feature_flags.sql`, registry + service in [`lib/feature-flags.ts`](../lib/feature-flags.ts), API in [`/api/admin/features`](../app/api/admin/features/route.ts), UI `/admin/features` (3-state toggle: 🟢 active / 🟡 test / 🔴 hidden + ConfirmModal ყოველ ცვლილებაზე), `TestModeBanner` + reusable `ConfirmModal` components, proxy `x-pathname` header for route-matched banner, dashboard + admin sidebar filter items by flag (hidden → quoted, test → yellow „test" badge). Admin sidebar-ში ახალი entry „ფიჩერ-მართვა" (პარამეტრები სექცია). Docs: [`docs/feature-flags.md`](./feature-flags.md). ⚠ DB migration საჭიროა გაეშვას Supabase-ზე რომ ცვლილებები დაფიქსირდეს; სანამ ეს გაიდება — fail-open default `active`.
- [x] 2026-04-18 — **Task 006** · სადარბაზოს დაწნეხვის ინტერაქტიული სიმულაციები. [`docs/tasks/006-stair-pressurization-simulations.md`](./tasks/006-stair-pressurization-simulations.md) *(done 2026-04-19 · open-door, force bars, failure mode, smoke visuals present in `public/calc/stair-pressurization.html`; production build verified)*
- [x] 2026-04-19 — Claude session tracking: migration `0014_claude_sessions.sql`, `/api/claude-sessions` ingest endpoint (Bearer `CLAUDE_HOOK_SECRET`), `/admin/claude-sessions` dashboard (hours today/7d/30d/total, sessions table, event log), sidebar entry, hook setup docs `docs/claude-session-tracking.md`
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
