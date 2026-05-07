# Task 042 — Offer: editable monthly subscription + form validation everywhere

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Tasks 037/041 — extends OfferEditor
**Scope:** Backend (1 migration extension) + frontend (validation + new field) + PDF
**Depends on:** Task 041 (client fields) — works alongside

## ⚠️ MUST READ — NO DELETIONS

- ✅ ყველა არსებული column/field/file — დარჩება
- ❌ NO DELETIONS

## What to build

### A. Migration `0071_dmt_offers_subscription.sql`

```sql
alter table public.dmt_offers
  add column if not exists monthly_subscription numeric(10,2);
-- nullable; if null, PDF uses default 150 GEL or hides the line
```

### B. shared-state-server: extend offer mapping

```typescript
// In offerFromDb:
monthlySubscription: row.monthly_subscription === null || row.monthly_subscription === undefined
  ? null
  : parseNumber(row.monthly_subscription),

// In offerToDb / API insert:
monthly_subscription: nullableNumber(body.monthlySubscription ?? body.monthly_subscription),
```

### C. DmtOffer type + payload

```typescript
export type DmtOffer = {
  // ...existing
  monthlySubscription: number | null;  // null → use default 150
};

export type OfferPayload = {
  // ...existing
  monthlySubscription?: number | null;
};
```

### D. OfferEditor — add field in summary section

Inside `3 · ჯამი` aside:

```tsx
<div className="flex items-center justify-between">
  <span className="text-[11.5px] font-semibold text-text-2">სააბონენტო ₾/თვე</span>
  <input
    type="number"
    min={0}
    step="0.01"
    value={monthlySubscription}
    onChange={(e) => setMonthlySubscription(e.target.value)}
    placeholder="150"
    className="w-24 rounded-md border border-bdr bg-sur px-2 py-1 text-right font-mono text-[12px] focus:border-blue focus:outline-none"
  />
</div>
```

State:
```typescript
const [monthlySubscription, setMonthlySubscription] = useState<string>(
  offer?.monthlySubscription?.toString() ?? ''
);
```

In payload:
```typescript
monthlySubscription: monthlySubscription.trim() ? Number(monthlySubscription) : null,
```

### E. PDF generation

[lib/dmt/pdf/offer-template.ts](../../lib/dmt/pdf/offer-template.ts) — use offer's monthly_subscription in subscription paragraph:

```typescript
const subscription = offer.monthlySubscription ?? 150;
drawText(ctx, `სტანდარტული ყოველთვიური სააბონენტო: ${subscription} GEL + დღგ`, ...);
```

### F. Validation across OfferEditor (the main ask)

Add **inline validation** with error highlights for ALL inputs:

#### Items table validation

| Field | Rule | Error display |
|---|---|---|
| `name` | required, min 1 char | red border + tooltip "დასახელება აუცილებელია" |
| `qty` | required, > 0 | red border + tooltip "რაოდენობა > 0" |
| `unitPrice` | required, ≥ 0 | red border |
| `laborPerUnit` | optional, ≥ 0 | red border if negative |

#### Custom item add form

| Field | Rule |
|---|---|
| name | required (already disables button) |
| qty | required, > 0 |
| unitPrice | ≥ 0 |
| laborPerUnit | ≥ 0 |

#### Client section (Task 041)

| Field | Rule | Error |
|---|---|---|
| Doc number override | optional, integer ≥ 1 | red if not integer |
| Doc date override | valid date | browser native validation |
| Client company | optional, max 200 chars | char count |
| Client tax ID | optional, format: 9 digits (Georgian tax ID) OR empty | "კოდი 9-ნიშნა უნდა იყოს" |
| Client contact | optional, max 200 chars | |
| Client phone | optional, valid phone format | regex `/^[+\d\s\-()]+$/` |

#### Summary section

| Field | Rule |
|---|---|
| Currency | 3-letter code | uppercase, max 3 |
| VAT % | 0-100 if enabled | range |
| Margin % | 0-100 | range |
| Monthly subscription | ≥ 0 | non-negative |

#### Save / Send / PDF generation guards

Before allowing save:
- ✅ At least 1 item
- ✅ All items have name
- ✅ All quantities > 0

