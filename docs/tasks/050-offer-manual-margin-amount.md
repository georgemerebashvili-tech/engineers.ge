# Task 050 — Offer: optional manual margin AMOUNT override (GEL)

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 037 / 042 / 048 — DMT offers feature parity
**Scope:** New migration `0073_dmt_offers_margin_override.sql` + [`lib/dmt/offers-store.ts`](../../lib/dmt/offers-store.ts) + [`components/dmt/offer-editor.tsx`](../../components/dmt/offer-editor.tsx) + offer API write paths + PDF template

## ⚠️ MUST READ — NO DELETIONS

- ✅ Existing `margin_percent` field stays — DO NOT remove
- ✅ Override is **optional** — null = compute from %, set = use override directly
- ✅ STRICTLY DMT offers scope
- ✅ Existing offers must continue to render with auto-computed margin if override is null

## პრობლემა (User-asked 2026-05-07)

User-მა ცხადად ცნო:

> "კომერციული მოგებაც ხელით უნდა შევიყვანოთ"

ანუ ზოგიერთ შემთხვევაში დამკვეთთან ფიქსირებული ფასი დასჭირდება (e.g., 500₾ margin), რომელიც პროცენტული formula-დან არ გამოიყვანება — სასურველია absolute GEL amount-ის input.

Claude-მა უკვე შეცვალა default `marginPercent: 15 → 0` ([components/dmt/offer-editor.tsx](../../components/dmt/offer-editor.tsx)) რომ user-ი manual-ად შეიყვანდეს %. ეს ნაწილობრივი გადაწყვეტაა — ფული სიდიდით override არ არის.

ეს task — სრული გადაწყვეტა.

## Spec

### Data model

#### Migration `0073_dmt_offers_margin_override.sql`

```sql
alter table public.dmt_offers
  add column if not exists margin_amount_override numeric(12,2);

comment on column public.dmt_offers.margin_amount_override is
  'Optional manual override for commercial margin (in GEL). When NULL, margin is computed from margin_percent. When set, this absolute value is used and margin_percent is recomputed for display only.';
```

⚠️ Run via `npm run db:migrate` (local DATABASE_URL ready).

#### TypeScript types — `lib/dmt/offers-store.ts`

```diff
 export type DmtOffer = {
   …
   marginPercent: number;
   marginAmount: number | null;
+  marginAmountOverride: number | null;
   discountPercent: number | null;
   …
 };

 export type OfferPayload = {
   …
   marginPercent?: number | null;
+  marginAmountOverride?: number | null;
   …
 };
```

`offerFromDb()`: `marginAmountOverride: row.margin_amount_override != null ? Number(row.margin_amount_override) : null`.

#### Totals calculation — `calculateOfferTotals()` + `calculateOfferPdfTotals()`

```ts
const sum = money(subtotal + laborTotal);
const overrideAmount = Number.isFinite(Number(marginAmountOverride)) && marginAmountOverride != null
  ? Math.max(0, Number(marginAmountOverride))
  : null;

// If override set: use it directly + back-calc display percent. Otherwise compute from %.
const marginAmount = overrideAmount != null ? money(overrideAmount) : money(sum * marginPercent / 100);
const effectivePercent = overrideAmount != null && sum > 0
  ? money((overrideAmount / sum) * 100)
  : marginPercent;
```

Return both `marginAmount` (absolute) + `marginPercent` (effective) so PDF + UI can show either consistently.

### API — `app/api/dmt/offers/route.ts` + `[id]/route.ts`

Read `body.marginAmountOverride ?? body.margin_amount_override` via `nullableNumber()` and persist to `margin_amount_override` column. POST + PATCH symmetric.

### UI — `OfferEditor`

Section 3 · ჯამი:

