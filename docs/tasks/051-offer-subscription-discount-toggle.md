# Task 051 — Offer: subscription discount toggle + manual regular price

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 042 / 048 / 050 — DMT offers feature parity
**Scope:** Migration `0074_dmt_offers_subscription_discount.sql` + [`lib/dmt/offers-store.ts`](../../lib/dmt/offers-store.ts) + [`components/dmt/offer-editor.tsx`](../../components/dmt/offer-editor.tsx) + offer API write paths + PDF template

## ⚠️ MUST READ — NO DELETIONS

- ✅ Existing `monthly_subscription` column stays unchanged
- ✅ STRICTLY DMT offers scope
- ✅ Existing offers (no subscription discount) render identically — NO regression
- ✅ Currently `offer-template.ts` hardcodes `STANDARD_SUBSCRIPTION = 200`. **Remove the hardcode** in favor of the new field.

## პრობლემა (User-asked 2026-05-07)

User ცხადად მოითხოვს:

> "აქ მინდა ჩაიწეროს სააბონენტოს გადასახადს ვუკეთებთ თუ არა ფასდაკლებას, ხელით უნდა შეიყვანოს სააბონენტო თანხა და თუ ფასდაკლებას ვაკეთებთ ის წინა თანხაც"

**Required PDF outputs:**

#### Discount applied:
```
სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ ნაცვლად 200 ლარისა
```

#### No discount:
```
სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ
```

ანუ user-ი თვითონ მონიშნავს რომ subscription-ზე აქვს ფასდაკლება + მანუალურად შეიყვანს რა იყო **წინა (regular) ფასი**. ეს არ უნდა იყოს hardcoded `200`.

## Spec

### Data model

#### Migration `0074_dmt_offers_subscription_discount.sql`

```sql
alter table public.dmt_offers
  add column if not exists subscription_regular_price numeric(12,2);

comment on column public.dmt_offers.subscription_regular_price is
  'Optional original (pre-discount) monthly subscription price in GEL. When set AND > monthly_subscription, PDF renders "ნაცვლად N ლარისა" clause. NULL = no subscription discount.';
```

⚠️ Run via `npm run db:migrate` (local DATABASE_URL set).

#### TypeScript types — `lib/dmt/offers-store.ts`

```diff
 export type DmtOffer = {
   …
   monthlySubscription: number | null;
+  subscriptionRegularPrice: number | null;
   …
 };

 export type OfferPayload = {
   …
   monthlySubscription?: number | null;
+  subscriptionRegularPrice?: number | null;
   …
 };
```

`offerFromDb()` mapper:
```ts
subscriptionRegularPrice: row.subscription_regular_price != null
  ? Number(row.subscription_regular_price)
  : null,
```

### UI — `OfferEditor` Section 3 · ჯამი

ცოცხალ subscription input-ის მიდევნით:

```tsx
<label className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-text-2 cursor-pointer">
  <input
    type="checkbox"
    checked={subscriptionRegularPrice.trim().length > 0}
    onChange={(e) => setSubscriptionRegularPrice(e.target.checked ? '200' : '')}
  />
  <BadgePercent size={13} className="text-red" />
  სააბონენტოზე ფასდაკლება
</label>
{subscriptionRegularPrice.trim().length > 0 && (
  <div className="ml-6 flex items-center gap-2 text-[11px] text-text-3">
    <span>წინა (სტანდარტული) ფასი:</span>
    <input
      type="number"
      min={0}
      step="0.5"
      value={subscriptionRegularPrice}
      onChange={(e) => setSubscriptionRegularPrice(e.target.value)}
      className="w-24 rounded-md border border-bdr bg-sur px-2 py-1 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
    />
    <span>₾</span>
  </div>
)}
```

State:
```ts
const [subscriptionRegularPrice, setSubscriptionRegularPrice] = useState(
  offer?.subscriptionRegularPrice != null ? offer.subscriptionRegularPrice.toString() : ''
);
```

Persist in `payload()`:
```ts
subscriptionRegularPrice: subscriptionRegularPrice.trim()
  ? Number(subscriptionRegularPrice)
  : null,
```

Validation:
```ts
if (subscriptionRegularPrice.trim() && Number(subscriptionRegularPrice) < 0) {
  list.push('წინა სააბონენტოს ფასი ≥ 0');
}
if (subscriptionRegularPrice.trim() && Number(monthlySubscription) >= Number(subscriptionRegularPrice)) {
  list.push('წინა ფასი > მიმდინარე სააბონენტოზე უნდა იყოს');
}
```

### API — `app/api/dmt/offers/route.ts` + `[id]/route.ts`

POST + PATCH read `body.subscriptionRegularPrice ?? body.subscription_regular_price` via `nullableNumber()` and persist to `subscription_regular_price` column. Symmetric.

### PDF — `lib/dmt/pdf/offer-template.ts`

