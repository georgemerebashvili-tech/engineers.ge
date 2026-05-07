# Task 044 — PDF: bold typography fix · purge yellow · new logo · Sakpatenti emblem

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 038/039/043 — final PDF polish
**Scope:** Backend PDF renderer + static assets
**Depends on:** Task 038 ✅ + asset replacement coordination with user

## ⚠️ MUST READ — NO DELETIONS

- ✅ ყველა field/column/file დარჩება
- ❌ NO DELETIONS

## პრობლემა

1. **ყვითელი background ცარცის ცარცის ცარცის** — recipient table-ში "ტატიშვილის კლინიკა" და "204923262" ცარცის ცარცის yellow highlight-ით; doc number "219" და date "27.04.2026" ცარცის ცარცის yellow boxes
2. **Bold styling გაუმართავი** — ცარცის ცარცის ცარცის ცარცის ცარცის ცარცის ცარცის ცარცის ცარცის ცარცის (e.g., recipient company name should be bold but plain text used)
3. **Sakpatenti emblem (გერბი) არ ჩანს** — page footers don't show the emblem image
4. **DMT logo unupdated** — user uploaded NEW logo (blue circle with white leaf/curve) — need to replace `public/dmt/logo.png`

## What to fix

### A. Purge ALL yellow highlights

`lib/dmt/pdf/offer-template.ts` — search and remove yellow rectangles/text:

1. **`drawMetadataTable`** function — remove the highlight check:
```diff
- const highlight = value.includes(String(docNumber));
- if (highlight) {
-   ctx.page.drawRectangle({x: x + labelW + 7, y: ry + 5, width: w - labelW - 14, height: rowH - 10, color: PDF_COLORS.yellow});
- }
  drawText(ctx, value, x + labelW + 10, ry + 8, 9, {maxWidth: w - labelW - 18});
```

2. **Recipient box** (`drawBox` for "მომსახურების მიმღები") — value cells must NOT have yellow background. Plain.

3. **Money-back paragraph** — no yellow background.

4. **Items table rows** — no yellow row highlights.

5. **`PDF_COLORS.yellow`** — search project-wide for usages. Remove from offer-template.ts. Keep in colors.ts if used elsewhere; otherwise delete.

### B. Bold typography pass

User specifically asked: "ბოლდ ტესტებსაც გადახედე და ისე დააგენერე"

Audit ALL `drawText` calls. Apply `bold: true` consistently for:

| Element | Current | Should be |
|---|---|---|
| Page 1 metadata labels (`დოკუმენტი:`, `ფაილის შინაარსი:`, `დოკუმენტის ვერსია:`) | maybe regular | **bold** |
| "კომერციული წინადადება" title | bold ✓ | bold (verify) |
| "მომსახურების გამწევი" / "მომსახურების მიმღები" header bars | bold | bold (verify) |
| Table column headers (N, დასახელება, რაოდ., etc.) | bold ✓ | bold (verify) |
| **Recipient company name** (`ტატიშვილის კლინიკა`) | regular | **bold** ← user emphasized |
| Items table — item names | regular | **bold** for primary name (per original) |
| "სისტემის დანერგვისთვის..." paragraph | regular | regular (NOT bold per original) |
| "სტანდარტული ყოველთვიური სააბონენტო:" prefix | regular | **bold** prefix; value regular |
| **Money-back "შენიშვნა:" prefix** | regular | **bold** "შენიშვნა:" then regular text |
| "შემოთავაზება მოიცავს" header | bold ✓ | bold blue centered |
| **Bold semantic emphasis** in feature list (e.g., "მობილური აპლიკაციით სარგებლობა", "უფასო ტექნიკურ მხარდაჭერას") | regular | **bold** key words per original |
| Signature page "მომსახურების გამწევი" / "მომსახურების მიმღები" | regular | **bold** |
| Signature page director line "დირექტორი:" | regular | **bold** |
| Page footer "საავტორო უფლებები საქპატენტი:" | regular | **bold** |

### C. Replace DMT logo asset

