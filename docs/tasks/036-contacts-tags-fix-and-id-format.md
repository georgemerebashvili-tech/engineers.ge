# Task 036 — Fix TagsCell overflow + lead ID format M-NNNN

**Delegated to:** Codex
**Created:** 2026-05-05
**Parent:** Continuation of task 035 (preset tags)
**Scope:** Frontend (overflow + visual) + small backend (1 API tweak)
**Depends on:** Task 035 ✅ partial — `TagsCell` component already implemented in `app/dmt/contacts/page.tsx`

## ⚠️ MUST READ — NO DELETIONS

**არსად არაფერი არ იშლება.**
- ✅ ცხრილი `dmt_contacts` — დარჩება
- ✅ `dmt_contacts.source` column — დარჩება
- ✅ ყველა არსებული ID (`r177...`) — დარჩება, მხოლოდ ახალი convert-ი მიიღებს M-format
- ❌ არ წაშალო file/column/row

## პრობლემები (visible in current production state)

### Bug 1 — TagsCell panel ცხრილში გადაიჭრება

[app/dmt/contacts/page.tsx](../../app/dmt/contacts/page.tsx) → `TagsCell` component-ში panel იხსნება `position: absolute` z-30-ით, **მაგრამ ცხრილის parent container-ის `overflow-hidden` ან `overflow-x-auto` ფარავს მას**. შედეგი: panel-ის მხოლოდ პირველი 1-2 ხაზი ჩანდება (header "PRESET თეგები" + "Manual" preset-ის ნაწილი), დანარჩენი — დამალულია.

**Visual reproduction (current state):**
```
┌─────── tags cell ────────┐
│ [+ თეგი]                  │  ← cell row
└──────────────────────────┘
   ↓ click +
┌──── PRESET თეგები ────┐
│ ⚪ Manu....            │   ← only 1.5 rows visible, clipped
└────────────────────────┘
   ✗ "Import / Website / Referral / Event" hidden behind table edge
```

### Bug 2 — Lead ID format

