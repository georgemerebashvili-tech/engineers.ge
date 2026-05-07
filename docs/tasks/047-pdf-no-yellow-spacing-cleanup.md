# Task 047 — PDF: remove yellow highlights, add section spacing, hide offer-id near footer logo

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 043 / 044 / 045 — final PDF polish (post-real-logo)
**Scope:** [`lib/dmt/pdf/offer-template.ts`](../../lib/dmt/pdf/offer-template.ts) + [`lib/dmt/pdf/colors.ts`](../../lib/dmt/pdf/colors.ts)

## ⚠️ MUST READ — NO DELETIONS

- ✅ ფიჩერი/ფილდი/column DB-ში არსად არ ვშლით — უბრალოდ ვიზუალური ცვლილებაა PDF-ში
- ✅ STRICTLY DMT offer PDF — სხვა PDF-ებს / გვერდებს არ ვცვლით
- ✅ TypeScript pass + visual verification (open generated PDF) წინასწარი condition

## პრობლემა (User-reported 2026-05-07)

User-მა ნახა generated PDF-ი (post-Task-046) და მოითხოვა შემდეგი fix-ები:

1. **🟡 ყვითელი backgrounds-ი ყველგან მოაშორე.** Task 044/043 ეპოქის yellow purge ცოტა ხნის წინ ნაწილობრივ უკან დაბრუნდა (Task 045-ში, manual-entry hint-ის მიზეზით). User ახლა ცხადად აცხადებს: **ვიზუალში ყვითელი არ უნდა ჩანდეს**. მონაცემი უკვე filled-ია, template hint აღარ საჭიროა.
2. **📏 სექციებს შორის ახლოა.** "სექციები ერთმანეთიგან ძალიან ახლოა". User ხედავს რომ:
   - Logo header → metadata table — gap პატარაა
   - Metadata table → page title ("კომერციული წინადადება") — gap პატარაა
   - Provider box → recipient box — gap პატარაა
   - Items intro → table — gap პატარაა
   - Summary → guarantee paragraph — gap პატარაა
   ვიზუალურად breathing room-ი აკლია სრულ დოკუმენტს.
3. **🔢 Continuation page top-right corner**: footer logo-ს გვერდით ჩანს offer.id რიცხვი (e.g., "O-1816") და overlap-ს ლოგოს. User: "აქ ის რიცხვები მოაშორე". `drawSmallHeader()` line 308 — `offer.id` text-ი top-right-ად — must be removed (or moved away from logo).

## What to fix

### A. Purge ALL yellow

#### A.1 — `lib/dmt/pdf/colors.ts`

```diff
 export const PDF_COLORS = {
   text: rgb(0.13, 0.16, 0.22),
   navy: rgb(0.07, 0.10, 0.16),
   blue: rgb(0.07, 0.10, 0.16),
   muted: rgb(0.45, 0.50, 0.58),
   line: rgb(0.78, 0.82, 0.88),
   soft: rgb(0.95, 0.97, 0.99),
-  yellow: rgb(0.99, 0.92, 0.40),
   white: rgb(1, 1, 1)
 };
```

თუ `PDF_COLORS.yellow` სხვაგან გამოიყენება (Grep-ით ნახე) — ჯერ უნდა ამოიღო ის references-იც, მერე ცვლადი.

#### A.2 — `lib/dmt/pdf/offer-template.ts`

- `drawMetadataTable()`-ში წაშალე `highlight` branch (yellow rectangle + bold value). რჩება plain text only.
- `drawBox()`-ში წაშალე `highlightValues` option (yellow rectangle + bold value). რჩება plain text only.
- `drawFirstPage()`-ში remove `{highlightIndices: [0, 1]}` arg from `drawMetadataTable` call.
- `drawFirstPage()`-ში remove `{highlightValues: true}` arg from `drawBox(... 'მომსახურების მიმღები' ...)` call.
- Verify: `npm run dev` → generate PDF → page 1 metadata table-ში არცერთი yellow rectangle. "მომსახურების მიმღები" box-ში არცერთი yellow.

### B. Increase section spacing

ცოცხლად ცხადი fix list (current values → new values):

| Location | Current gap | New gap | Note |
|---|---|---|---|
| `drawFirstPage()` after `drawMetadataTable()`: `y -= 24` | 24 | **40** | logo+meta → page title |
| `drawFirstPage()` after page title: `y -= 20` | 20 | **28** | title → docId line |
| `drawFirstPage()` after docId: `y -= 34` | 34 | **48** | docId → provider box |
| `drawFirstPage()` after provider box: `+ 20` | 20 | **32** | provider → recipient |
| `drawIntro()` after first paragraph: `+ 14` | 14 | **22** | intro p1 → intro p2 |
| `drawIntro()` after second paragraph: `+ 12` | 12 | **22** | intro → items table |
| `drawSummary()` (locate `ctx.y -= 28`) | 28 | **40** | summary → guarantee |
| `drawGuaranteeAndTerms()` after note paragraph: `- 8` cursor | 8 | **20** | guarantee → features header |
| `drawGuaranteeAndTerms()` features header: `ctx.y -= 22` | 22 | **30** | "შემოთავაზება მოიცავს" → first list item |
| `drawGuaranteeAndTerms()` between feature list items: `ctx.y -= 17` | 17 | **20** | each feature → next |

