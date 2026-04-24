# Architectural Decisions (ADR log)

ფორმატი: `YYYY-MM-DD — გადაწყვეტილება — მიზეზი`.

---

## 2026-04-23 — TBC destructive actions switch to archive-first (360-day retention marker)
`/tbc` workspace-ში hard delete-ები იცვლება archive-first flow-ით: users,
companies, branch comments, device removals და estimate row replacements
აღარ შლიან ჩანაწერს ფიზიკურად. ამის ნაცვლად ვინახავთ `archived_at`,
`archived_by`, `archive_expires_at`, `archive_reason` metadata-ს და აქტიურ
სიებში მხოლოდ `archived_at is null` ჩანაწერები ჩანს.

მიზეზი:
- user-მა პირდაპირ მოითხოვა, რომ TBC-ზე მონაცემი აღარ დაიკარგოს, რადგან უკვე
  გვქონდა დაკარგული ჩანაწერები.
- delete-ზე UI ჯერ confirm/modal-ს აჩვენებს და მხოლოდ ამის შემდეგ გადაჰყავს
  ჩანაწერი არქივში.
- 360-დღიანი retention marker ფიქსირდება metadata-ში, მაგრამ auto-purge არ
  გავუშვით, რათა დამატებითი მონაცემის დაკარგვის რისკი არ შევიტანოთ.
- `tbc_jwt` session ახლაც ბაზასთან მოწმდება, ამიტომ archived/inactive user
  ძველი cookie-თ ვეღარ გააგრძელებს მუშაობას.

## 2026-04-22 — DMT per-user UI preferences live in `dmt_users.settings`
`/dmt/leads/manual`-ისთვის tab color აღარ ინახება browser-only state-ში. თითო
DMT მომხმარებელს აქვს persisted `settings` JSONB `dmt_users`-ზე, სადაც ახლა
ინახება `manualLeadsTabColor`.

მიზეზი:
- ფერი უნდა დარჩეს მომხმარებლის ანგარიშზე მიბმული და არა კონკრეტულ ბრაუზერზე.
- იგივე preference ყველა collaborator-ს უნდა ჩანდეს, როცა `/dmt/leads/manual` იხსნება.
- MVP-სთვის ცალკე profile/settings table ზედმეტი იყო; მცირე UI preferences ერთ
JSONB ველში უფრო იოლია და არ არღვევს არსებულ auth მოდელს.

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

## 2026-04-21 — Legacy calc iframes use runtime locale bridge (`?lang=` + `/public/calc/_i18n.js`)
Standalone public calculator HTML-ები არ გადავიდა locale-per-file დუბლირებაზე.
ამის ნაცვლად `/calc/[slug]` route iframe `src`-ში ამატებს `?lang=<locale>`-ს,
ხოლო `public/calc/_i18n.js` locale-ს კითხულობს query/cookie/parent `<html lang>`-დან
და selector-based translations-ს ავრცელებს თვითონ HTML გვერდზე.

მიზეზი:
- 18 legacy HTML-ის 6-ენოვანი ასლები გამოიწვევდა 108 ფაილის დუბლირებას.
- სრული React rewrite ზედმეტად დიდი ერთჯერადი lift არის.
- runtime bridge გვაძლევს incremental rollout-ს: ჯერ title/button/tab chrome,
  მერე deeper UI/toasts/help ტექსტები იმავე pattern-ით.

## 2026-04-21 — Regulation watcher stores source rows + immutable snapshots
`/admin/regulations`-ისთვის შეიქმნა ორი ცხრილი: `regulation_sources` და
`regulation_source_snapshots`. წყაროს row ინახავს მიმდინარე სტატუსს
(`last_hash`, `last_checked_at`, `last_changed_at`, `last_error`, excerpt),
ხოლო ყოველი ახალი hash immutable snapshot-ად იწერება ცალკე.

MVP შეგნებულად **არ** აკეთებს selector-specific DOM extraction-ს: ჯერ hash ითვლება
normalized full-page text-ზე. მიზეზი:
- გვინდოდა cron-safe watcher დამატებითი parsing dependency-ის გარეშე.
- matsne / standards pages სტრუქტურულად არაერთგვაროვანია და ჯერ source shortlist
  მაინც ზუსტდება.
- immutable snapshots მოგვცემს მარტივ diff/approval UI-ს შემდეგ ეტაპზე, მაშინაც კი,
  როცა extraction strategy მოგვიანებით დაიხვეწება.

## 2026-04-21 — Admin password recovery via ADMIN_RECOVERY_EMAIL
Admin ერთ-user-იანი hardcoded-env auth-ია (`ADMIN_USER` + `ADMIN_PASS_HASH`),
რაც self-service password change-ს ართულებდა პაროლის დავიწყების შემთხვევაში.
დავამატე forgot-password flow-ი მხოლოდ ერთ-ერთ hardcoded recovery მისამართზე:

- ახალი env: `ADMIN_RECOVERY_EMAIL` (მხოლოდ ეს მისამართი იღებს ბმულს).
- Migration `0026_admin_password_reset.sql` — `admin_password_reset_tokens` ცხრილი
  (30-წუთიანი TTL, single-use).
- UI: `/admin/forgot` (email enter) → email link → `/admin/reset?token=…`
  (ახალი პაროლი).
- Consume endpoint იყენებს იმავე Vercel API flow-ს როგორც `/api/admin/password`
  (PATCH `ADMIN_PASS_HASH` production env-ზე + optional redeploy hook).

