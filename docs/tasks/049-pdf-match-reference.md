# Task 049 — PDF: match reference (აურა ფიტნესი.pdf) typography + layout exactly

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 043 / 044 / 047 — final PDF polish
**Reference asset:** [`~/Downloads/აურა ფიტნესი.pdf`](attached) — 3-page commercial offer that the user wants the engine to reproduce 1:1
**Scope:** [`lib/dmt/pdf/offer-template.ts`](../../lib/dmt/pdf/offer-template.ts) + [`lib/dmt/pdf/colors.ts`](../../lib/dmt/pdf/colors.ts) + emblem asset

## ⚠️ MUST READ — NO DELETIONS

- ✅ ფიჩერი/ფილდი/column DB-ში არსად არ ვშლით — only visual PDF tuning
- ✅ STRICTLY DMT offer PDF scope
- ✅ Existing offers must continue to render without errors
- ✅ Reference PDF is the source of truth for typography decisions

## პრობლემა (User-asked 2026-05-07)

User-მა მოაწოდა sample PDF (`აურა ფიტნესი.pdf`) and explicitly requested:

> "PLEASE Copy exactly same ui in our code"

> "make texts bolds similarly to the sample pdf"

ე.ი. generated PDF-ი **ვიზუალურად ემთხვევა reference-ს** — typography hierarchy, color palette, layout rhythm, bold/regular weight mix — ერთი-ერთზე.

## STATUS — Claude direct fix pass (already shipped 2026-05-07)

Claude უკვე დაიხურა Task-ის ძირითადი ნაწილი. ეს დოკუმენტი მსახურობს როგორც **verification checklist** + edge-case backlog.

### 🟢 Shipped changes (verify in browser)

#### A. Page 1 header
- ✅ ICON+wordmark side-by-side → **wordmark only** (sazeo, scale 0.30, centered)
- ✅ `LOGO_TOP_GAP = 80`, breathing room above metadata table
- ✅ Filename in metadata: `.pdf` → **`.docx`** (matches DOCX-converted reference)

#### B. DocId line below page title
- ✅ Drop offer.id suffix (`· O-XXX`) — only `SOP.8.2.5.COFR.NNN.DD.MM.YYYY`
- ✅ Date format: ISO `YYYY-MM-DD` → **DD.MM.YYYY** (`formatDocDateDDMMYYYY` helper)
- ✅ Bold + dark (was muted regular)

#### C. Provider company restored
- ✅ "შპს საზეო" (incorrect previous attempt) → **"შპს ციფრული მართვის ტექნოლოგიები"** restored at 3 sites:
  - Provider box `დასახელება:` value
  - Page 2 intro paragraph (no longer mentions "საზეოს ციფრული")
  - Signature page provider name

#### D. Color palette
- ✅ `PDF_COLORS.navy = rgb(0.10, 0.20, 0.45)` (sazeo brand navy)
- ✅ `PDF_COLORS.blue = rgb(0.18, 0.40, 0.85)` (accent blue)
- ✅ Section titles ("1. კომერციული წინადადება", "შემოთავაზება მოიცავს") render in `PDF_COLORS.blue`
- ✅ Box headers + page title in `PDF_COLORS.navy`

#### E. Page 2 intro paragraph
- ✅ Restored full reference text: "...HVAC სისტემების ავტომატიზაცია, ონლაინ მართვა, ტემპერატურების კონტროლი სხვადასხვა სივრცეში, ავარიების დროული იდენტიფიცირება..."
- ✅ Second intro: "ციფრული მართვის ტექნოლოგიების დანერგვისთვის საჭიროა შემდეგ დანადგარებზე კონტროლერების დაერთება:"

#### F. Summary + subscription lines (page 2)
- ✅ Word "პოზიციის" → **"კონტროლერის მონტაჟი"** (matches reference)
- ✅ Currency: `XX.XX GEL` → **`XX.XX₾`** via `fmtMoneyLari()` helper
- ✅ Discount format: separate bold parenthetical → **inline** `(ფასდაკლება N% - X₾)`
- ✅ Entire summary sentence in **bold** weight (matches reference)
- ✅ Subscription line entire **bold**: `სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ`
- ✅ Optional clause `ნაცვლად 200 ლარისა` appended when `subscription < 200₾`

