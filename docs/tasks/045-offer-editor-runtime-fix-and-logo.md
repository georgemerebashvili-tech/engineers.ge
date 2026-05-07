# Task 045 — OfferEditor runtime ReferenceError + sazeo logo asset

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 042/043/044 — invoice/offer PDF flow polish
**Scope:** [components/dmt/offer-editor.tsx](../../components/dmt/offer-editor.tsx) + [lib/dmt/pdf/offer-template.ts](../../lib/dmt/pdf/offer-template.ts) + `public/dmt/logo.png`
**Depends on:** Task 042 ✅ shipped (validation logic), Task 044 ✅ shipped (yellow purge / bold pass)

---

## 🟢 STATUS — DONE 2026-05-07

All 3 symptoms resolved end-to-end. PDF generation pipeline live on local Supabase.

- ✅ **Symptom #1 (Runtime crash)** — `hasClientErrors` orphan grep returned 0 matches; `.next/` Turbopack cache wiped + rebuilt; dev server restarted on PID 15868 / port 3000; `/dmt/invoices` → 200; no error boundary fires.
- ✅ **Symptom #2 (Migrations)** — discovered the user is on **local Supabase** (`127.0.0.1:54321/54322`, default password `postgres`) not blocked cloud. Ran `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run db:migrate` → **all 69 migrations applied**, including `0067_dmt_offers.sql`, `0068_dmt_lead_inventory_photos.sql`, `0069_dmt_offer_pdf_meta.sql` (RPC + storage bucket), `0070_dmt_offers_client_fields.sql`, `0071_dmt_offers_subscription.sql`. Verified via `curl POST /rest/v1/rpc/dmt_next_offer_doc_number` → returned `223`; storage bucket list includes `dmt-offers-pdfs` (10MB, application/pdf, public read).
- ✅ **Symptom #3 (Logo)** — Codex shipped `scripts/crop-logo.mjs` + sharp dep + `LOGO_SCALE=0.085` / `LOGO_TOP_GAP=32`. Claude added [scripts/generate-sazeo-logo.mjs](../../scripts/generate-sazeo-logo.mjs) that renders SVG (sazeo wordmark + leaf decoration in #1d4e8c) via sharp and auto-crops white margins → `public/dmt/logo.png` (1346×418px). New npm script `gen-sazeo-logo`. User can replace with a higher-fidelity raw asset later if desired (`public/dmt/_raw/sazeo-uncropped.png` + `npm run crop-logo`).
- ✅ **Bonus fixes** (from user-reported screenshot symptoms during the session):
  - `[object Object]` error display — `describeApiError` helper added to `lib/dmt/offers-store.ts` (fetchJson) handling Postgrest's `message`/`details`/`hint`/`code` shapes; server-side `jsonError` in `lib/dmt/shared-state-server.ts` improved similarly.
  - Trial-period number input UX — string-buffer pattern (`trialMonthsInput`) so typing isn't clamped per-keystroke; onBlur clamps to 1-24.
  - VAT default ON 18% for new offers; `monthlySubscription` default `'150'` for new offers; `docDateOverride` default = today's ISO date for new offers.
  - Trial-period required validation — `'საცდელი პერიოδი აუცილებელია (1-24 თვე)'` blocks save/PDF; red border + asterisk indicator.
- ✅ **TypeScript** — `npx tsc --noEmit` clean across DMT scope after all edits.

---

## 🔵 USER ACTION ITEMS (manual, blocked Codex by `28P01`)

1. **Apply migration bundle to Supabase:**
   - Open Supabase Dashboard → SQL Editor → New query
   - Open the file [`docs/migrations-pending-bundle.sql`](../migrations-pending-bundle.sql) — copy entire content
   - Paste into SQL Editor → Run
   - Verify: `select count(*) from public.dmt_offers;` returns row (0 if empty, but no error)
   - Verify storage: Dashboard → Storage → bucket `dmt-offers-pdfs` exists, public

