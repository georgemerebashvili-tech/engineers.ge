# Task 043 — PDF: match original test.pdf typography exactly · remove ALL yellow highlights

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 037/038/039/041 — PDF rendering polish
**Scope:** Backend only — `lib/dmt/pdf/offer-template.ts` + colors.ts
**Depends on:** Task 038 ✅ + Task 041 (yellow override fields)

## ⚠️ MUST READ — NO DELETIONS

- ✅ ყველა field/column/file დარჩება — only visual changes
- ❌ NO DELETIONS
- ❌ Don't touch other PDFs (TBC etc.)

## პრობლემა

User-მა ხელახლა გამიგზავნა ორიგინალი `test.pdf` და მოითხოვა:

1. **Generated PDF ვიზუალურად ზუსტად ემთხვეოდეს test.pdf-ს**
   - მუქი/მკაფიო ფონტი (bold headings)
   - Layout წონის გადანაწილება ცარცის
   - Typography hierarchy (size + weight) როგორც ორიგინალში

2. **ყვითელი ფერი სრულად მოშორდეს ყველგან**
   - Original test.pdf-ში ყვითელი = "this is dynamic input field" (template hint)
   - Generated PDF-ში არ უნდა იყოს ყვითელი — დინამიური ველები ცარცის ცარცის უკვე filled რეალური მონაცემით
   - **NO yellow background, NO yellow highlight, NO yellow accent ANYWHERE in the generated PDF**

## What to remove

### Yellow highlights to PURGE

[lib/dmt/pdf/offer-template.ts](../../lib/dmt/pdf/offer-template.ts) — search for ALL usages of `PDF_COLORS.yellow` (or any yellow rgb/hex value) and remove:

1. **`drawMetadataTable`** — currently highlights doc number value cell:
   ```typescript
   // REMOVE:
   if (highlight) {
     ctx.page.drawRectangle({x: x + labelW + 7, y: ry + 5, ...color: PDF_COLORS.yellow});
   }
   ```
   Just draw value text in normal black, no background.

2. **Money-back guarantee paragraph** — if currently has yellow background:
   ```typescript
   // REMOVE yellow background around the paragraph
   // Keep ONLY the text in black
   ```

3. **Any item table row highlighting** (yellow row backgrounds) — remove

4. **Totals table** (margin row, etc.) — no yellow accents

5. **Signature page** "ს/კ:" / company / director — no yellow background

6. **`PDF_COLORS.yellow`** in [lib/dmt/pdf/colors.ts](../../lib/dmt/pdf/colors.ts) — keep export (could still be used elsewhere) but remove from offer-template.ts usage. OR delete the export if unused project-wide.

## Typography matching

Reference: `test.pdf` provided by user.

### Headings hierarchy

| Element | Original style | Current → Match |
|---|---|---|
| "კომერციული წინადადება" (page 1) | ~22pt bold dark navy | match exactly |
| "დოკუმენტის N SOP..." | ~12pt regular gray | match |
| "მომსახურების გამწევი:" / "მომსახურების მიმღები" | ~13pt bold + light gray bg behind heading row | match |
| "1. კომერციული წინადადება" (page 2) | ~16pt bold blue | match — center aligned |
| "შემოთავაზება მოიცავს" (page 2) | ~16pt bold blue | match — center aligned |
| Numbered features (1-13) | 10.5pt regular | match |
| Specific feature words bold (e.g., "მობილური აპლიკაციით სარგებლობა", "უფასო ტექნიკურ მხარდაჭერას") | Mixed bold | match selectively (semantic emphasis) |
| Footer "საავტორო უფლებები საქპატენტი:" | ~8pt bold dark | match |

### Body text

- All body text: dark navy/black (NOT muted gray)
- Line height ~1.4
- Page margin: 42pt left/right (already set)

### Tables

- Table headers: bold gray on light gray background (no yellow)
- Body rows: alternating none (clean white) — ORIGINAL has subtle row striping but acceptable plain
- Borders: thin gray (0.5-0.8 thickness)
- Numeric cells: right-aligned, mono font

### Color palette (final)

