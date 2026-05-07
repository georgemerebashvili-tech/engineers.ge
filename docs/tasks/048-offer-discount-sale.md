# Task 048 — Offer: optional sale/discount % field

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 037 / 042 — DMT offers feature parity
**Scope:** [`lib/dmt/offers-store.ts`](../../lib/dmt/offers-store.ts) + [`components/dmt/offer-editor.tsx`](../../components/dmt/offer-editor.tsx) + [`lib/dmt/pdf/offer-template.ts`](../../lib/dmt/pdf/offer-template.ts) + new migration `0072_dmt_offers_discount.sql` + `app/api/dmt/offers/**` write paths

## ⚠️ MUST READ — NO DELETIONS

- ✅ ფიჩერი/ფილდი/column DB-ში არსად არ ვშლით
- ✅ STRICTLY DMT offers scope
- ✅ Discount is **optional** — null/empty = no discount applied (back-compat)
- ✅ Existing offers without discount must continue to render identically (no regression)

## პრობლემა (User-asked 2026-05-07)

User cited the offer summary line in PDF:

> "სისტემის დანერგვისთვის საჭირო 1 ერთეული პოზიციის მიწოდება/მონტაჟი, საერთო ღირებულებით 287.50 GEL დღგ-ს ჩათვლით."

და მიუთითა:

> "აქ შეიძლება იყოს სეილის შემთხვევაში (უნდა აირჩეს პროცენტულობა და დააკლდეს)"

> Sometimes there's a sale — user should pick a discount % and the total should be reduced accordingly.

## Spec

### Data model

Add optional discount% to offer payload + DB row.

#### Migration `0072_dmt_offers_discount.sql`

```sql
alter table public.dmt_offers
  add column if not exists discount_percent numeric(5,2);

-- Optional sanity check: 0–100% range.
alter table public.dmt_offers
  drop constraint if exists dmt_offers_discount_percent_range;
alter table public.dmt_offers
  add constraint dmt_offers_discount_percent_range
  check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));

comment on column public.dmt_offers.discount_percent is
  'Optional sale discount applied to the grand total (after margin). NULL = no discount.';
```