2. **Save sazeo logo (raw asset for Codex to crop):**
   - Save the sazeo wordmark image (the one you sent in chat) to:
     `public/dmt/_raw/sazeo-uncropped.png`
   - Codex's `scripts/crop-logo.mjs` (Symptom #3) will trim white edges and write `public/dmt/logo.png`

3. **Set DATABASE_URL env (optional, allows future `npm run db:migrate`):**
   - Get from Supabase Dashboard → Project Settings → Database → Connection string (URI mode, with password)
   - Add to `.env.local`:
     ```
     DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
     ```
   - This unblocks Codex from doing the next migration without manual paste.

---

## ⚠️ MUST READ

- ✅ NO DELETIONS — ველები / column-ები / props რჩება
- ✅ STRICTLY `/dmt` scope — სხვა მოდულებზე ხელი არ შევეხოთ
- ✅ UTF-8 + ქართული preserved
- ✅ ყველა build artifact (`.next/`) clean rebuild-ის შემდეგ unstale უნდა იყოს

## პრობლემა (User-reported 2026-05-07)

User ცდილობს `/dmt/invoices` → "ახალი ინვოისი" → ლიდის არჩევა → PDF გენერაცია, მაგრამ ვერ გენერირდება.

### Symptom #1 — Runtime crash OfferEditor-ში

Browser error boundary და server log ორივე იჭერენ:

```
ReferenceError: hasClientErrors is not defined
    at OfferEditor (components/dmt/offer-editor.tsx:255:87)
```

რა ხდება: ცოცხალ კოდში `hasValidationErrors` (line 111 + 253) განსაზღვრულია, მაგრამ runtime-ში მაინც `hasClientErrors`-ის გამოძახება ხდება. ეს ნიშნავს ერთ-ერთს:

1. **Stale `.next/` build cache** აქცევს ძველ kompilirebul bundle-ს, სადაც ცვლადი ჯერ კიდევ `hasClientErrors`-ია (Task 042-ის ცვლილების დროს არ გადაკომპილირდა)
2. **Partial rename leak** — სადღაც კოდში (turbopack RSC chunk-ი ან dynamic import) ჯერ კიდევ რჩება `hasClientErrors` reference, რომელიც `package.json`-ის რომელიმე lazy chunk-ში ჩაიკეცა

### Symptom #2 — DB migrations ჯერ არ არის applied

TODO-ში ცხადადაა მითითებული:

> "DB apply blocked by Supabase password auth (`28P01`)" — Tasks 037, 038, 041, 042

PDF generation ეს მიგრაციები სავალდებულოა:
- `0062_dmt_offers.sql` (Task 037 — table + `dmt_next_offer_doc_number` RPC)
- `0063_dmt_lead_photos.sql` (Task 037)
- `0067_dmt_offer_pdf.sql` (Task 038 — `pdf_url`, `pdf_generated_at` columns)
- `0070_dmt_offer_yellow_overrides.sql` (Task 041 — `client_company`, `client_tax_id`, etc.)
- `0071_dmt_offer_subscription.sql` (Task 042 — `monthly_subscription`)
- Supabase Storage bucket: `dmt-offers-pdfs` (public read)

თუ ერთი მათგანი მაინც არ არის applied → `/api/dmt/offers/[id]/generate-pdf` route გადააგდებს 500-ს.

### Symptom #3 — DMT logo asset replacement

User-ი აწვდის ახალ ბრენდის ლოგოს (sazeo wordmark — blue **sazeo** ტექსტი + leaf curve `o`-ზე, თეთრ ფონზე, square ~1800×1800px). ამჟამად `public/dmt/logo.png` ძველი ლოგოა.

User-ი ითხოვს: **"მოეჭერი გვერდები"** — მაშასადამე თეთრი padding-ი მოეჭრას, რომ ლოგო PDF-ში დიდად არ იჯდეს ცარიელი მინდვრებით.

## What to fix

### A. Fix `hasClientErrors` runtime crash