Convert API ([app/api/dmt/contacts/[id]/convert/route.ts:18-20](../../app/api/dmt/contacts/[id]/convert/route.ts#L18-L20)):

```typescript
function nextManualLeadId() {
  return 'r' + Date.now() + Math.floor(Math.random() * 100);
}
```

Generates IDs like `r177797128956895` — **15+ characters**, ცუდად ჩანდება badge-ში.

User-friendly format: `M-1001`, `M-1002`, ... (sequential, prefix `M` for Manual lead).

## Fix 1 — Panel rendering via React Portal (or fix overflow)

### Approach A — React Portal (recommended)

**რატომ portal:** panel-ი body-ის ბოლოში rendered-ი გასცდება ცხრილის overflow-clipping-ს. Z-index ცხრილის გარეთ მუშაობს.

**Implementation:**

```tsx
import {createPortal} from 'react-dom';

function TagsCell({tags, onChange}: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }, [open]);

  // ... existing useEffect for outside-click
  
  return (
    <div ref={triggerRef} className="relative border-r border-bdr px-2 py-1.5">
      {/* Pills + Add button — same as current */}
      {open && mounted && pos && createPortal(
        <div
          className="fixed z-50 w-[260px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-xl"
          style={{top: pos.top, left: pos.left}}
        >
          {/* Panel content — same as current */}
        </div>,
        document.body
      )}
    </div>
  );
}
```

**კრიტიკული:** outside-click handler ნამდვილად მოიცავს portal-ის nodes (panel + trigger ref). ღაზუს სანამ click panel-ზე ხდება.

```tsx
useEffect(() => {
  if (!open) return;
  const onDoc = (e: MouseEvent) => {
    const target = e.target as Node;
    if (triggerRef.current?.contains(target)) return;
    if ((target as HTMLElement).closest('[data-tags-panel]')) return;
    setOpen(false);
  };
  document.addEventListener('mousedown', onDoc);
  return () => document.removeEventListener('mousedown', onDoc);
}, [open]);
```

და panel-ს `data-tags-panel="true"` attribute.

### Approach B — Fix table overflow (simpler but might break layout)

`overflow-x-auto`-ს მოშორება ცხრილის parent-დან — მაგრამ ცხრილი ფართოა, horizontal scroll ჭირდება. ეს approach-ი UX-ს წყდება. **Approach A უკეთესია.**

### Edge case — Scroll position

Panel position-ი ცხრილის scroll-ის დროს უცვლელი. თუ user-ი ცხრილს ჰსკროლავს panel ღია მდგომარეობაში, panel "გადარჩება" შეცდომად. Solution:

- ან — close panel on table scroll (`addEventListener('scroll', () => setOpen(false))` on table container)
- ან — recalculate position during scroll (more complex)

**Recommended:** simple "close on scroll" — natural behavior.

## Fix 2 — Lead ID format M-NNNN

### Server-side change

[app/api/dmt/contacts/[id]/convert/route.ts](../../app/api/dmt/contacts/[id]/convert/route.ts):

```diff
- function nextManualLeadId() {
-   return 'r' + Date.now() + Math.floor(Math.random() * 100);
- }
+ async function nextManualLeadId(db: ReturnType<typeof supabaseAdmin>): Promise<string> {
+   const {data, error} = await db
+     .from('dmt_manual_leads')
+     .select('id')
+     .like('id', 'M-%');
+   if (error) throw error;
+   let max = 1000;
+   for (const row of (data ?? [])) {
+     const m = /^M-(\d+)$/.exec(String((row as {id: string}).id));
+     if (m) max = Math.max(max, Number(m[1]));
+   }
+   return 'M-' + (max + 1);
+ }
```

და usage:

```diff
- const leadId = nextManualLeadId();
+ const leadId = await nextManualLeadId(db);
```

### Concurrency note

Two simultaneous converts could race and both get `M-1002`. Acceptable risk for this app (low traffic). If needed in future: use `INSERT INTO ... RETURNING id` with a sequence.

### Migration of existing rows

**არ მოახდინოთ.** Existing `r177...` IDs დარჩება დასახელებაში. ახალი convert-ი იქმნება `M-NNNN` ფორმატით. ცხრილში თანაც ცხოვრობს ორივე format.

## Fix 3 — Badge truncation for long legacy IDs

[app/dmt/contacts/page.tsx](../../app/dmt/contacts/page.tsx) — badge in `convertedTo` cell:

```tsx
function formatLeadId(id: string): string {
  if (id.length <= 10) return id;
  return id.slice(0, 4) + '…' + id.slice(-4);
}

// Inside badge:
<span className="font-mono max-w-[100px] truncate" title={row.convertedToLeadId}>
  {formatLeadId(row.convertedToLeadId)}
</span>
```

შედეგი:
- `M-1001` → ჩანდება სრულად
- `r177797128956895` → ჩანდება როგორც `r177…6895` + tooltip ცარცის full ID

## Acceptance criteria

✅ TagsCell panel-ი ხსნისას სრულად ხილვადია (პორტალის arenas, ცხრილის გარეთ)
✅ Panel-ში 5 preset-ი (Manual/Import/Website/Referral/Event) ერთად ჩანდება
✅ Custom input მუშაობს, scroll-ი არ არის ცხრილის ფარგლებში
✅ Outside click → იხურება (portal-ის გათვალისწინებით)
✅ Escape → იხურება
✅ Table scroll → panel იხურება (close on scroll)
✅ ახალი convert → ID format `M-NNNN` (M-1001, M-1002...)
✅ არსებული `r177...` IDs unchanged
✅ Badge-ი long IDs truncate (`r177…6895` + tooltip)
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული

## Files to modify

```
app/dmt/contacts/page.tsx                    — TagsCell portal + badge truncation
app/api/dmt/contacts/[id]/convert/route.ts   — async sequential ID generator
```

## Files to create

None (only modifications).

## Out of scope

- localStorage migration of source values — already covered by task 035 (separate)
- Tag color customization per user
- Bulk tag assign
- Tag rename/merge admin UI
- Real concurrency-safe ID generation (sequence/transaction)

## Notes

- **UTF-8 encoding** — Codex-მა ფაილებს UTF-8 encoding-ში წეროს. ქართული strings (`'+ თეგი'`, `'PRESET თეგები'`) source-ში ნორმალურად ჩანდება.
- **Portal z-index:** გამოიყენეთ `z-50` (or `z-[60]`) რომ ცხრილის თავსე იდგას.
- **fixed positioning:** portal-ში `style={{top: ..., left: ...}}` + `position: fixed` — რომ scroll-ის დროს არ იცვლის ადგილს მთლიანად, მაგრამ recalculation არ ხდება.
- **getBoundingClientRect** ცარიელ window უსაფრთხოა SSR-ში (component "use client").

## Test plan

1. `npm run dev` → http://localhost:3000/dmt/contacts
2. Login admin
3. Click "+" on tags cell → panel მთლიანად ხილვადია (5 preset + custom input)
4. Scroll the contacts table while panel open → panel closes (clean UX)
5. Convert a new contact (with company) → ახალი ლიდი ID = `M-1001` (or next sequential)
6. Refresh → contact-ზე badge ჩანდება `M-1001` (clean)
7. Find legacy contact (with `r177...` ID) → badge truncated to `r177…XXXX` + tooltip on hover
8. Multi-user test: User B sees same M-IDs, same tags