User has provided a new logo image (blue circle with white leaf curve).

**Action:** User needs to manually save the new logo as `public/dmt/logo.png` — Codex CANNOT save binary images from chat.

**Codex's job:**
1. Verify code reads from `public/dmt/logo.png` (already does in `loadImage` candidates)
2. Test PDF generation reads new asset correctly after user replaces file
3. Adjust `LOGO_SCALE` if needed (maybe 0.10-0.12 for square circular logo to fit nicely)

**User instruction (manual):** save provided image as:
- `c:\Users\Zaza\Desktop\engineers.ge-main\engineers.ge-main\public\dmt\logo.png`

### D. Sakpatenti emblem (გერბი)

Original PDF has a small Sakpatenti coat-of-arms at footer (red/gold heraldic emblem).

**Currently:** code looks for `public/tbc/logos/dmt.png` as fallback — NOT the right image.

**Action:**
1. Add `public/dmt/sakpatenti.png` asset (user provides, OR Codex creates placeholder text-only frame)
2. Update `loadImage` candidates in `offer-template.ts`:
```typescript
const sakpatenti = await loadImage(pdf, [
  path.join(process.cwd(), 'public', 'dmt', 'sakpatenti.png'),
]);
```
3. Adjust footer placement: bottom-right corner of every page, ~30×30pt
4. Caption text below emblem: "საავტორო უფლებები საქპატენტი:" (bold) + 2-line description per original

**Placeholder fallback:** if no `sakpatenti.png` exists, draw a simple gray-bordered rectangle with text "საქპატენტი" inside (so layout doesn't break).

## Acceptance criteria

✅ NO yellow background or text anywhere in generated PDF
✅ All listed elements rendered with **bold** weight per table above
✅ Recipient company name (e.g., "ტატიშვილის კლინიკა") shown bold dark
✅ Recipient tax ID shown plain (no yellow)
✅ Items table: item names bold, sub-descriptions regular
✅ "შენიშვნა:" prefix in money-back paragraph is bold
✅ Subscription line "სტანდარტული ყოველთვიური..." bold prefix
✅ Feature list semantic phrases bold per original
✅ DMT logo: reads `public/dmt/logo.png` (user replaces asset)
✅ Logo scale tested with new circular leaf logo — fits centered without distortion
✅ Sakpatenti emblem visible on every page footer (or labeled placeholder if asset missing)
✅ Footer caption "საავტორო უფლებები საქპატენტი:" bold, full 2-line description matches original
✅ TypeScript pass, ESLint pass

## Files to modify

```
lib/dmt/pdf/offer-template.ts    — purge yellow, bold pass, sakpatenti path, logo scale
lib/dmt/pdf/colors.ts             — remove unused yellow if not referenced elsewhere
```

## Files user must replace manually

```
public/dmt/logo.png         — new circular leaf logo
public/dmt/sakpatenti.png   — Sakpatenti coat of arms (optional; placeholder OK)
```

## Out of scope

- Multi-color logo variants
- Custom logo per offer/company
- Real-time logo upload UI

## Notes

- **UTF-8** preserved
- **Asset replacement strategy:** Codex CANNOT save binary images from chat. The user must save them manually OR Codex generates a placeholder image programmatically (using sharp/canvas) — placeholder is acceptable v1.
- **Font weight:** pdf-lib supports `regular` and `bold` PDFFont. Any "semibold" needs to fall back to bold.
- **Verify visually:** generate PDF after changes and side-by-side compare with `test.pdf`. Report any remaining typography discrepancies.

## Test plan

1. User saves new logo to `public/dmt/logo.png`
2. `npm run dev` → /dmt/invoices
3. Generate PDF for an offer with full data
4. Verify:
   - NO yellow color anywhere
   - Recipient company bold
   - Tax ID plain (no highlight)
   - Money-back "შენიშვნა:" prefix bold
   - Feature list semantic bold matches original
   - DMT logo shows correctly
   - Sakpatenti emblem visible at footer (or placeholder)
5. Compare side-by-side with test.pdf
6. Run typecheck + lint