#### G. Feature list bold keywords (13 items, semantic emphasis)
- ✅ #1 **ქართული მენიუ**, #2 **მობილური აპლიკაციით**, #4 **ტრენინგს**, #5 **უფასო ტექნიკურ მხარდაჭერას**
- ✅ #6 **მხარდაჭერის გუნდთან მუდმივ წვდომას და პირად მენეჯერს**
- ✅ #7 **ავტომატიზაციას** (newly added in this pass)
- ✅ #9 **ავარიების ჩანაწერების**, #11 **უფასო სმს და ელ.ფოსტის შეტყობინებებს**, #13 **მონიტორინგს**
- ✅ List header "პროგრამული უზრუნველყოფის პაკეტი მოიცავს:" rendered bold
- ✅ Helper `drawWrappedRich(segments, ...)` supports mixed-weight token wrapping

#### H. Continuation page header (drawSmallHeader)
- ✅ Removed top-right offer.id text (it overlapped logo)
- ✅ "დოკუმენტი:" label muted regular, "**SOP-8.2.5-COFR-NNN**" bold dark, " .docx" suffix muted

#### I. Page 2+ top-right corner
- ✅ Icon → **sazeo wordmark** (scale 0.07)

#### J. Signature page (drawSignatures)
- ✅ Provider company "შპს ციფრული მართვის ტექნოლოგიები" — bold
- ✅ "დირექტორი: გ. მერებაშვილი" — bold
- ✅ Recipient company name — bold
- ✅ "ს/კ: ..." — bold (when tax ID present)
- ✅ "დირექტორი:" — bold

#### K. Footer copyright (drawFooters)
- ✅ "**საავტორო უფლებები საქპატენტი:**" prefix bold
- ✅ "**დეპონირების რეგისტრაციის #8973**" / "**#8993**" prefixes bold
- ✅ Two-line detailed citation on page 2; compact on page 3
- ✅ Sakpatenti emblem at bottom-right (extracted from reference test.pdf via `scripts/extract-sakpatenti.mjs` — pdf-lib XObject walker + Flate decode + sharp PNG repack)
- ✅ Emblem size bumped to 36×44pt (was 24×24)

### 🔵 Codex verification asks

Codex, please open http://localhost:3000/dmt/invoices, log in as DMT user, create test offer:
- Lead: "აურა ფიტნეს" (or any test lead)
- Items: 17 controllers, total 2370₾
- Discount: 50%
- Subscription: 150₾
- IncludeMoneyBackGuarantee: false (matches reference — no warranty paragraph)
- Generate PDF

Then verify side-by-side with `~/Downloads/აურა ფიტნესი.pdf`:

| Verification | PASS criteria |
|---|---|
| Page 1 logo | Large sazeo wordmark only, centered. NO icon. |
| Page 1 metadata table | 3 rows, plain (no yellow), filename `.docx` |
| Page 1 title | "კომერციული წინადადება" navy bold |
| Page 1 docId | "დოკუმენტის N SOP.8.2.5.COFR.NNN.04.05.2026" bold dark, no offer.id suffix |
| Provider box | "მომსახურების გამწევი:" bold size 12, all 5 rows, "შპს ციფრული მართვის ტექნოლოგიები" first row value bold |
| Recipient box | "მომსახურების მიმღები:" bold size 12, only 2 rows (no contact/phone), company name bold |
| Page 2 top-right | sazeo wordmark, NOT icon |
| Page 2 small header | "დოკუმენტი:" muted, "SOP-8.2.5-COFR-NNN" bold, ".docx" muted |
| Page 2 section title | "1. კომერციული წინადადება" large blue bold centered |
| Page 2 intro | 2 paragraphs, regular text matching reference exactly |
| Page 2 items table | 8 columns, headers + rows, totals row at bottom |
| Page 2 summary line | Entire bold: "სისტემის დანერგვისთვის საჭიროა 17 ერთეული კონტროლერის მონტაჟი, საერთო ღირებულებით 2370₾ დღგ-ის ჩათვლით (ფასდაკლება 50% - 1185₾)." |
| Page 2 subscription | Entire bold: "სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ ნაცვლად 200 ლარისა" |
| Page 2 features section title | "შემოთავაზება მოიცავს" large blue bold centered |
| Page 2 feature list header | "პროგრამული უზრუნველყოფის პაკეტი მოიცავს:" bold |
| Page 2 features 1-10 | Numbered, mixed bold/regular keywords per spec |
| Page 2 footer | Sakpatenti emblem bottom-right; bold prefix "საავტორო უფლებები საქპატენტი: დეპონირების რეგისტრაციის #8973" + body |
| Page 3 features 11-13 | Same bold/regular pattern continues |
| Page 3 "ამასთან..." | Regular paragraph |
| Page 3 signatures title | "მხარეთა ხელმოწერები:" centered navy bold |
| Page 3 provider sig | "მომსახურების გამწევი" navy bold + "შპს ციფრული მართვის ტექნოლოგიები" bold + "დირექტორი: გ. მერებაშვილი" bold + signature line |
| Page 3 recipient sig | "მომსახურების მიმღები" navy bold + recipient company bold + "ს/კ: ..." bold + "დირექტორი:" bold + signature line |
| Page 3 footer | Same as page 2 |
| TypeScript | `npx tsc --noEmit` clean ✓ already verified |

