# Architectural Decisions (ADR log)

ფორმატი: `YYYY-MM-DD — გადაწყვეტილება — მიზეზი`.

---

## 2026-04-18 — Ventilation simulations suite (3 phases)
იხ. [`PLAN-ventilation-suite.md`](./PLAN-ventilation-suite.md).
- **Phase 1** — 4 standalone სიმულატორი (stair, elevator, parking, corridor) + shared `_physics-engine.js` + rules page.
- **Phase 2** — module library + building composer, stair/lift stackable per floor.
- **Phase 3** — DXF upload, Claude API wall detection, Supabase save (last state only, no history).
- **ფიზიკა:** engineering formulas (EN 12101, NFPA 92, СП 7.13130, ASHRAE, SFPE), არა CFD.
- **Client-first** Phase 1-2-ში; server storage მხოლოდ Phase 3-ში.

## 2026-04-18 — KaTeX (არა MathJax) formula rendering
ფორმულების ჩვენებას `katex` + `react-katex` — უფრო მსუბუქი, server-friendly static generation-ზე. MathJax უფრო მძიმე + runtime-heavy.

## 2026-04-18 — Shared physics engine as ES module (`public/calc/_physics-engine.js`)
ყოველი simulator-ი იმპორტებს მას. Zero duplication, ერთ ადგილას fix, ნებისმიერი სტანდარტი extendable data-only. რაც ცალკე physics გვჭირდება — შემოაქვს pure function + JSDoc + REFS entry.

## 2026-04-18 — Phase 2 module serialization uses Zod discriminated union
`lib/building/module-schema.ts` აფიქსირებს `stair | elevator | parking | corridor` module contract-ს, ხოლო `lib/building/module-utils.ts` აძლევს immutable helpers-ს (`create/add/remove/update/diff/roundTrip`). მიზეზი: composer, stacked floors, connection sync და future DXF import ყველა ერთ JSON envelope-ზე უნდა დაჯდეს, რომ export/import წესები არ გაიფანტოს.

## 2026-04-18 — Simulator shell template (Claude lead)
sidebar + tabs (section/plan/3D + formulas) + std-info overlay + templates + drag-resize + light/dark 3D = shared UX pattern ყოველ simulator-ზე. Claude იწყებს shell-ს, Codex-ი wiring-ს აკეთებს.

## 2026-04-15 — Next.js 15 App Router
Server Components + middleware logging + Vercel native.

## 2026-04-15 — Supabase (არა Firebase/PlanetScale)
Postgres + RLS + Auth + Storage ერთ პლატფორმაზე. Vercel Marketplace integration.

## 2026-04-15 — Visitor tracking via first-party cookie + SHA-256(IP+UA)
არ ვინახავთ raw IP-ს — GDPR-friendly. Cookie UUID = stable identifier.

## 2026-04-15 — Cookie-based calculator state (არა DB)
ანონიმური გამოყენება, მსუბუქი, privacy-preserving. DB-ში მხოლოდ rate-limit counter.

## 2026-04-16 — Admin auth: hardcoded env vars (არა Supabase Auth)
User-ის მოთხოვნით — ერთი owner, არ საჭიროებს provider-ს.
`ADMIN_USER` + `ADMIN_PASS_HASH` (bcrypt) + signed JWT cookie.

## 2026-04-16 — i18n: 6 ენა `next-intl`-ით
`ka` (default), `en`, `ru`, `tr`, `az`, `hy`. URL prefix `/ka/...`.

## 2026-04-16 — Theme: light + dark, cookie-stored
System preference default, user override persisted.

## 2026-04-16 — Global loader: `nextjs-toploader` + route `loading.tsx`
Skeleton per route segment. Progress bar accent-ფერის.

## 2026-04-16 — Rate-limit: per-calculator individual
გადაწყვეტილება ცალ-ცალკე, ROADMAP-ში თითო task.

## 2026-04-16 — ვიზუალური ენა: Kimley-Horn-inspired editorial
User-ის ნიმუშის მიხედვით: მუქი navy nav/footer + brand-red accent (`#D8232A`) +
full-bleed hero diagonal stripe-ით + tight card grid (gap-2) overlay-ტიტულებით.
Accent engineering-blue → brand-red-ზე შეიცვალა. `max-w-6xl` → `max-w-7xl`.
სრული წესები `docs/DESIGN.md`-ში; CSS tokens `docs/STYLE.md`-ში.