⚠️ Run via `npm run db:migrate` (local DATABASE_URL already set in user's `.env.local`).

#### TypeScript types — `lib/dmt/offers-store.ts`

```diff
 export type DmtOffer = {
   …
   marginPercent: number;
   marginAmount: number | null;
+  discountPercent: number | null;
+  discountAmount: number | null;
   monthlySubscription: number | null;
   …
 };

 export type OfferPayload = {
   …
   marginPercent?: number | null;
+  discountPercent?: number | null;
   …
 };
```

`offerFromDb()` mapper-ში: `discountPercent: row.discount_percent != null ? Number(row.discount_percent) : null`. Compute `discountAmount` from grand-total preview.

#### Totals calculation — `calculateOfferTotals()` + `calculateOfferPdfTotals()`

```ts
const discountPercent = Number.isFinite(Number(offer.discountPercent)) && offer.discountPercent != null
  ? Math.max(0, Math.min(100, Number(offer.discountPercent)))
  : null;
const grandBeforeDiscount = sum + marginAmount;
const discountAmount = discountPercent != null ? money(grandBeforeDiscount * discountPercent / 100) : 0;
const grandTotal = money(grandBeforeDiscount - discountAmount);
```

Return both `grandBeforeDiscount` (pre-discount), `discountPercent`, `discountAmount`, `grandTotal` (post-discount).

### API — `app/api/dmt/offers/route.ts` + `[id]/route.ts`

Read `body.discountPercent ?? body.discount_percent` via `nullableNumber()` and write to `discount_percent` column. Mirror logic in `POST` (create) and `PATCH` (update).

### UI — `OfferEditor` (offer-editor.tsx)

#### Section 3 · ჯამი — add discount input

Below margin% / VAT toggle, add new field:

```tsx
<Field label="ფასდაკლება %">
  <input
    type="number"
    min={0}
    max={100}
    step={0.5}
    value={discountPercent}
    onChange={(e) => setDiscountPercent(e.target.value)}
    placeholder="0"
    className="…"
  />
</Field>
```

Default `''` (empty/no discount).

Update summary breakdown rows (the right panel showing ქვე-ჯამი / ხელობა / მოგება / დღგ / სულ ჯამი):

```tsx
{discountAmount > 0 && (
  <SummaryRow label={`ფასდაკლება ${discountPercent}%`} value={`-${fmtMoney(discountAmount)}`} accent="green" />
)}
```

`სულ ჯამი` already shows the post-discount value via the recomputed totals.

Validation (extend `validationErrors`):
```ts
if (discountPercent.trim() && (Number(discountPercent) < 0 || Number(discountPercent) > 100)) {
  list.push('ფასდაკლება 0-100% დიაპაზონშია');
}
```

Persist `discountPercent` in payload (line 153-170 area).

### PDF — `lib/dmt/pdf/offer-template.ts`

#### `drawSummary()` (right-side totals box)

Currently shows: ქვე-ჯამი / ხელობა / ჯამი / მოგება % / [დღგ ცნობარი] / სულ ჯამი.

Add a row when `offer.discountPercent` is set + > 0:

```ts
if ((offer.discountPercent ?? 0) > 0) {
  drawText(ctx, `ფასდაკლება ${offer.discountPercent}%`, x + 14, ctx.y + 8, 9, {color: PDF_COLORS.muted});
  drawText(ctx, `-${fmtMoney(totals.discountAmount)} GEL`, x + 280 - 14, ctx.y + 8, 9, {align: 'right', color: PDF_COLORS.text});
  ctx.y -= rowH;
}
```

Position: between `მოგება %` row and `სულ ჯამი` row.

#### Page 1 summary line — `drawSummary()` paragraph (line ~450)

Currently: "სისტემის დანერგვისთვის საჭირო N ერთეული პოზიციის მიწოდება/მონტაჟი, საერთო ღირებულებით X GEL დღგ-ს ჩათვლით."

Update to mention discount when applied:

```ts
const grandBefore = totals.grandTotal + (totals.discountAmount ?? 0);
let summary = `სისტემის დანერგვისთვის საჭირო ${totals.items.length} ერთეული პოზიციის მიწოდება/მონტაჟი, `;
if ((offer.discountPercent ?? 0) > 0) {
  summary += `საერთო ღირებულებით ${fmtMoneyWithCurrency(grandBefore)}, ${offer.discountPercent}%-იანი ფასდაკლების შემდეგ — ${fmtMoneyWithCurrency(totals.grandTotal)} დღგ-ს ჩათვლით.`;
} else {
  summary += `საერთო ღირებულებით ${fmtMoneyWithCurrency(totals.grandTotal)} დღგ-ს ჩათვლით.`;
}
```

## Acceptance criteria

✅ Migration `0072_dmt_offers_discount.sql` applied — `select discount_percent from dmt_offers limit 0;` returns 0 rows error-free
✅ DB constraint enforces 0–100% range
✅ Existing offers (discount = null) render identically — NO regression in PDF, summary table, or grand total
✅ OfferEditor shows new "ფასდაკლება %" input in Section 3 · ჯამი
✅ Empty input → no discount applied, no row in summary
✅ Value > 0 → summary row visible (`-X GEL`, green accent), `სულ ჯამი` reduced accordingly
✅ Validation: out-of-range value → blocks save
✅ PDF generation: when discount set, summary breakdown shows extra `ფასდაკლება N%` row + reduced grand total
✅ PDF page 1 summary paragraph: discount-aware sentence variant
✅ TypeScript pass + lint
✅ Smoke: create offer → save → set discount → re-generate PDF → verify visually

## Files to create

```
supabase/migrations/0072_dmt_offers_discount.sql    NEW
```

## Files to modify

```
lib/dmt/offers-store.ts               (types + calculate fns + offerFromDb)
lib/dmt/offers-server.ts              (insert/update offer payload)
lib/dmt/pdf/offer-template.ts         (drawSummary + summary paragraph)
app/api/dmt/offers/route.ts           (POST create — read discountPercent)
app/api/dmt/offers/[id]/route.ts      (PATCH update — read discountPercent)
app/api/dmt/offers/[id]/generate-pdf/route.ts  (mirror to baseOffer if needed)
components/dmt/offer-editor.tsx       (state + input + validation + payload + summary row)
```

## Files NOT to touch

- ❌ Other DMT pages (leads, contacts, inventory)
- ❌ Other offer fields (vatRate, marginPercent, monthlySubscription)
- ❌ Filter/sort/column UI on `/dmt/invoices`
- ❌ Logo / wordmark assets

## Out of scope

- Per-line-item discount (this is offer-wide)
- Coupon codes
- Time-limited / scheduled discounts
- Discount approval workflow

## Test plan

1. `npm run db:migrate` → migration 0072 applies cleanly
2. `npm run typecheck && npm run lint` clean
3. `/dmt/invoices` → ახალი ინვოისი → ლიდი → 1+ items
4. Section 3 · ჯამი — შენიშნე ახალი "ფასდაკლება %" input (placeholder 0)
5. Leave empty → save → generate PDF → identical to current behavior (no regression) ✓
6. Set discount=10 → save → summary breakdown shows ქვე-ჯამი / ხელობა / მოგება / **ფასდაკლება -X GEL (green)** / სულ ჯამი ✓
7. Generate PDF → page 1 summary paragraph mentions both pre/post discount + dedicated row in totals box
8. Set discount=150 → validation blocks (out of range) ✓
9. Open existing offer with no discount → discount field empty → save without changing → no DB drift
10. Update entry [docs/TODO.md](../TODO.md) → mark Task 048 done

## Notes for Codex

- Discount is applied **AFTER margin and VAT** (since the example "287.50 GEL დღგ-ს ჩათვლით" already includes VAT). Apply as final reduction.
- Use `numeric(5,2)` to match existing column conventions (e.g., margin_percent).
- Database-side check enforces 0–100 — UI validation is belt+suspenders.
- "Green accent" in OfferEditor summary row: `text-grn` (already used for დადასტურება status).
- PDF discount color: keep neutral `PDF_COLORS.text` (no brand green) — visible enough; avoid distracting decoration.
