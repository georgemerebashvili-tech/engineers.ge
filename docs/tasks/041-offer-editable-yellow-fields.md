# Task 041 — Offer editor: all yellow-highlighted PDF fields become editable

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Task 037/038/039 — extends offer editor + PDF
**Scope:** Backend (1 migration + API extension) + frontend (editor fields) + PDF (use new fields)
**Depends on:** Tasks 037/038 ✅ offer infrastructure exists

## ⚠️ MUST READ — NO DELETIONS

- ✅ ყველა არსებული column/field/file — დარჩება
- ✅ Existing offers — backward compatible (null values fall back to lead's data)
- ❌ NO DELETIONS

## პრობლემა

ორიგინალ PDF-ში (`test.pdf`) **ყვითლად მონიშნული** ველები — ეს არის dynamic/editable per-offer ფიქსი. User-მა უნდა, რომ **ყველა ყვითელი ველი** ცარცის editable იყოს offer editor-ში.

## ყვითელი ველები (test.pdf)

### Page 1
| Field | სად | წყარო ახლა | ცვლილება |
|---|---|---|---|
| **Doc number** `219` | header + title | auto-sequence | editable override |
| **Doc date** `27.04.2026` | title | `current_date` default | editable override |
| **Client company** `ტატიშვილის კლინიკა` | მომსახურების მიმღები | `lead.company` | editable override |
| **Client tax ID** `204923262` | მომსახურების მიმღები | `lead.taxId` (often missing) | editable, new field |

### Page 2
| Field | სად | წყარო | ცვლილება |
|---|---|---|---|
| **Item rows** (name/qty/price/labor) | items table | `offer.items[]` | ✅ already editable |
| **Subtotal** `1187.00` | totals | computed | ✅ auto |
| **Sum** `1542.00` | totals | computed | ✅ auto |
| **Margin %** `15%` | totals | `marginPercent` | ✅ already editable |
| **Margin amount** `231.30` | totals | computed | ✅ auto |
| **Grand total** `1773.30` | totals + paragraph | computed | ✅ auto |
| **Money-back paragraph** | conditional | `includeMoneyBackGuarantee` toggle | ✅ already editable |

### Page 3
| Field | სად | წყარო | ცვლილება |
|---|---|---|---|
| **Client company (signature)** | "მომსახურების მიმღები" block | `lead.company` | uses Page 1 override |
| **Client tax ID (signature)** | `ს/კ:` line | `lead.taxId` | uses Page 1 override |
| **Director name** | "დირექტორი:" line | `lead.contact` | editable, new field |

## What to build

### A. Migration `0070_dmt_offers_client_fields.sql`

```sql
alter table public.dmt_offers
  add column if not exists doc_number_override int,         -- if set, used instead of auto sequence
  add column if not exists doc_date_override   date,         -- if set, used instead of current_date
  add column if not exists client_company      text,         -- override for lead.company
  add column if not exists client_tax_id       text,         -- new (lead has no tax_id)
  add column if not exists client_contact      text,         -- director / contact person name
  add column if not exists client_phone        text,         -- override for lead.phone
  add column if not exists client_address      text;         -- optional, for future
```

`doc_number_override` & `doc_date_override` are optional. If null → use auto values.

### B. shared-state-server: extend `offerFromDb` / `offerToDb`

Add to `lib/dmt/shared-state-server.ts`:

```typescript
// In offerFromDb:
clientCompany: row.client_company ? String(row.client_company) : null,
clientTaxId: row.client_tax_id ? String(row.client_tax_id) : null,
clientContact: row.client_contact ? String(row.client_contact) : null,
clientPhone: row.client_phone ? String(row.client_phone) : null,
docNumberOverride: row.doc_number_override === null || row.doc_number_override === undefined ? null : Number(row.doc_number_override),
docDateOverride: row.doc_date_override ? String(row.doc_date_override) : null,
```

### C. DmtOffer type extension

[lib/dmt/offers-store.ts](../../lib/dmt/offers-store.ts):

```typescript
export type DmtOffer = {
  // ... existing
  clientCompany: string | null;
  clientTaxId: string | null;
  clientContact: string | null;
  clientPhone: string | null;
  docNumberOverride: number | null;
  docDateOverride: string | null;
};

export type OfferPayload = {
  // ... existing
  clientCompany?: string | null;
  clientTaxId?: string | null;
  clientContact?: string | null;
  clientPhone?: string | null;
  docNumberOverride?: number | null;
  docDateOverride?: string | null;
};
```

### D. API routes — accept new fields

[app/api/dmt/offers/route.ts](../../app/api/dmt/offers/route.ts) POST + [app/api/dmt/offers/[id]/route.ts](../../app/api/dmt/offers/[id]/route.ts) PATCH — pass through new fields to insert/update.

### E. OfferEditor — new section "კლიენტის მონაცემები"

Add a NEW section between "1 · პროდუქტები" and "2 · პირობები":

```
┌─ 0 · კლიენტი (ოფერისთვის) ─────────────┐
│  დოკუმენტის ნომერი:  [auto / 219]       │   (override)
│  თარიღი:             [27.04.2026]        │   (override; default today)
│  ───                                      │
│  კომპანია:           [ტატიშვილის კლინიკა] │   (default: lead.company)
│  საიდ. კოდი:         [204923262]         │   (NEW field)
│  დირექტორი:          [სახელი გვარი]      │   (default: lead.contact)
│  ტელეფონი:           [555 12 34 56]      │   (default: lead.phone)
└──────────────────────────────────────────┘
```

**UI specs:**
- Section heading: "0 · კლიენტი"
- 6 input fields in 2-column grid (label + input)
- Doc number: number input, placeholder "auto" (means use sequence)
- Doc date: date input, default today
- Client fields: text inputs, placeholders showing lead's defaults
- Save updates `dmt_offers.client_*` columns

State management:
```typescript
const [clientCompany, setClientCompany] = useState(offer?.clientCompany ?? lead.company ?? '');
const [clientTaxId, setClientTaxId] = useState(offer?.clientTaxId ?? '');
const [clientContact, setClientContact] = useState(offer?.clientContact ?? lead.contact ?? '');
const [clientPhone, setClientPhone] = useState(offer?.clientPhone ?? lead.phone ?? '');
const [docNumberOverride, setDocNumberOverride] = useState<string>(offer?.docNumberOverride?.toString() ?? '');
const [docDateOverride, setDocDateOverride] = useState(offer?.docDateOverride ?? '');
```

In `payload()`:
```typescript
clientCompany: clientCompany.trim() || null,
clientTaxId: clientTaxId.trim() || null,
clientContact: clientContact.trim() || null,
clientPhone: clientPhone.trim() || null,
docNumberOverride: docNumberOverride.trim() ? Number(docNumberOverride) : null,
docDateOverride: docDateOverride || null,
```

### F. PDF generation — use override fields when set

[lib/dmt/pdf/offer-template.ts](../../lib/dmt/pdf/offer-template.ts):

In `drawFirstPage` and `drawSignaturePage`:

```typescript
// Doc number
const effectiveDocNumber = offer.docNumberOverride ?? docNumber;

// Doc date
const effectiveDocDate = offer.docDateOverride ?? docDate;

// Client info — prefer override, fallback to lead
const effectiveCompany = offer.clientCompany || lead.company || lead.id;
const effectiveTaxId = offer.clientTaxId || lead.taxId || '-';
const effectiveContact = offer.clientContact || lead.contact || '';
const effectivePhone = offer.clientPhone || lead.phone || '';

// Use these throughout the template
drawText(ctx, `SOP.8.2.5.COFR.${effectiveDocNumber}`, ...);
drawText(ctx, effectiveCompany, ...);  // in client block + signature
drawText(ctx, effectiveTaxId, ...);     // in client block + signature
```

### G. PDF signature page — director field

In signature page, "მომსახურების მიმღები" block:
```
{effectiveCompany}
ს/კ: {effectiveTaxId}
დირექტორი: {effectiveContact}    [signature line]
```

If `effectiveTaxId === '-'` → omit "ს/კ:" line entirely (empty).
If `effectiveContact === ''` → just "დირექტორი:" without name.

## Acceptance criteria

✅ Migration `0070` apply-დება
✅ `dmt_offers` ცხრილში 6 ახალი column ხილვადია
✅ Existing offers continue to work (null values fall back to lead/auto)
✅ Offer editor-ში "0 · კლიენტი" section ჩანდება
✅ All 6 fields editable, save+reload preserves values
✅ Doc number override — number input, placeholder "auto"
✅ Doc date — date picker, default today
✅ Client company — pre-filled from lead.company, editable
✅ Client tax ID — empty by default, fully editable
✅ PDF generation — uses override values when set, falls back when null
✅ PDF signature page shows correct client name + tax ID + director
✅ Side-by-side with `test.pdf` — yellow-highlighted fields all match offer's stored values
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული

## Files to create

```
supabase/migrations/0070_dmt_offers_client_fields.sql
```

## Files to modify

```
lib/dmt/offers-store.ts                — DmtOffer + OfferPayload types
lib/dmt/shared-state-server.ts         — offerFromDb/toDb mapping
app/api/dmt/offers/route.ts            — POST handler
app/api/dmt/offers/[id]/route.ts       — PATCH handler
app/api/dmt/offers/[id]/generate-pdf/route.ts  — pass override fields to PDF generator
lib/dmt/pdf/offer-template.ts          — use effective doc number/date/client values
components/dmt/offer-editor.tsx        — new "0 · კლიენტი" section + state
```

## Out of scope

- Lead's company/tax_id update from offer (offer changes don't propagate back to lead)
- Add `tax_id` column to `dmt_manual_leads` (separate task if needed)
- Multi-language PDFs
- Client logo / branding per offer
- Director e-signature integration

## Notes

- **UTF-8** — ფაილები UTF-8 encoding-ში უნდა დარჩეს
- **Doc number override:** if user sets to `220` and offer ID-ი `O-1004`, the PDF shows "SOP.8.2.5.COFR.220" while the system tracks O-1004 internally
- **Doc date override:** allows generating offers with specific past/future dates (e.g., dating a paper offer)
- **PDF caching:** if PDF was already generated, regenerate after override change. UI should show "PDF outdated" if override changed since last generation.
- **Default behavior:** all overrides are nullable. Null = use auto/lead. This is backward compatible.

## Test plan

1. `supabase migration up` (apply 0070)
2. `npm run dev` → http://localhost:3000/dmt/invoices
3. Create new offer for a lead
4. Verify "0 · კლიენტი" section visible with pre-filled defaults
5. Override doc number to `999`, doc date to `2026-12-31`
6. Set client tax ID to `204923262`
7. Override company name
8. Save draft → reload offer → values preserved
9. Generate PDF → verify all fields use override values
10. Side-by-side compare with `test.pdf` — yellow highlights should match
11. Create another offer with NO overrides → defaults work