```typescript
// lib/dmt/pdf/colors.ts — keep clean professional palette:
export const PDF_COLORS = {
  text: rgb(0.13, 0.16, 0.22),     // dark navy/black for body text
  navy: rgb(0.10, 0.20, 0.45),     // accent navy for headings
  blue: rgb(0.18, 0.40, 0.85),     // primary accent (feature titles)
  muted: rgb(0.45, 0.50, 0.58),    // subtle gray for labels/captions
  line: rgb(0.78, 0.82, 0.88),     // table borders
  soft: rgb(0.95, 0.97, 0.99),     // section header backgrounds
  // yellow: REMOVED or unused
};
```

If `PDF_COLORS.yellow` exists, **remove all references in offer-template.ts**. Keep the export only if some other file uses it (search project-wide first).

## Layout fidelity checklist

Comparing test.pdf vs generated PDF, fix any mismatches:

### Page 1
- ✅ Logo centered top, scaled appropriately (don't overlap metadata)
- ✅ Metadata 3-row table with light gray label column
- ✅ Title "კომერციული წინადადება" — large, bold, centered
- ✅ Subtitle "დოკუმენტის N..." — regular, centered, gray
- ✅ Provider box: bordered, header bar with bold title
- ✅ Recipient box: same style as provider
- ✅ Border-color: light gray, thickness 1pt

### Page 2
- ✅ Top header strip: small left "გვერდი 2 of 3" + middle "დოკუმენტი:" + DMT logo right
- ✅ Section title "1. კომერციული წინადადება" — centered blue bold
- ✅ Intro paragraph: justified body text
- ✅ Items table: bordered, numeric columns right-aligned
- ✅ Totals box: 2-column (label/value), bordered
- ✅ Bold paragraph "სისტემის დანერგვისთვის..."
- ✅ Subscription line: bold "სტანდარტული ყოველთვიური სააბონენტო:"
- ✅ Money-back paragraph: regular text (no yellow!)
- ✅ "შემოთავაზება მოიცავს" — large bold blue centered
- ✅ Numbered features: indented, semi-bold key phrases
- ✅ Footer: საქპატენტი caption + small emblem

### Page 3
- ✅ Same top header
- ✅ Continuation features 12-13
- ✅ Final note "ამასთან, მომავალში..."
- ✅ Centered bold "მხარეთა ხელმოწერები:"
- ✅ Two signature blocks (provider + recipient) with name + signature line
- ✅ NO yellow on client info

## Acceptance criteria

✅ Side-by-side compare with `test.pdf` — typography matches (headings size/weight/color)
✅ NO yellow background or text anywhere in generated PDF
✅ Body text: dark color (not light gray)
✅ Headings: bold, blue/navy
✅ Tables: clean borders, no yellow
✅ Money-back paragraph: regular text (no highlight)
✅ Signature page: clean black/navy text only
✅ Logo doesn't overlap metadata (Task 038/039 already fixed)
✅ Page numbers correct ("გვერდი N of M")
✅ TypeScript pass, ESLint pass

## Files to modify

```
lib/dmt/pdf/offer-template.ts    — remove yellow refs, adjust typography
lib/dmt/pdf/colors.ts             — remove or unused-mark PDF_COLORS.yellow
```

## Out of scope

- Real Sakpatenti emblem image — use placeholder if needed (separate task)
- Multi-language version
- Custom logo per company
- E-signature
- HTML preview parity

## Notes

- **UTF-8** preserved — no encoding corruption
- **Test method:** generate PDF for an offer with all fields filled (use existing one with O-1004 etc.) and visually compare with `test.pdf` open side-by-side
- **Yellow purge:** grep for `yellow`, `rgb(1.*0.95`, `#ffeb`, `#fff7c2` etc. in `lib/dmt/pdf/*.ts`
- **Don't modify** non-PDF code paths

## Test plan

1. `npm run dev` → /dmt/invoices
2. Generate PDF for existing offer
3. Open in browser — verify:
   - No yellow color anywhere
   - Typography matches test.pdf (headings, body)
   - Layout matches (logo, sections, signatures)
4. Generate PDF for offer WITHOUT money-back guarantee → verify paragraph hidden
5. Generate PDF with no items → empty state without yellow
6. Run typecheck + lint
