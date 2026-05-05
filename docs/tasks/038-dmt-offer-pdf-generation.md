# Task 038 — DMT: AI-assisted commercial offer PDF generation

**Delegated to:** Codex
**Created:** 2026-05-05
**Parent:** /dmt CRM workflow — extends Task 037 offers
**Scope:** **STRICTLY /dmt namespace** — backend (PDF generation API + Supabase Storage) + frontend (preview + download)
**Depends on:** Task 037 — `dmt_offers` table + offer items structure

## ⚠️ MUST READ — SCOPE & NO DELETIONS

### SCOPE LIMITS

- ✅ Work ONLY on `/dmt` namespace
- ❌ DO NOT touch other site areas (TBC, calc, etc.)
- ❌ NO DELETIONS — only additive
- ❌ DO NOT modify existing `lib/anthropic.ts`, `dmt_inventory`, or `/api/dmt/inventory/*`

### Existing infrastructure to REUSE

| Resource | Path | Use |
|---|---|---|
| `pdf-lib` | `package.json:39` (already installed) | PDF generation |
| `@pdf-lib/fontkit` | `package.json:23` | Custom font embedding (Georgian) |
| Anthropic API | `lib/anthropic.ts` `resolveAnthropicKey()` | AI for descriptive text generation (optional) |
| Supabase Storage | existing `dmt-inventory` bucket pattern | new `dmt-offers-pdfs` bucket for generated PDFs |
| `dmt_offers` table | from Task 037 | source data |

## What to build

### Phase A — Document template structure

**Template:** Static page matching the existing "კომერციული წინადადება" layout from
`docs/templates/offer-template-reference.pdf` (or screenshot in task assets).

**Page 1 — Header:**
```
                    [DMT LOGO]
                    
დოკუმენტი:           პროცედურების მართვის ფაილი SOP.8.2.5.COFR.{{docNumber}}
ფაილის შინაარსი:     SOP-8.2.5-COFR-{{docNumber}} კომერციული წინადადება .docx
დოკუმენტის ვერსია:   V.1-25/2026

                    კომერციული წინადადება
                    დოკუმენტის N  SOP.8.2.5.COFR.218.{{date}}

┌──────────────────────────────────────┐
│ მომსახურების გამწევი                 │
│ (FIXED — DMT data)                    │
├──────────────────────────────────────┤
│ დასახელება:           შპს ციფრული მართვის ტექნოლოგიები │
│ საიდენტიფიკაციო კოდი: 405285926                       │
│ მომსახურე ბანკი:      სს საქართველოს ბანკი            │
│ ანგარიშსწორების ანგარიში: GE94BG0000000101388853GEL    │
│ ბანკის კოდი:          BAGAGE 22                       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ მომსახურების მიმღები                 │
│ (DYNAMIC — from offer.client)         │
├──────────────────────────────────────┤
│ დასახელება:           {{clientCompany}}     │
│ საიდენტიფიკაციო კოდი: {{clientTaxId}}       │
└──────────────────────────────────────┘
```