**Note:** numbers above are guidance. Codex should eyeball-verify the final PDF — if any specific gap looks excessive (>2x neighboring breathing room), trim back. Goal is *consistent* breathing room, not random padding.

### C. Remove offer.id text from continuation header

`drawSmallHeader()` ([offer-template.ts](../../lib/dmt/pdf/offer-template.ts) ~ line 308):

```diff
 function drawSmallHeader(ctx: DrawCtx, title: string, offer: DmtOffer, docNumber: number) {
   drawText(ctx, `დოკუმენტი: SOP-8.2.5-COFR-${docNumber} კომერციული წინადადება .pdf`, M, PAGE_H - 42, 8.5, {color: PDF_COLORS.muted, maxWidth: CONTENT_W - 90});
-  drawText(ctx, offer.id, PAGE_W - M, PAGE_H - 42, 8.5, {align: 'right', color: PDF_COLORS.muted});
   drawText(ctx, `შინაარსი: ${title}`, M, PAGE_H - 58, 9, {bold: true, color: PDF_COLORS.navy, maxWidth: CONTENT_W});
   drawRule(ctx, PAGE_H - 70);
   ctx.y = PAGE_H - 92;
 }
```

⚠️ **არ წაშალო `offer.id` სრულად** — სადმე სხვაგან mainadinia (e.g., page 1 docId line `· ${offer.id}`). Just remove the top-right rendering on continuation pages, since it overlaps with the small logo positioned at the same `PAGE_H - 38` corner.

თუ user-მა გადაიფიქრა და სურდა offer.id-ის display continuation page-ზე — გადაიტანე bottom-left footer-ზე, არა top-right-ზე.

## Acceptance criteria

✅ `Grep -n "yellow" lib/dmt/pdf/` → 0 matches (გარდა გამოყენების)
✅ `PDF_COLORS.yellow` removed if no remaining usage; otherwise kept but unreferenced
✅ Generated PDF page 1: metadata table + recipient box — both plain (no yellow rectangles, no bold values)
✅ Generated PDF page 1+: section spacing visibly increased per table above; document feels more breathable
✅ Continuation pages (2, 3, 4): top-right corner shows ONLY small logo, NOT offer.id text overlap
✅ TypeScript pass (`npx tsc --noEmit`)
✅ ESLint pass
✅ `npm run dev` + open `/dmt/invoices` → generate PDF → verify all 3 changes visible

## Files to modify

```
lib/dmt/pdf/colors.ts            — remove yellow color
lib/dmt/pdf/offer-template.ts    — remove highlight branches, add spacing, drop offer.id from drawSmallHeader
```

## Files NOT to touch

- ❌ `app/dmt/invoices/page.tsx` (UI is fine)
- ❌ `lib/dmt/offers-store.ts` (data layer fine)
- ❌ Any migration files
- ❌ Logo / wordmark assets (they're already correct)

## Out of scope

- New section ordering / layout restructure
- New pages or page count change
- Color palette redesign beyond removing yellow
- Sakpatenti emblem (separate task once user provides asset)
- Wordmark sizing tweaks

## Test plan

1. `Grep -n "PDF_COLORS.yellow\|highlightIndices\|highlightValues" lib/dmt/pdf/` → 0 matches
2. `npm run dev` (or use existing PID 15868)
3. Browser: http://localhost:3000/dmt/invoices → ახალი ინვოისი → ლიდი → 1+ items → "PDF გენერაცია"
4. Inspect page 1:
   - Metadata table: 3 rows plain (no yellow, no bold values) ✓
   - Page title "კომერციული წინადადება" — visible whitespace before/after ✓
   - "მომსახურების მიმღები" box: 2 rows (კომპანია + tax ID), plain text, no yellow, no bold ✓
5. Inspect page 2+:
   - Top-right corner: only logo icon, no text overlap ✓
   - Section spacing visibly more generous than before ✓
6. Run `npm run typecheck && npm run lint`
7. Update [docs/TODO.md](../TODO.md) entry → mark Task 047 done

## Notes for Codex

- All `ctx.y -= N` and `+ N` adjustments after `drawWrapped/drawBox/drawMetadataTable` are vertical spacing knobs. The values in the table are starting points; eyeball verify.
- pdf-lib coordinates: y-axis grows UP, so subtracting from `y` moves cursor DOWN.
- `ensureSpace(ctx, needed, label)` calls add a new page if cursor too low — keep them.
- After spacing increases, page count may grow (e.g., 4 → 5). That's acceptable per user — they prioritized breathing room over density.
- Manual-entry hint that user originally wanted (yellow + bold) is now explicitly **deprecated** by the user. Don't reintroduce.