Find current hardcoded logic:

```ts
const subscription = offer.monthlySubscription ?? 150;
const STANDARD_SUBSCRIPTION = 200;
const subscriptionSegments: RichSegment[] = [
  {text: 'სტანდარტული ყოველთვიური სააბონენტო: ', bold: true},
  {text: `${fmtMoney(subscription)} ₾ + დღგ`, bold: true},
];
if (subscription < STANDARD_SUBSCRIPTION) {
  subscriptionSegments.push({text: ` ნაცვლად ${fmtMoney(STANDARD_SUBSCRIPTION)} ლარისა`, bold: true});
}
```

**Replace with explicit field-driven logic:**

```ts
const subscription = offer.monthlySubscription ?? 150;
const regularPrice = offer.subscriptionRegularPrice;
const hasSubscriptionDiscount = regularPrice != null && regularPrice > subscription;

const subscriptionSegments: RichSegment[] = [
  {text: 'სტანდარტული ყოველთვიური სააბონენტო: ', bold: true},
  {text: `${fmtMoney(subscription)} ₾ + დღგ`, bold: true},
];
if (hasSubscriptionDiscount) {
  subscriptionSegments.push({text: ` ნაცვლად ${fmtMoney(regularPrice)} ლარისა`, bold: true});
}
```

ანუ `ნაცვლად N ლარისა` clause **მხოლოდ** მაშინ ცოცხლდება როცა user-მა ცხადად მონიშნა checkbox + შეიყვანა regular price > current subscription.

## Acceptance criteria

✅ Migration `0074_dmt_offers_subscription_discount.sql` applied — column exists, nullable
✅ TypeScript pass + lint
✅ Existing offers (subscriptionRegularPrice = null) render identically — NO `ნაცვლად` clause appears
✅ OfferEditor: new checkbox "სააბონენტოზე ფასდაკლება" + collapsible regular-price input
✅ Default: checkbox unchecked, no regular price input visible
✅ Toggling checkbox: empty `subscriptionRegularPrice` → `'200'`; toggling off clears to `''`
✅ Validation: regular price > monthly subscription (otherwise warning)
✅ Save offer with checkbox checked + regular=200 + monthly=150 → PDF shows "...150 ₾ + დღგ ნაცვლად 200 ლარისა"
✅ Save offer with checkbox unchecked → PDF shows "...150 ₾ + დღგ" (no "ნაცვლად" clause)
✅ Hardcoded `STANDARD_SUBSCRIPTION = 200` removed from `offer-template.ts`
✅ Smoke: round-trip create → save → reload → checkbox state + regular price persist correctly

## Files to create

```
supabase/migrations/0074_dmt_offers_subscription_discount.sql    NEW
```

## Files to modify

```
lib/dmt/offers-store.ts               (DmtOffer + OfferPayload + offerFromDb mapping)
lib/dmt/offers-server.ts              (insert/update payload mapping)
app/api/dmt/offers/route.ts           (POST create — read field)
app/api/dmt/offers/[id]/route.ts      (PATCH update — read field)
components/dmt/offer-editor.tsx       (checkbox + regular-price input + state + payload + validation)
lib/dmt/pdf/offer-template.ts         (replace STANDARD_SUBSCRIPTION hardcode with offer.subscriptionRegularPrice)
```

## Files NOT to touch

- ❌ Other DMT pages
- ❌ Items table / discount logic (separate concerns)
- ❌ Logo / wordmark / sakpatenti assets

## Out of scope

- Subscription discount in items table (this is offer-wide)
- Time-bounded subscription pricing (start/end dates)
- Tier-based pricing rules

## Test plan

1. `npm run db:migrate` → migration 0074 applies
2. `npm run typecheck && npm run lint`
3. Open existing offer (null regular price) → checkbox unchecked, PDF unchanged from before ✓
4. Edit offer: check "სააბონენტოზე ფასდაკლება", regular=200 (default), monthly=150, save → reload → still checked, value persists ✓
5. Generate PDF → page 2 shows "სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ ნაცვლად 200 ლარისა" ✓
6. Edit: uncheck → save → PDF shows "სტანდარტული ყოველთვიური სააბონენტო: 150 ₾ + დღგ" ✓
7. Try regular=100, monthly=150 → validation blocks save ("წინა ფასი > მიმდინარე სააბონენტოზე უნდა იყოს") ✓
8. Update entry [docs/TODO.md](../TODO.md) → mark Task 051 done

## Notes for Codex

- Keep `subscription_regular_price` and `monthly_subscription` decoupled — both nullable, no DB-level constraint between them. UX validates the relationship; DB allows independent values for migration flexibility.
- `numeric(12,2)` matches existing money column conventions.
- Default value when checkbox first toggled ON: `'200'` (matches reference PDF). User can change to any number.
- This task is **independent** of Task 050 (margin override) and Task 048 (discount %). All three can ship in any order.