## 2026-04-16 — ვიზუალური ენა (II): HVAC კალკულატორის სტილი binding
Kimley-Horn-editorial მიმართულება უარყოფილია. Binding წყარო:
`public/heat-loss-calculator.html`. მიზეზი — კალკულატორი არის პროდუქტის
ბირთვი და საიტმა უნდა გაუგრძელდეს მისი ვიზუალი, არა უცხო მარკეტინგული stile.
ცვლილებები:
- Palette: navy `#1a3a6b` primary, blue `#1f6fd4` interactive, bg `#f2f5fa`,
  subtle bdr `#dde6f2`, semantic ora/grn/red.
- Fonts: Plus Jakarta Sans + IBM Plex Mono (Google Fonts).
- Base font 13px (არა 16), hero ≤ 440px, container `max-w-[1120px]`.
- Radius: 4-5 input, 6 button, 10 card.
- Hover = border/bg, არა transform.
- Cards: 1px border + shadow-card (`0 1px 3px/.07 + 0 4px 14px/.05`).
სრული წესები DESIGN.md + STYLE.md განახლდა; tokens globals.css-ში.

## 2026-04-16 — პირველი HVAC კალკულატორი ინახება standalone static asset-ად
მომხმარებლის მოწოდებული ერთფაილიანი legacy სისტემა შენარჩუნდა პრაქტიკულად უცვლელი დიზაინით
`public/heat-loss-calculator.html`-ში, ხოლო root route მასზე redirect-დება.
ეს ამცირებს porting-ის რისკს და გვაძლევს სწრაფ ინტეგრაციას popup/autosave/drag-drop დამატებებით.

## 2026-04-16 — Hero: Recharts Nested Treemap
Hero-ს მარჯვენა მხარე = `Treemap` (recharts) — personal photos (business/site/childhood) +
brand banner tiles ("ინჟინერია" slogan, HVAC, თბოდანაკარგი, იზოლაცია).
Custom SVG content: images `<image>` clip-path-ით, text tiles `color-mix`-ით.
მიზეზი: user-ს სურდა ცოცხალი, ვარიაციული ბანერული grid — არა სტატიკური KPI ბარათები.

## 2026-04-16 — ~~Global controls: MUI (Slider) + Tailwind (layout)~~ (REVERTED 2026-04-18)
BgSlider იყენებდა `@mui/material/Slider`-ს. ქვეგვერდების სტილი mass
ფაზაში MUI Dashboard template-ს გაჰყვებოდა (`docs/tasks/002-site-style-mui-dashboard.md`).

## 2026-04-18 — MUI სრულად ამოღებულია
Stack ახლა Tailwind + lucide-react + recharts (charts-თვის). MUI ყველა
დამოკიდებულება წაშლილია (`@mui/material`, `@mui/icons-material`, `@mui/x-*`,
`@emotion/*`, `@mui/material-nextjs`). BgSlider = native `<input type=range>`,
admin/banners = plain Tailwind. მიზეზი: bundle size (~300KB) + design
consistency (KAYA/DESIGN_RULES baseline) + Turbopack filesystem timeouts
MUI node_modules-ზე. **წესი:** აღარ იმპორტო `@mui/*`. ახალი ჩარტი გინდოდეს —
recharts, plain SVG, ან Tailwind bar-პროგრესი.

## 2026-04-17 — Analytics: საკუთარი first-party (არა GA / Vercel Analytics)
ვიზიტორების ქცევის tracking-ი — საკუთარი Supabase `page_views` table, privacy-friendly.
არქიტექტურა:
- **Middleware** (`middleware.ts`) → `eng_vid` cookie (UUID v4, 1 წელი).
- **Client `<Tracker />`** → root layout-ში, `usePathname`-ის ცვლილებაზე `POST /api/track`,
  გვერდის დატოვებაზე `navigator.sendBeacon('/api/track/leave', {id, duration_ms})`.
  `visibilitychange` (hidden) + `pagehide` = ზუსტი duration SPA navigation-ის დროსაც.
- **API routes** Node.js runtime + service_role Supabase client. UA parsing
  `ua-parser-js`-ით, geo — Vercel headers (`x-vercel-ip-country`, `x-vercel-ip-city`).
- **Schema**: `page_views` (visitor_id, path, referrer, utm_*, country, device,
  browser, os, ua_hash, entered_at, duration_ms). RLS enabled, service_role-only.