**Page 2 — Body:**
```
1. კომერციული წინადადება

{{leadCompanyName}}-ის საინჟინრო სისტემების დათვალიერების შედეგად დადგინდა, რომ
შენობაში შესაძლებელია HVAC სისტემების ავტომატიზაცია... [FIXED INTRODUCTION TEXT]

ციფრული მართვის ტექნოლოგიების დანერგვისთვის საჭიროა შემდეგ დანადგარებზე
კონტროლერების დაერთება:

┌────┬───────────────────────────────────────┬──────┬─────┬───────┬───────┬──────┬──────┐
│ N  │ დასახელება                            │ განზ.│ რაოდ.│ ფასი  │ ჯამი  │ ხელ. │ ჯამი │
├────┼───────────────────────────────────────┼──────┼─────┼───────┼───────┼──────┼──────┤
│ 1  │ {{item.name}}                         │ ცალი │ {{q}}│ {{p}} │ {{lt}}│{{lh}}│{{lh*q}}
│ ...│ (ROWS DYNAMIC — from offer.items)     │      │      │       │       │      │      │
└────┴───────────────────────────────────────┴──────┴─────┴───────┴───────┴──────┴──────┘
                                                          {{subtotal}}        {{laborTotal}}

┌────────────────────────────────────────────┬────────┐
│ პროდუქციის ღირებულება (დღგ-ს ჩათვლით)       │ {{subtotal}}     │
│ ხელობა (გადასახდების ჩათვლით)               │ {{laborTotal}}   │
│ ჯამი                                        │ {{sum}}          │
│ კომერციული მოგება                  {{margin%}} │ {{marginAmount}} │
│ სულ ჯამი                                    │ {{grandTotal}}   │
└────────────────────────────────────────────┴────────┘

სისტემის დანერგვისთვის საჭიროა {{itemsCount}} ერთეული კონტროლერის მონტაჟი,
საერთო ღირებულებით {{grandTotal}}₾ დღგ-ის ჩათვლით

სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ        [FIXED]

{{IF includeMoneyBackGuarantee}}
შენიშვნა: იმ შემთხვევაში, თუ სისტემით სარგებლობის შემთხვევაში დამკვეთის
დანაზოგები არ იქნება მინიმუმ 3 ჯერ მეტი ვიდრე ყოველთვიური სააბონენტო
გადასახადი, შემსრულებელი იღებს ვალდებულებას, რომ დამკვეთს დაუბრუნებს
სისტემის ინტეგრაციაში გადახდილ თანხებს 100% ით. საცდელი პერიოდი შეადგენს სამ თვეს.
[CONDITIONAL — toggle in offer settings]
{{/IF}}

შემოთავაზება მოიცავს

პროგრამული უზრუნველყოფის პაკეტი მოიცავს:                    [FIXED 13-POINT LIST]
1. ქართული მენიუ პროგრამულ უზრუნველყოფაზე.
2. მობილური აპლიკაციით სარგებლობა.
3. მონტაჟისთვის საჭირო მასალებს...
   [...all 13 points fixed]
13. შესრულებული სამუშაოების მონიტორინგს.

ამასთან, მომავალში დამატებული ფუნქციონალისა და განახლებების გამოყენებას
სრულიად უფასოდ.
```

**Page 3 — Signatures:**
```
                    მხარეთა ხელმოწერები:

მომსახურების გამწევი
შპს ციფრული მართვის ტექნოლოგიები                   [FIXED]
დირექტორი: გ. მერებაშვილი    ____________________

მომსახურების მიმღები
{{clientCompany}}                                  [DYNAMIC]
ს/კ: {{clientTaxId}}
დირექტორი:                  ____________________

[FOOTER — FIXED, all pages]
საავტორო უფლებები საქპატენტი:
დეპონირების რეგისტრაციის #8973...
დეპონირების რეგისტრაციის #8993...                  [+ small Sakpatenti emblem]
```

### Calculations — auto-computed (critical)

**ყველა totals ავტომატურად გამოითვლება** — user ხელით არ ცვლის grand_total / margin_amount. ცვლის მხოლოდ "input" ველებს: qty, unit_price, labor_per_unit, margin_percent. Output ველები live recalculate-დება.

**Formulas:**

```typescript
// Per-item (each row):
line_subtotal = qty × unit_price                    // ჯამი (პროდუქტი)
line_labor    = qty × labor_per_unit                 // ჯამი (ხელობა) — labor_per_unit შეიძლება null/0
line_total    = line_subtotal + line_labor           // line "ჯამი" column

// Aggregates:
subtotal       = SUM(line_subtotals)                 // პროდუქციის ღირებულება
labor_total    = SUM(line_labors)                    // ხელობა
sum            = subtotal + labor_total              // ჯამი (before margin)
margin_amount  = sum × (margin_percent / 100)        // კომერციული მოგება
grand_total    = sum + margin_amount                 // სულ ჯამი
```

**VAT handling:**
- რეფერენს PDF-ში "დღგ-ის ჩათვლით" — ანუ ფასები **VAT-included**.
- თუ `vat_rate` set (e.g., 18) — ფორმულები ცარცის უცვლელი (ფასი include-ს). VAT line shown as informational.
- თუ `vat_rate` null — VAT row hidden in PDF.