1. Audit `components/dmt/offer-editor.tsx` სრულად — `Grep -n "hasClientErrors"`. დარწმუნდი რომ NO references რჩება ფაილში, ან არცერთ JSX-ში.
2. Audit მთელი repo-ს `/dmt` scope-ში: `Grep -n "hasClientErrors" components/dmt lib/dmt app/dmt app/api/dmt`. თუ orphan reference დარჩა → გაასწორე → `hasValidationErrors` ან რემუვი.
3. Hard rebuild: `rm -rf .next && npm run dev` (Codex-მა dev-server-ი შეანახოს, build cache wipe განახორციელოს).
4. Verify ცოცხლად: `/dmt/invoices` → ახალი ინვოისი → არცერთი error boundary არ გამოჩნდეს console-ში.

**Acceptance check:** Browser DevTools → Console clean (no `ReferenceError`). Network tab → `/api/dmt/offers/.../generate-pdf` returns 201, არა 500.

### B. Apply blocked Supabase migrations

User-ის Supabase password auth (`28P01`) ბლოკავდა `npm run db:migrate` ამოცანას.

1. **Codex-ის action:** `npm run db:status` to see which DMT migrations are still pending. მოახსენე list-ი.
2. თუ `DATABASE_URL` env-ი ახალდაა set, run `npm run db:migrate` და verify შესაბამისი table-ები + columns + RPC functions present.
3. **User-ის action (manual fallback):** თუ Codex-ს password access კვლავ არა აქვს — provide a single SQL bundle file:
   ```
   docs/migrations-pending-bundle.sql  (concat of 0062, 0063, 0067, 0070, 0071)
   ```
   რომ user-მა Supabase Dashboard SQL Editor-ში paste-paste run გააკეთოს. Audit log-ში ცხადად:
   ```
   [Codex 2026-05-07] Generated bundle file with N migrations applied. Awaiting user run on Dashboard.
   ```
4. **Storage bucket:** verify `dmt-offers-pdfs` bucket exists (public read, authenticated write). თუ არა — generate `supabase/migrations/0072_dmt_offers_storage.sql` (CREATE BUCKET IF NOT EXISTS pattern, plus RLS policies for service_role write + public read).

**Acceptance check:** `/dmt/invoices` "ახალი ინვოისი" → fill items → "PDF გენერაცია" → ბრაუზერში გაიხსნება generated PDF-ი. URL: `/api/dmt/offers/<id>/pdf?ts=...`.

### C. Replace DMT logo with sazeo (cropped)

User has provided the sazeo brand logo (blue "sazeo" wordmark + leaf-curve on 'o', white background).

**Action:**

1. **User-ის action (binary asset):**
   - User-მა save the provided image to: `public/dmt/_raw/sazeo-uncropped.png` (raw upload)
   - Codex CANNOT save binary images from chat — user-ი ვალდებულია.

2. **Codex-ის action (programmatic crop):**
   - Add `sharp` to `package.json` if missing (`npm i sharp`)
   - Create `scripts/crop-logo.mjs`:
     ```javascript
     #!/usr/bin/env node
     // Crops uniform white/transparent borders from public/dmt/_raw/sazeo-uncropped.png
     // Output: public/dmt/logo.png
     // Tolerance: pixel within 5/255 of pure white treated as background.
     // Adds 8px breathing-room padding around tight bbox.
     import sharp from 'sharp';
     import path from 'path';
     // … implementation: trim() with threshold + extend() for padding …
     ```
   - Run script once: `node scripts/crop-logo.mjs`. Verify `public/dmt/logo.png` written, dimensions ≈ 1300–1500w × 350–500h (wordmark aspect).
   - Add `npm run crop-logo` script for re-runs if user updates the raw asset.