```tsx
<div className="flex items-center justify-between gap-2">
  <span className="text-[11.5px] font-semibold text-text-2">კომერციული მოგება</span>
  <div className="inline-flex items-center gap-1">
    <input
      type="number"
      min={0}
      max={100}
      step="0.5"
      value={marginPercent}
      onChange={(e) => setMarginPercent(Number(e.target.value) || 0)}
      placeholder="%"
      disabled={marginAmountOverride.trim().length > 0}
      className="w-16 …"
    />
    <span>%</span>
    <span className="text-text-3">|</span>
    <input
      type="number"
      min={0}
      step="0.5"
      value={marginAmountOverride}
      onChange={(e) => setMarginAmountOverride(e.target.value)}
      placeholder="₾ ხელით"
      className="w-24 …"
    />
    <span>₾</span>
  </div>
</div>
```

Behavior:
- Empty override → margin computed from `marginPercent × sum / 100`
- Set override → margin uses absolute value, `marginPercent` input becomes disabled (or shows the back-calculated effective %)
- Validation: override ≥ 0; can't be both empty AND marginPercent === 0 (warn but allow — zero margin is valid)

Persist `marginAmountOverride` in `payload()`.

### PDF — `lib/dmt/pdf/offer-template.ts`

`drawSummary()` — margin row:

```ts
[`კომერციული მოგება ${totals.marginPercent}%`, fmtMoneyWithCurrency(totals.marginAmount), false],
```

`totals.marginAmount` already correct (override-aware via `calculateOfferTotals`); `totals.marginPercent` shows effective %. NO additional code change here — just verify the totals helper returns override values when set.

## Acceptance criteria

✅ Migration `0073_dmt_offers_margin_override.sql` applied — column exists, nullable
✅ Existing offers (override = null) render identically — NO regression
✅ TypeScript pass + lint
✅ OfferEditor: margin row has BOTH `%` input AND `₾` override input side-by-side
✅ Setting `₾` override disables `%` field; clearing it re-enables `%`
✅ PDF margin row shows correct effective % + absolute amount when override is used
✅ Totals computation honors override across summary box AND page-1 summary line (`grandTotal` = sum + marginAmount)
✅ Discount calculation (Task 048) continues to work with override-driven margin (applied AFTER margin)
✅ Smoke: create offer, set margin via %, save, generate PDF → correct
✅ Then: edit, set ₾ override, save, regenerate PDF → uses absolute value

## Files to create

```
supabase/migrations/0073_dmt_offers_margin_override.sql    NEW
```

## Files to modify

```
lib/dmt/offers-store.ts               (DmtOffer + OfferPayload + calculateOfferTotals + offerFromDb)
lib/dmt/offers-server.ts              (insert/update payload mapping)
app/api/dmt/offers/route.ts           (POST create — read override)
app/api/dmt/offers/[id]/route.ts      (PATCH update — read override)
components/dmt/offer-editor.tsx       (state + UI + payload)
```

## Files NOT to touch

- ❌ Other DMT pages
- ❌ Discount logic (Task 048 handles AFTER-margin discount; override stays compatible)
- ❌ Logo / wordmark / sakpatenti assets

## Out of scope

- Per-line-item margin (this is offer-wide)
- Negative margin / loss-leader pricing (constrain ≥ 0)
- Auto-suggest margin based on item categories

## Test plan

1. `npm run db:migrate` → migration 0073 applies
2. `npm run typecheck && npm run lint`
3. Existing offer (no override) → totals identical to before
4. New offer with margin% = 15, no override → margin = 15% of sum (existing behavior)
5. New offer with override = 500₾, margin% = 0 → margin = 500₾, % shows back-calc
6. Combined with discount 10% → discount applied to (sum + 500), grand total reduced
7. PDF generation → summary box "კომერციული მოგება N%" shows effective %, amount column = 500.00 GEL
8. Update entry [docs/TODO.md](../TODO.md) → mark Task 050 done

## Notes for Codex

- Override and percent are **mutually-exclusive in UX** but both stored — useful audit trail
- Back-calculated effective % is a **display concern** only; persisted override stays absolute
- `Math.max(0, …)` clamps to non-negative
- `numeric(12,2)` matches existing money column conventions