**Frontend (offer editor) — live recalc:**

```tsx
// In OfferEditor component:
const totals = useMemo(() => {
  const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);
  const labor_total = items.reduce((s, i) => s + (i.qty * (i.labor_per_unit || 0)), 0);
  const sum = subtotal + labor_total;
  const margin_amount = sum * (margin_percent / 100);
  const grand_total = sum + margin_amount;
  return {subtotal, labor_total, sum, margin_amount, grand_total};
}, [items, margin_percent]);

// On every items/margin change → totals update instantly in UI.
// On save → server validates by recomputing (don't trust client values).
```

**Server-side validation (in `generate-pdf` and `PATCH /api/dmt/offers/[id]`):**

Recompute totals on backend. Compare with client-sent values (warn if differ). PDF uses recomputed values to ensure correctness.

**Edge cases:**
- `qty = 0` → row included but line_total = 0
- `unit_price = null` → treat as 0 (warn user in UI)
- `margin_percent = 0` → margin_amount = 0 (no profit row in PDF, OR show with 0)
- `labor_per_unit = null` → entire labor column hidden? OR show 0? **Recommend: show 0 if any item has labor; hide column if NO item has labor.**

### Items table — DYNAMIC row count (critical)

**Items table უნდა იყოს fully dynamic — 1 to N rows.** Reference PDF-ში 7 row არის — ეს არ არის ლიმიტი.

- **Row count:** ნებისმიერი რაოდენობა (1, 7, 50, 100+) — `dmt_offers.items` JSONB array-ის სიგრძე განსაზღვრავს
- **Item types:** ორივე — inventory SKU-დან (`source: 'inventory'`) AND custom free-text (`source: 'custom'`)
- **Page break handling:**
  - თუ items + summary table გადააჭარბებს pdf page height-ს → continue on next page
  - Each new page repeats: header (smaller), table column headers
  - Page numbering: "გვერდი X of Y"
  - Summary block (subtotal/labor/margin/total) ALWAYS on the LAST item-related page (not separate page)
- **Empty rows:** if 0 items → don't render table at all, show notice "ნივთები არ არის ჩამატებული"

**pdf-lib row layout:**
```typescript
const ROW_HEIGHT = 18; // pt
const TABLE_TOP_Y = startY;
const PAGE_BOTTOM_MARGIN = 80; // bottom space for page footer

let currentY = TABLE_TOP_Y - HEADER_ROW_HEIGHT;
let currentPage = page;

for (const item of items) {
  if (currentY - ROW_HEIGHT < PAGE_BOTTOM_MARGIN) {
    // Move to next page
    currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    drawTableHeaders(currentPage, TABLE_TOP_Y);
    currentY = TABLE_TOP_Y - HEADER_ROW_HEIGHT;
  }
  drawItemRow(currentPage, currentY, item);
  currentY -= ROW_HEIGHT;
}

// Summary block right after last row (same page if possible)
drawSummaryBlock(currentPage, currentY - 20);
```

### Phase B — Data binding to dmt_offers

`dmt_offers` row provides:
- `id` (O-NNNN), but doc number is separate sequence (see below)
- `lead_id` → join `dmt_manual_leads` for client info
- `items` JSONB → table rows (each: name, qty, unit_price, labor_per_unit?, source)
- `subtotal`, `vat_rate`, `vat_amount`, `total`, `currency`
- `delivery_terms`, `payment_terms`, `notes`

**Migration `0069_dmt_offer_pdf_meta.sql`** — add fields needed for PDF:

```sql
alter table public.dmt_offers
  add column if not exists doc_number int,                    -- sequential 219, 220, 221... separate from O-NNNN
  add column if not exists doc_date date not null default current_date,
  add column if not exists labor_per_unit numeric(10,2),      -- ხელობა per item line (separate from price)
  add column if not exists labor_total numeric(12,2),         -- sum of (qty * labor_per_unit)
  add column if not exists margin_percent numeric(5,2) default 15,  -- კომერციული მოგება %
  add column if not exists margin_amount numeric(12,2),
  add column if not exists include_money_back_guarantee boolean not null default true,
  add column if not exists pdf_url text,                       -- generated PDF URL from Storage
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_generated_by text,
  add column if not exists pdf_doc_size_bytes int;

create unique index if not exists dmt_offers_doc_number_idx
  on public.dmt_offers (doc_number) where doc_number is not null;
```

**Doc number sequence:**
```sql
create sequence if not exists dmt_offer_doc_seq start with 219;
```
Or generate server-side: `select max(doc_number) + 1 from dmt_offers`. Use sequence for atomicity.

### Phase C — PDF generation API

`POST /api/dmt/offers/[id]/generate-pdf`

**Logic:**
1. Auth `requireDmtUser()`
2. Fetch offer + lead
3. Compute totals if not stored:
   - `subtotal` = sum(qty × unit_price)
   - `labor_total` = sum(qty × labor_per_unit) — if labor_per_unit set
   - `sum` = subtotal + labor_total
   - `margin_amount` = sum × (margin_percent / 100)
   - `grand_total` = sum + margin_amount
4. Allocate doc_number if not yet (via sequence)
5. Render PDF using `pdf-lib`:
   - Load Georgian font from `public/fonts/` (existing in project)
   - Embed DMT logo from `public/dmt/logo.png`
   - Embed Sakpatenti emblem from `public/dmt/sakpatenti.png` (or similar)
   - Layout per template above
6. Upload PDF to Supabase Storage `dmt-offers-pdfs` bucket
   - Path: `offers/{offer_id}-v{version}.pdf`
7. Update `dmt_offers`: `pdf_url`, `pdf_generated_at`, `pdf_generated_by`, `pdf_doc_size_bytes`
8. Audit: `dmt_offers_audit` action='generate_pdf'
9. Return `{ pdf_url, doc_number, total }`

### Phase D — Frontend: Preview + Download

In offer editor (Task 037 component):
- Add "📄 PDF გენერაცია" button
- On click → POST to generate-pdf endpoint
- Show toast "PDF მზად არის — ჩამოტვირთვა"
- Open PDF in new tab + show download icon next to offer ID

In offer list:
- Each row with `pdf_url` shows "📄 PDF" badge link → opens PDF

### Phase E — AI optional enhancement (NOT critical)

Anthropic Claude can be used for:
1. **Item description enhancement** — if user enters short item name, Claude expands description
2. **Notes refinement** — Claude proofreads/translates user notes
3. **Smart line item suggestions** — based on lead inventory photos (link to Task 037 Phase B)

**For first version: SKIP AI — direct template fill from offer data.**
Add AI later as separate task once base PDF generation works.

## Files to create

```
supabase/migrations/0069_dmt_offer_pdf_meta.sql

app/api/dmt/offers/[id]/generate-pdf/route.ts
app/api/dmt/offers/[id]/pdf/route.ts                    (GET — proxy/download)

lib/dmt/pdf/offer-template.ts                            (template renderer)
lib/dmt/pdf/fonts.ts                                     (Georgian font loader)
lib/dmt/pdf/colors.ts                                    (DMT brand colors)

components/dmt/offer-pdf-preview.tsx                     (modal with iframe preview + download)
```

## Files to modify

```
components/dmt/offer-editor.tsx                          — add "PDF გენერაცია" button
components/dmt/offer-list.tsx                            — show PDF link badge
lib/dmt/offers-store.ts                                  — generatePdf API client function
lib/dmt/shared-state-server.ts                           — extend offerFromDb/toDb with new fields
```

## Static assets needed

```
public/dmt/logo.png                      (DMT logo for header)
public/dmt/sakpatenti.png                (Sakpatenti emblem for footer)
public/fonts/sylfaen.ttf  OR  noto-sans-georgian.ttf  (Georgian font for pdf-lib)
```

If assets don't exist, Codex should:
1. Check if logo files exist anywhere in repo (e.g., `public/`, `app/icons/`)
2. If not — leave placeholder, note in implementation doc, ask user