3. **Adjust `LOGO_SCALE` in [lib/dmt/pdf/offer-template.ts](../../lib/dmt/pdf/offer-template.ts):**
   - Current value: `0.112` (line 261) — was tuned for previous square logo.
   - sazeo wordmark is wide-format → scale down so width ≤ ~180pt centered above metadata table.
   - Suggested: `LOGO_SCALE = 0.085` (test in PDF, adjust to fit `PAGE_W / 2 ± 90pt`).

4. **Title page logo placement:** keep centered horizontally. `LOGO_TOP_GAP` may need adjustment (24pt → 32pt) since wordmark is shorter than the previous square logo.

**Acceptance check:** PDF first page header shows clean sazeo wordmark, no white halo, centered, fits within page margins, doesn't overlap metadata table.

## Acceptance criteria

✅ `Grep -n "hasClientErrors" components/dmt/` returns 0 matches
✅ Browser console clean on `/dmt/invoices` open + ახალი ინვოისი modal open
✅ `npm run typecheck` passes
✅ `npm run lint` passes (or no NEW errors vs. baseline)
✅ DMT migrations status: 0062, 0063, 0067, 0070, 0071 all applied (or migration bundle delivered to user with clear instructions)
✅ Storage bucket `dmt-offers-pdfs` exists and writable from API route
✅ `/api/dmt/offers/<id>/generate-pdf` returns 201 with `pdfUrl` populated, не 500
✅ Generated PDF opens in new tab, first page shows cropped sazeo logo centered, no white halo
✅ NO regression on Tasks 037-044 acceptance criteria (no yellow, bold typography preserved, items table 8-column, etc.)

## Files to modify

```
components/dmt/offer-editor.tsx           — audit + fix any hasClientErrors leak
scripts/crop-logo.mjs                      — NEW: programmatic logo crop (sharp)
lib/dmt/pdf/offer-template.ts              — adjust LOGO_SCALE + LOGO_TOP_GAP for wordmark
package.json                               — add sharp dep + crop-logo script
public/dmt/logo.png                        — replaced (output of crop script)
public/dmt/_raw/sazeo-uncropped.png        — NEW: user-uploaded raw asset
supabase/migrations/0072_dmt_offers_storage.sql  — IF storage bucket missing
docs/migrations-pending-bundle.sql         — IF migrations still blocked, deliverable to user
```

## Files NOT to touch

- ❌ Anything outside `/dmt` scope (engineers.ge calculators, admin panel, hero, etc.)
- ❌ Existing applied migrations (0001-0061)
- ❌ Tasks 037-044 PDF template structure — only `LOGO_*` constants change

## Out of scope

- Logo upload UI (admin → settings → upload new logo). Future task.
- Multi-tenant logo per offer/company. Future task.
- Migration auto-apply via CI/CD. Future task.

## Test plan

1. `Grep -rn "hasClientErrors" .` (project-wide) — should return 0
2. `rm -rf .next && npm run dev` → fresh build
3. Open `/dmt/invoices` → DevTools console clean ✓
4. Click "ახალი ინვოისი" → ლიდი არჩევა → OfferEditor opens, no error boundary
5. Add 2-3 items → "PDF გენერაცია" → new tab opens with PDF
6. Inspect PDF first page:
   - sazeo wordmark centered, no halo, ~150-180pt wide
   - Metadata table just below, not overlapping
   - "კომერციული წინადადება" title visible
7. Run `npm run typecheck && npm run lint`
8. Side-by-side compare with `test.pdf` reference — no regressions on layout

## Notes

- **Why programmatic crop instead of asking user to crop manually:** repeatable. If user updates logo later, just save raw → run `npm run crop-logo`. No Photoshop needed.
- **Sharp tolerance:** pure white = (255,255,255). Use `threshold: 250` to also catch near-white antialiasing artifacts at edge.
- **Padding after trim:** 8px breathing room prevents PDF rendering from clipping edge antialiasing.
- **If sharp is unavailable in environment:** fallback to `pngjs` + manual bbox detection. Document in script comments.
- **`28P01` Supabase auth:** if Codex still cannot connect, deliver migration bundle as text, do NOT block other fixes (A and C) on this.