Reason: თუ password-ი დაიკარგა და admin panel-ზე შესვლა შეუძლებელია,
მფლობელს სჭირდება recovery path რომელიც არ მოითხოვს Vercel dashboard-ზე
წვდომას. Recovery email whitelist (one address only) არ ქმნის user-enumeration
surface-ს (response ყოველთვის 200 regardless of match).

## 2026-04-21 — Hero Ads finance uses separate `hero_ad_payments` ledger
Hero Ads-ის კომერციული state (`occupied_until`, `price_gel`) უკვე ინახებოდა
`hero_ad_slots`-ში, მაგრამ ფინანსური კონტროლი არ გვქონდა: outstanding invoices,
paid-through პერიოდი და overdue სტატუსი მხოლოდ ხელით ჩანაწერებად დარჩებოდა.

ამიტომ შევქმენით ცალკე `hero_ad_payments` ცხრილი და არა დამატებითი ველები
`hero_ad_slots`-ზე. თითო row წარმოადგენს invoice/payment ledger ჩანაწერს:
slot, client, amount, period start/end, due date, paid_at, status, note.

მიზეზი:
- ერთი slot-ს შეიძლება ჰქონდეს მრავალი ინვოისი დროთა განმავლობაში; flat columns
  ისტორიის შენახვას და audit-ს ვერ ფარავს.
- `occupied_until` არის booking/commercial deadline, ხოლო `paid until`
  ფინანსური coverage; ისინი ყოველთვის ერთი და იგივე არაა.
- ცალკე ledger საშუალებას გვაძლევს `/admin/banners/stats`-ში ვაჩვენოთ
  outstanding/overdue summary, ხოლო `/admin/banners/table`-ში coverage comparison.

## 2026-04-21 — Public ad uploads go to pending queue before publish
`/ads` გვერდზე client-facing upload ახლა პირდაპირ live slot-ს აღარ ეხება. ფაილი
ჯერ ინახება `hero_ad_upload_requests` queue-ში (`status = pending`), ხოლო approve
მხოლოდ admin-იდან ხდება. Approve action ავტომატურად აქვეყნებს asset-ს შესაბამის
`hero_ad_slots.image_url`-ზე.

მიზეზი:
- public upload-ის პირდაპირ live publish-ად გაშვება ძალიან მაღალი abuse risk-ია.
- pending queue გვაძლევს ადამიანის review-ს creative/content ხარისხზე.
- იგივე row ინახავს ვინ გამოგზავნა, რომელი slot სთხოვა და რა asset URL შევიდა,
  ასე რომ კომერციული კომუნიკაცია და audit trail ერთიანდება.

## 2026-04-21 — Regulation watcher separates latest snapshot from published reference
Regulation watcher fetch-ზე ყოველი ახალი ცვლილება ჯერ `latest snapshot`-ად ინახება,
მაგრამ ეს ავტომატურად არ ითვლება “გამოქვეყნებულ” რეფერენსად. დავამატეთ
`published_*` ველები source row-ზე და snapshot-level publish metadata, რათა admin-ს
ქონდეს explicit `Approve + publish` ნაბიჯი.

მიზეზი:
- monitored source-ზე ცვლილება ჯერ review-ს საჭიროებს; fetch != approval.
- admin-ს უნდა ჰქონდეს შესაძლებელი ნახოს სამი მდგომარეობა: latest, previous,
  currently published.
- future compliance/rule engines-ს სჭირდება “რომელი snapshot იყო დამტკიცებული”
  მკაფიო trace, და არა მხოლოდ ბოლო fetch hash.

## 2026-04-24 — TBC photo loading: lite branches list + per-branch devices fetch
`/api/tbc/branches` default GET-მა აქამდე ყველა ფილიალის ყველა devices-ს მთლიანი
photos-ებით აბრუნებდა — legacy base64 ფოტოებით 209 ფოტო × რამდენიმე MB = დიდი
JSON payload-ი, რის გამოც `/tbc/` მობილურზე იჭედებოდა. გადაწყვეტა ორნაწილიანი:

1. **API:** `?lite=1` query param აბრუნებს branches-ს `devices` ველის გარეშე.
   `/api/tbc/branches/[id]/devices?mode=active` აბრუნებს კონკრეტული ფილიალის
   active devices-ს. Mobile app ახლა ჯერ lite-ს იტვირთავს, ფილიალის არჩევის
   შემდეგ devices-ს spinner-ით.
2. **Data:** migration 0055 prod-ზე გავიდა (bucket `tbc-photos` + backup table),
   შემდეგ `scripts/migrate-tbc-photos-to-storage.mjs` გავუშვით — 209 legacy
   base64 ფოტო Supabase Storage-ში გადავიდა `{url, thumb_url}` ობიექტებად
   (256px thumb + 1024px full). Thumbnail-ები lazy loading-ით იტვირთება,
   full-res მხოლოდ double-tap → lightbox-ზე.

მიზეზი:
- მობილური app PWA-ს გამოიყენებენ საველე პირობებში ცუდ ინტერნეტზე. საწყისი
  fetch-ი უნდა იყოს კილობაიტის რიგი, არა მეგაბაიტის.
- Per-branch lazy loading ბუნებრივ workflow-ს ემთხვევა — user ყოველთვის ერთ
  ფილიალზე მუშაობს დროის მოცემულ მომენტში.
- Storage URLs ქეშდება browser-ში და CDN-ში; base64 JSON-ში არა.