- **Bot filter** UA regex-ით (googlebot, facebookexternalhit, lighthouse, etc.).
- **Privacy**: raw IP არ ინახება, მხოლოდ SHA-256(ip+ua+daily_salt) hash.
მიზეზი: GA4 dashboard-ს admin panel-ში embed ვერ ვუკეთებ (Data API OAuth-ის გარეშე),
Vercel Analytics-ს time-on-page არ აქვს, Plausible/Umami — $9/თვე ან self-host.
საკუთარი რომ ავაშენოთ, data ჩვენია, custom რეპორტები თავისუფალია, GDPR banner არ გვჭირდება.

## 2026-04-17 — 3 ძირითადი entry page (superseded)
საიტის ზოგადი სტრუქტურა ფიქსირდება 3 მთავარ entry point-ზე:
`/` მთავარი გვერდი, `/user` უფასო მომხმარებლის გვერდი, `/admin` ადმინისტრაციის პანელი.
ინდივიდუალური კალკულატორები რჩება child route-ებად (`/calc/[slug]`) მომხმარებლის ზონის ქვეშ.
მიზეზი: public მხარე და admin მხარე მკაფიოდ უნდა გაიმიჯნოს, ხოლო მომხმარებლის გამოცდილება
იყოს ერთი უფასო ჰაბის ირგვლივ ორგანიზებული.
შემდგომ დაზუსტდა route naming და ეს ჩანაწერი ჩანაცვლდა ქვემოთ მოცემული `2 დეშბორდი` გადაწყვეტილებით.

## 2026-04-17 — 2 დეშბორდი: user + admin
დაზუსტდა, რომ მთავარი გვერდის გარდა სისტემას აქვს ზუსტად 2 დეშბორდი:
`/dashboard` — უფასო მომხმარებლის დეშბორდი და `/admin` — ადმინისტრატორის დეშბორდი.
`/user` დარჩა compatibility redirect-ად `/dashboard`-ზე.
მიზეზი: naming უნდა ემთხვეოდეს რეალურ UX-ს და public მხარეც dashboard-ივით იყოს აღქმული.

## 2026-04-17 — Hero Ads admin + public pricing overlay
Hero treemap-ის სარეკლამო slot-ები გადავიდა მართვად მოდელში:
Supabase table `hero_ad_slots`, admin tab `/admin/tiles`, public homepage-ზე
ლურჯი outline + price + occupied-until overlay-ები. Admin მხარეს არსებობს
live simulator, slot chooser და format/size + occupancy tables.
`გიორგი მერებაშვილი` ფიქსირებული owner-ნიშანია hero სარეკლამო overlay-ებში.

## 2026-04-18 — Building Composer = native React route + query-state simulator handoff
`/calc/building-composer` აშენდა როგორც native React page (`zustand` + `@react-three/fiber`),
არა standalone iframe HTML. მიზეზი: composer state-heavy ინსტრუმენტია და module selection,
transform gizmo, autosave და typed schema validation ბევრად სტაბილურად ჯდება React route-ში.

გადაწყდა ასევე, რომ simulator preload იმუშაოს `?state=<base64json>` query param-ით.
ამისთვის `/calc/[slug]` route აღარ აჩერებს user-ს `ProjectGate`-ზე როცა `state` არსებობს,
და iframe `src`-ში forwards both `project` + `state`. თვითონ standalone simulators
DOMContentLoaded-ზე კითხულობენ `state`-ს URL-დან და პირდაპირ `applyImportedState(...)`-ს იძახებენ.
შედეგი: composer → simulator workflow ერთ-კლიკიანი დარჩა, project chooser-ის შუალედური ბლოკის გარეშე.

## 2026-04-19 — Composer DXF pipeline normalizes to scene meters before heuristics
`dxf-parser`-იდან მიღებული DXF data ჯერ გადადის `lib/dxf/parse.ts`-ში ერთიან
`DxfLoaded` ფორმატში: entity-ები flattenდება (`INSERT` dereference), ერთეულები
`$INSUNITS`-იდან გადადის scene-meter scale-ზე, bounds ითვლება parse ფაზაში,
და classification cache იკითხება DXF hash-ით localStorage-დან. Rendering მხარე
(`lib/dxf/to-three.ts`) აგებს per-layer Three.js group-ებს, ხოლო composer UI
მხარეს მხოლოდ layer visibility/text toggles რჩება.

მიზეზი: Task 019/020 heuristic + AI classification აღარ უნდა იყოს მიბმული raw DXF
parser output-ზე; ისინი მუშაობენ სტაბილურ, render-agnostic normalized მოდელზე.