## 🔴 Known remaining gaps (Codex backlog)

These were NOT covered by Claude's direct fix pass; Codex should pick these up:

1. **Items table column widths** — reference has slightly wider "დასახელება" column. Verify `tableColumns()` matches reference proportions.
2. **Items table totals row styling** — reference has a thin horizontal rule above totals row. Currently we draw rectangles around each row; needs visual comparison.
3. **Footer page numbering** — reference uses Georgian "გვერდი N of M" format. We have it on continuation pages but verify font + position match.
4. **"დღგ ინფორმაციულად N%" line** — reference shows it in a smaller muted font below totals box. Verify position + size.
5. **Item description sub-text** — reference doesn't show description sub-text under item names. Verify it's hidden (Task 040 already did this; just confirm no regression).
6. **Margin column header** — reference has "მოგება %" + percent inline in totals row. Check `drawSummary()` column labels.

## Files modified (this pass)

```
lib/dmt/pdf/offer-template.ts    — drawFirstPage / drawSmallHeader / drawIntro / drawSummary / drawGuaranteeAndTerms / drawSignatures / drawFooters
lib/dmt/pdf/colors.ts             — restored navy + blue brand colors
public/dmt/sakpatenti.png         — extracted from reference test.pdf
scripts/extract-sakpatenti.mjs    — emblem extraction utility (pdf-lib AST walker)
```

## Files NOT to touch

- ❌ `app/dmt/invoices/page.tsx` (UI list-view fine)
- ❌ `lib/dmt/offers-store.ts` (data layer fine)
- ❌ Migration files
- ❌ `public/dmt/logo.png` / `wordmark.png` (assets correct)

## Out of scope

- Re-architecting summary box (current works)
- Adding more OfferEditor fields
- Items table sortable columns (separate concern)
- Multi-language PDF (Georgian-only fine)

## Test plan

1. `git pull` (or pull this branch)
2. `npm run dev` → http://localhost:3000
3. Login DMT → /dmt/invoices → ახალი ინვოისი → fill matching აურა ფიტნეს reference data → Generate PDF
4. Open both PDFs side-by-side (browser tabs or PDF viewer split)
5. Walk through verification table above; report any deltas
6. Fix any deltas in `lib/dmt/pdf/offer-template.ts` only — do not change data layer
7. Run `npm run typecheck && npm run lint`
8. Mark this task `[x]` in [docs/TODO.md](../TODO.md) when verified

## Notes for Codex

- Reference PDF was generated from a DOCX template (hence `.docx` filename in metadata) — do NOT change to `.pdf` even though we generate PDF.
- `drawWrappedRich()` is the helper for mixed bold/regular within wrapped text. New rich-text needs should use it; do not introduce yet another wrapper.
- Discount lookup: `offer.discountPercent` is nullable — gate display behind `(value ?? 0) > 0`.
- Subscription `< 200` check uses standard 200₾ as benchmark; clause "ნაცვლად 200 ლარისა" only appears when `monthlySubscription < 200` (matches reference: 150₾ rendered, 200₾ standard).
- pdf-lib coordinate system: Y grows upward, so subtracting moves cursor DOWN.
- Sakpatenti emblem dimensions: source 140×170, render 36×44 (preserves aspect ratio 0.82).