Before "Send to client":
- ✅ All save criteria
- ✅ Client company set (either lead's or override)

Before "PDF generation":
- ✅ All save criteria

Show validation summary at top of editor when errors:
```tsx
{errors.length > 0 && (
  <div className="mx-5 mt-3 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
    <div className="font-bold">გაასწორე შეცდომები ({errors.length}):</div>
    <ul className="ml-4 list-disc">
      {errors.map((err, i) => <li key={i}>{err}</li>)}
    </ul>
  </div>
)}
```

#### Validation hook

```typescript
const errors = useMemo(() => {
  const list: string[] = [];
  if (items.length === 0) list.push('დაამატე მინიმუმ 1 ნივთი');
  items.forEach((item, i) => {
    if (!item.name.trim()) list.push(`ნივთი #${i + 1}: დასახელება აუცილებელია`);
    if (item.qty <= 0) list.push(`ნივთი #${i + 1}: რაოდენობა > 0`);
    if (item.unitPrice < 0) list.push(`ნივთი #${i + 1}: ფასი ≥ 0`);
  });
  if (clientTaxId && !/^\d{9}$/.test(clientTaxId)) {
    list.push('საიდენტიფიკაციო კოდი 9-ნიშნა უნდა იყოს ან ცარიელი');
  }
  if (vatEnabled && (vatRate < 0 || vatRate > 100)) {
    list.push('დღგ 0-100% დიაპაზონშია');
  }
  if (marginPercent < 0 || marginPercent > 100) {
    list.push('მოგება 0-100% დიაპაზონშია');
  }
  if (monthlySubscription && Number(monthlySubscription) < 0) {
    list.push('სააბონენტო ≥ 0');
  }
  return list;
}, [items, clientTaxId, vatEnabled, vatRate, marginPercent, monthlySubscription]);

// Disable save buttons when errors:
<button disabled={saving || errors.length > 0} ...>შენახვა</button>
```

### G. Inline field highlighting

On error, mark specific input with `border-red bg-red-lt`:

```tsx
<input
  className={`... ${itemNameError ? 'border-red bg-red-lt focus:border-red' : 'border-bdr ...'}`}
  ...
/>
```

## Acceptance criteria

✅ Migration `0071` apply-დება, `monthly_subscription` column visible
✅ Editor-ის `3 · ჯამი` section-ში "სააბონენტო" field ჩანდება
✅ Default placeholder shows "150" (the standard rate)
✅ Save preserves value, reload shows it
✅ PDF generation uses offer's monthlySubscription if set, else 150
✅ Validation errors banner shows at top of editor
✅ Save / Send / PDF buttons disabled when errors present
✅ Inline red border on invalid fields
✅ Tax ID validation: 9 digits OR empty
✅ Margin/VAT/Subscription range validation
✅ Empty offer (0 items) → save disabled with clear message
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული

## Files to create

```
supabase/migrations/0071_dmt_offers_subscription.sql
```

## Files to modify

```
lib/dmt/offers-store.ts                    — DmtOffer + OfferPayload types
lib/dmt/shared-state-server.ts             — offerFromDb mapping
app/api/dmt/offers/route.ts                — POST passes monthlySubscription
app/api/dmt/offers/[id]/route.ts           — PATCH passes monthlySubscription
lib/dmt/pdf/offer-template.ts              — use offer.monthlySubscription with fallback 150
components/dmt/offer-editor.tsx            — new subscription field + full validation
```

## Out of scope

- Annual subscription option — fixed monthly
- Currency conversion for subscription
- Subscription history / changes log
- Auto-recurring billing — out of scope (this is just text in PDF)

## Notes

- **UTF-8** preserved in all edits
- **Default 150 GEL** comes from original PDF template — keep as fallback when null
- **Tax ID format:** Georgian standard is 9 digits (e.g., "204923262", "405285926"). 11-digit personal IDs also exist. Be lenient: accept 9 OR 11 digit if simpler. **Recommended:** 9 digits enforced (organization), make personal ID separate field if needed later.
- **Validation timing:** validate on blur for individual fields, but show error banner only when user attempts save.

## Test plan

1. Apply migration → verify column
2. Open existing offer → "სააბონენტო" field shows blank (placeholder 150)
3. Set value to `200` → save → reload → 200 persists
4. Generate PDF → "სტანდარტული ყოველთვიური სააბონენტო: 200 GEL + დღგ"
5. Clear value → save → null → PDF shows default 150
6. Enter invalid tax ID `12345` → red border + error banner → save disabled
7. Fix to `204923262` → errors clear → save enabled
8. Empty all items → "დაამატე მინიმუმ 1 ნივთი" error
9. Add item with qty=0 → "ნივთი #1: რაოდენობა > 0" error
10. Margin 150% → range error