## Acceptance criteria

✅ Migration `0069` apply-დება + `dmt_offer_doc_seq` sequence created
✅ POST `/api/dmt/offers/[id]/generate-pdf` returns 201 with `{ pdf_url, doc_number, total }`
✅ PDF saved to Supabase Storage `dmt-offers-pdfs` bucket
✅ PDF visually matches reference template (header, items table, totals, signature block)
✅ Georgian text renders correctly (no boxes/missing glyphs)
✅ DMT logo + Sakpatenti emblem embedded
✅ Doc number sequential (219 → 220 → ...)
✅ Items table dynamic from `dmt_offers.items` JSONB — supports 1 to N items (no 7-row limit)
✅ Custom items (`source: 'custom'`) render same as inventory items in table
✅ Page break works — overflow rows continue on page 2/3 with repeated table headers
✅ Summary block (subtotal/totals) stays on last item page, not separate
✅ **Live calculation in editor** — qty/price/labor/margin% change → totals update instantly
✅ **Server-side recompute** in PDF generation (don't trust client totals)
✅ Per-item: line_subtotal, line_labor, line_total computed correctly
✅ Aggregates: subtotal + labor_total = sum; margin_amount = sum × margin%; grand_total = sum + margin_amount
✅ Edge cases handled: qty=0, missing labor, margin=0
✅ Labor column auto-hidden if no item has labor_per_unit set
✅ Totals math correct (subtotal + labor + margin = grand total)
✅ Money-back guarantee paragraph conditional on `include_money_back_guarantee` flag
✅ Client section pulls from `dmt_manual_leads` via `lead_id` join
✅ Generate button in offer editor works
✅ PDF link visible in offer list with download
✅ Re-generate creates new version (overwrites or v2 — choose: overwrite for simplicity)
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული

## Out of scope (future)

- **AI-enhanced descriptions** — Phase E, separate task
- **Email send to client** — separate task (SMTP)
- **Public client view + e-sign** — separate task (already mentioned in Task 037 out-of-scope)
- **Multi-language offer** (English version) — future
- **Custom logo per company** — fixed DMT for now
- **Offer template versioning UI** — fixed in code
- **Document watermark** ("DRAFT" overlay before sent) — nice-to-have

## Notes

- **pdf-lib + Georgian text:** must use `@pdf-lib/fontkit` to embed Georgian Unicode font. Standard PDF fonts don't support Georgian. Use Sylfaen (Windows default) or download `Noto Sans Georgian`.
- **Layout:** A4 portrait, ~595x842 pt. Use coordinate-based drawing for tight match with reference. Or HTML-to-PDF library like `puppeteer` if precision is critical (BUT puppeteer is heavy — recommend `pdf-lib` for now).
- **Color tokens:** match existing site palette (navy, blue accents). DMT logo dictates the blue.
- **Doc number sequence:** Postgres SEQUENCE is atomic. Don't compute in app code (race condition).
- **VAT note:** the totals already include VAT in the reference — ensure `subtotal` definition matches (with or without VAT).
- **AI integration:** SKIP for v1. Pure template fill is enough. Add AI in v2 task.

## Test plan

1. `supabase migration up` (apply 0069)
2. `npm run dev` → http://localhost:3000/dmt/leads/manual
3. Login admin
4. Open lead detail drawer → ოფერები tab
5. Create draft offer with 3 items + 15% margin + delivery 30 days
6. Click "📄 PDF გენერაცია" → wait
7. PDF opens in new tab — verify:
   - Header doc number = 219 (or next)
   - Date = today
   - DMT info correct
   - Client info matches lead's company + tax ID
   - Items table renders all 3 rows with correct totals
   - Subtotal/labor/margin/grand total math checks
   - Money-back paragraph visible (default on)
   - 13-point feature list intact
   - Footer Sakpatenti notice present
   - Signature block at end
8. Toggle "money-back guarantee" off → regenerate → paragraph hidden
9. Generate second offer → doc number = 220
10. Refresh offer list → PDF badge visible per row
11. Mobile: verify PDF download works (link click)
