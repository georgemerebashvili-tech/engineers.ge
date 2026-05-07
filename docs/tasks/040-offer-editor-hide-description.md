# Task 040 — Offer editor: hide description / SKU sub-text in item rows

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Task 037 / 038 — OfferEditor UI polish
**Scope:** Frontend only — single component
**Depends on:** Existing OfferEditor (`components/dmt/offer-editor.tsx`)

## ⚠️ MUST READ — NO DELETIONS

- ✅ Item row data model unchanged — `description` და `sku` ფიელდები **დარჩება** OfferItem ტიპში
- ✅ description / sku ცარცის DB-ში ინახება (api routes/store უცვლელი)
- ❌ NO field removal — only UI visibility change

## პრობლემა

[components/dmt/offer-editor.tsx](../../components/dmt/offer-editor.tsx) — ცხრილში item row-ი ცარცის ცარცის ცარცის-2 input field:
1. **Name** (top — large bold text, navy)
2. **Description / SKU sub-input** (bottom — small gray placeholder "აღწერა / SKU")

User-მა გადაწყვიტა რომ description sub-input ცხრილში **არ უნდა ჩანდეს**. მხოლოდ name-ი ცხრილში ჩანდება.

## What to change

### Hide description sub-input from item rows

[components/dmt/offer-editor.tsx](../../components/dmt/offer-editor.tsx) — items table row JSX:

```diff
  <div className="min-w-0">
    <input
      value={item.name}
      onChange={(e) => setItem(index, {name: e.target.value})}
      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[12px] font-semibold text-navy hover:border-bdr focus:border-blue focus:bg-sur focus:outline-none"
    />
-   <input
-     value={item.description ?? ''}
-     onChange={(e) => setItem(index, {description: e.target.value})}
-     placeholder="აღწერა / SKU"
-     className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[10.5px] text-text-3 hover:border-bdr focus:border-blue focus:bg-sur focus:outline-none"
-   />
  </div>
```

### Optional: Show description on hover/expand (future-proof)

თუ user უნდა აღწერის ცვლილება მერე — ცხრილის row-ის expand pattern (click chevron → reveals description input). Out of scope ამ task-ში — მთავარი ცვლილება description-ის Hide.

## Items source/SKU badge — also hide

თუ კოდი ცხრილში ცარცის "🏷 SKU-XXXX" ან "✏ custom" badge — ისიც წაიშალოს ჩვენებიდან (data preserved).

Search for badge text in OfferEditor item rows — typically:
```tsx
{item.source === 'inventory' ? `🏷 ${item.sku ?? 'inventory'}` : '✏ custom'}
```

Remove this rendering. Source/SKU stay in object but hidden in UI.

## Acceptance criteria

✅ Items table row shows ONLY the name input (no description sub-input visible)
✅ Source/SKU badge ("🏷 ..." / "✏ custom") removed from row UI
✅ `OfferItem.description` field still saves correctly when added via inventory picker (preserves descriptions from inventory catalog)
✅ `OfferItem.sku` from inventory picker — saved silently, not shown
✅ Existing offers with descriptions — still load correctly, descriptions preserved in DB
✅ Row height shrinks (was ~45px with sub-input, becomes ~30px)
✅ Custom item add form — `description` input also removed if present
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული

## Files to modify

```
components/dmt/offer-editor.tsx       — hide description input + source badge in item rows
```

## Out of scope

- Remove description from `OfferItem` type — DON'T (legacy data preservation)
- Remove from API/DB — DON'T
- Add hover/expand UX — separate task if needed later
- Adjust column widths after row shrink — verify visually but don't refactor unless broken

## Notes

- **UTF-8** — ფაილი UTF-8 encoding-ში უნდა დარჩეს. Task 032 corruption არ გაიმეოროს.
- **Row height adjustment** — Tailwind classes shouldn't break, but verify table rendering after change.
- Description რომ inventory item-ი add-ისას ჩანდეს თუნდაც placeholder შემთხვევაში → ფაქტიურად მონაცემი ცარცის ცარცის preserved, მაგრამ უხილავი.

## Test plan

1. `npm run dev` → http://localhost:3000/dmt/invoices
2. Login admin
3. Click "ახალი ინვოისი" → pick lead → editor opens
4. Add inventory item (e.g., რადიატორი KERMI 500x800) → row appears with **only name** visible (no description sub-line)
5. Add custom item via "დამატება" button → row shows only name
6. Save → reload → verify rows still show only name (descriptions preserved in DB but not displayed)
7. Existing offer with descriptions → open → ditto, only names visible
8. Verify row height is compact (less vertical space than before)
