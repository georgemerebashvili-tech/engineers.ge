# Task 046 — Invoices page: filters + sort + sequential IDs

**Delegated to:** Codex
**Created:** 2026-05-07 · **Updated:** 2026-05-07 (added sort + ID display)
**Parent:** Task 037 (DMT offers) — UI polish
**Scope:** [app/dmt/invoices/page.tsx](../../app/dmt/invoices/page.tsx) only
**Depends on:** Task 045 (PDF generation must work first; this is a list-view UX layer on top)

## ⚠️ MUST READ

- ✅ NO DELETIONS — არსებული search input + stat cards + table რჩება
- ✅ STRICTLY `/dmt/invoices` scope — სხვა გვერდს არ ვცვლით
- ✅ Client-side filtering + sorting only — server-side pagination არ არის ჯერ; client-მ ფილტრავს / ალაგებს `offers` array-ს `useMemo`-ში
- ✅ Filter + sort state localStorage-ში persists, რომ refresh-ის შემდეგ user-ს არ მოუწიოს თავიდან არჩევა

## პრობლემა (User-asked 2026-05-07)

`/dmt/invoices` გვერდზე ამჟამად არის მხოლოდ:
- **ძიება** (full-text by ID / company / contact / status / total)
- **Stats cards** (count / total amount / sent count / approved count)
- **Status pills** ცხრილში (read-only, არ ფილტრავს)
- **ID column** — `o.id` ნაჩვენებია (cryptic timestamp-style hash, e.g. `r1771234567890`)

User-ი ითხოვს:
1. **სტატუსით ფილტრი** — `draft` / `sent` / `approved` / `rejected` / `cancelled` (multi-select pill-ები)
2. **თარიღით ფილტრი** — date-range picker (from / to), `updatedAt`-ზე ფილტრავს
3. **სორტირება** თარიღით (asc/desc) — clickable column header
4. **სორტირება** სტატუსით — clickable column header (predefined order: draft → sent → approved → rejected → cancelled)
5. **ID column** ცხრილში — cryptic `o.id`-ს ნაცვლად ცოცხალი sequential numbers `1, 2, 3, …` (`docNumber` field).

## What to add

### A. Status filter pills (multi-select)

ცხრილის ზემოთ, search-ის გვერდით ან stats-cards-ის ქვემოთ:

```tsx
<div className="mb-3 flex flex-wrap gap-1.5">
  <FilterPill label="ყველა" active={statusFilter.size === 0} onClick={() => setStatusFilter(new Set())} />
  {(Object.keys(STATUS_META) as OfferStatus[]).map((s) => (
    <FilterPill
      key={s}
      label={STATUS_META[s].label}
      active={statusFilter.has(s)}
      count={countByStatus[s] ?? 0}
      color={STATUS_META[s].color}
      onClick={() => toggleStatusFilter(s)}
    />
  ))}
</div>
```

- "ყველა" — clears the set, shows all
- Click on a pill → toggle membership in `Set<OfferStatus>`
- Active pill: filled background (matches status color tokens — reuse `STATUS_META`)
- Inactive pill: outline only (`border-bdr bg-sur`)
- Each pill shows count badge: `(N)` of how many offers have that status currently
- Multi-select: clicking 2 pills includes BOTH statuses (OR logic)

### B. Date range filter

**Trigger:** small inline button "თარიღი ▾" next to status pills. Click → opens compact panel:

```
┌─────────────────────────────────┐
│  დან:  [ 2026-04-01 ]            │
│  მდე:  [ 2026-05-07 ]            │
│                                 │
│  [ ბოლო 7 დღე ] [ ბოლო 30 ]    │
│  [ ეს თვე ] [ წინა თვე ]        │
│  [ გასუფთავება ]                 │
└─────────────────────────────────┘
```

- Two `<input type="date">` (from / to)
- 4 quick-preset buttons: ბოლო 7 დღე / ბოლო 30 / ეს თვე / წინა თვე — ერთ კლიკზე ავსებს ორივე date-ს
- "გასუფთავება" — clears both
- When at least one date is set → trigger button shows badge: `თარიღი (apr 01 — may 07)` ან `თარიღი (apr 01 →)` თუ მხოლოდ from-ი
- ფილტრავს `o.updatedAt`-ზე (current sort field is `updatedAt` already)
- Inclusive range: `from ≤ updatedAt ≤ to + 23:59:59` (so end-day captures full day)

### C. Wire into `filtered` useMemo (with sort)

`page.tsx`-ში `filtered` ცვლადი ცვლადი ცვლადი ცვლადი ცვლადი ცვლადი:

```tsx
type SortKey = 'date' | 'status' | 'total' | null;
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<OfferStatus, number> = {
  draft: 0, sent: 1, approved: 2, rejected: 3, cancelled: 4
};

const filtered = useMemo(() => {
  let result = offers;

  // Status filter (multi-select)
  if (statusFilter.size > 0) {
    result = result.filter((o) => statusFilter.has(o.status));
  }

  // Date range filter
  if (dateFrom) {
    const fromMs = new Date(dateFrom).getTime();
    result = result.filter((o) => new Date(o.updatedAt).getTime() >= fromMs);
  }
  if (dateTo) {
    const toMs = new Date(dateTo).getTime() + 86_399_000; // end of day
    result = result.filter((o) => new Date(o.updatedAt).getTime() <= toMs);
  }

  // Existing text search
  const t = q.trim().toLowerCase();
  if (t) {
    result = result.filter((o) => {
      const lead = leads.find((l) => l.id === o.leadId);
      const haystack = [o.id, o.leadId, lead?.company, lead?.contact, o.status, String(o.total)].join(' ').toLowerCase();
      return haystack.includes(t);
    });
  }

  // Sort (default: date desc when no explicit sort selected)
  const dir = sortDir === 'asc' ? 1 : -1;
  const key: SortKey = sortKey ?? 'date';
  result = [...result].sort((a, b) => {
    if (key === 'date') {
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    }
    if (key === 'status') {
      return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
    }
    if (key === 'total') {
      return (a.total - b.total) * dir;
    }
    return 0;
  });

  return result;
}, [offers, leads, q, statusFilter, dateFrom, dateTo, sortKey, sortDir]);
```

### D. Stats cards reflect filtered set

ამჟამად stats უკვე იზომება `filtered.length`-ით (line 133). ეს კარგია — ფილტრის გამოყენებისას რიცხვები ცოცხლად განახლდება. **NO change needed** to stats; just verify after wiring.

### E. Persist filter state

```tsx
useEffect(() => {
  const raw = localStorage.getItem('dmt:invoices:filter');
  if (!raw) return;
  try {
    const f = JSON.parse(raw);
    if (Array.isArray(f.status)) setStatusFilter(new Set(f.status));
    if (typeof f.from === 'string') setDateFrom(f.from);
    if (typeof f.to === 'string') setDateTo(f.to);
  } catch {}
}, []);

useEffect(() => {
  localStorage.setItem('dmt:invoices:filter', JSON.stringify({
    status: Array.from(statusFilter),
    from: dateFrom,
    to: dateTo
  }));
}, [statusFilter, dateFrom, dateTo]);
```

### F. "Clear all filters" button

თუ რომელიმე ფილტრი ან search ცოცხალია — ცხრილის ზემოთ პატარა inline link:

```
🔄 ფილტრების გასუფთავება (3 აქტიური)
```

Click → resets `q`, `statusFilter`, `dateFrom`, `dateTo`. Hidden by default.

### G. Empty state when filters return zero

`filtered.length === 0`-ის შემთხვევაში ამჟამად `<EmptyState onCreate={startNew} />` რენდერდება — მაგრამ ეს "ცარიელ DB"-ის empty-state-ია. ფილტრული nothing-found-ისთვის სხვა ვარიანტი:

```tsx
const hasActiveFilters = q.trim() || statusFilter.size > 0 || dateFrom || dateTo;

if (filtered.length === 0) {
  return hasActiveFilters
    ? <FilteredEmptyState onClear={clearFilters} />
    : <EmptyState onCreate={startNew} />;
}
```

`<FilteredEmptyState>` მცირე variant: "ფილტრით შესაბამისი ინვოისი არ მოიძებნა · გაასუფთავე ფილტრები".

### H. Sortable column headers (date + status + total)

`<thead>` სვეტებიდან 3 column header გავხადოთ clickable:
- **სტატუსი** — sort by predefined status order (`STATUS_ORDER` map above)
- **ჯამი** — sort by `o.total` numeric
- **თარიღი** — sort by `o.updatedAt`

```tsx
<SortableTh sortKey="status" label="სტატუსი" />
<SortableTh sortKey="total" label="ჯამი" align="right" />
<SortableTh sortKey="date" label="თარიღი" />
```

Where `<SortableTh>`-ი ქცევა:
- ფერი hover-ზე: `text-blue`
- როცა აქტიური sort key: ბოლოში გამოჩნდება ↑ ან ↓ (lucide `ChevronUp` / `ChevronDown`)
- Click-ზე: თუ უკვე აქტიური → toggle dir; თუ არა → set this key + dir = 'desc'
- Default state (page load): `sortKey=null` → useMemo iyenebs `'date'` + `'desc'` (ბოლოს განახლებული პირველი — current behavior preserved)
- ⌘/Ctrl+click → reset to default (`null` + `desc`)

ID column და კლიენტი/ლიდი/PDF/მოქმედება არ არიან sortable (icon-ით ცხადად ვუთხარით).

### I. Sort state persists in localStorage

```tsx
const [sortKey, setSortKey] = useState<SortKey>(null);
const [sortDir, setSortDir] = useState<SortDir>('desc');

// extend the existing dmt:invoices:filter localStorage payload
{
  status: [...],
  from: ...,
  to: ...,
  sortKey,    // <-- new
  sortDir     // <-- new
}
```

### J. Sequential ID column (`docNumber` instead of `o.id`)

Replace ID column rendering:

```tsx
// BEFORE
<td className="px-3 py-2 font-mono font-semibold text-navy">{o.id}</td>

// AFTER
<td className="px-3 py-2 font-mono font-semibold text-navy">
  {o.docNumber ? `№ ${o.docNumber}` : <span className="text-text-3" title={o.id}>—</span>}
</td>
```

**Rules:**
- `o.docNumber` (1, 2, 3, ...) ცოცხლდება `dmt_next_offer_doc_number()` RPC-ით PDF გენერაციის დროს (Task 045 migration 0069). თუ ჯერ PDF არ გენერირდა → `null` → ცხრილში გამოაჩინე `—` (placeholder), tooltip-ში `o.id` სრული.
- ID column header label-ი → "№" (იყო "ID")
- Search input განაგრძობს არსებული `o.id`-ს და `String(o.docNumber)`-ის ჩართვას `haystack`-ში (search-ით ნახვადი იყოს ორივე მხრიდან).

```tsx
const haystack = [
  o.id,                          // legacy hash (still searchable)
  o.docNumber ? `№${o.docNumber}` : '',  // new sequential
  String(o.docNumber ?? ''),
  o.leadId,
  lead?.company,
  lead?.contact,
  o.status,
  String(o.total)
].join(' ').toLowerCase();
```

**Why not change `o.id` field itself in DB:**
- `o.id` რჩება stable routing key (`/api/dmt/offers/<id>/...`), share-link unguessable, audit log integrity
- `docNumber`-ი user-facing რიცხვია, კარგად ჯდება ცხრილში / PDF-ში / email-ში ("ინვოისი №42")
- Migration / rename 100+ rows risky — out of scope

## Acceptance criteria

✅ Status pills row რენდერდება stats cards-ის ქვემოთ
✅ Multi-select status filter-ი მუშაობს — 2 pill-ის არჩევა → OR logic
✅ "ყველა" pill აქტიურია სხვა-არჩეულის გარეშე
✅ Date range panel-ი იხსნება trigger ღილაკიდან
✅ 4 quick-preset ღილაკი: ბოლო 7 / ბოლო 30 / ეს თვე / წინა თვე — სწორად ავსებენ ორივე date-ს
✅ End-day-inclusive range: `to`-დან `23:59:59`-მდე ფილტრავს
✅ Filter + sort state localStorage-ში persists key `dmt:invoices:filter`
✅ Stats cards რიცხვები ცოცხლად ემთხვევა `filtered`-ს
✅ "ფილტრების გასუფთავება" button ჩანს მხოლოდ active filter-ის დროს
✅ Empty state ცალ-ცალკე variant-ი ფილტრის nothing-found vs ცარიელი DB
✅ Search input continues to work in combination with new filters (AND logic)
✅ Sortable column headers: სტატუსი / ჯამი / თარიღი — clickable, ↑/↓ indicator active key-ზე
✅ Click on active sort key → toggle direction; click on different key → set + dir='desc'
✅ Status sort uses predefined `STATUS_ORDER` (draft → cancelled), არა alphabetical
✅ Default sort behavior preserved: page load → `updatedAt` DESC (no regression)
✅ ID column გამოაჩინებს `№ {docNumber}` (1, 2, 3, …) — legacy `o.id` მოგზავრებაში tooltip-ად
✅ Search-ით ნახვადია ორივე: `№42` ფორმატით ან legacy hash-ით
✅ `docNumber === null` (PDF ჯერ არ გენერირდა) → ცხრილში `—` placeholder
✅ TypeScript pass, ESLint pass
✅ Mobile (md<) — pills wrap into multiple rows; date panel ფიქსირებული modal mobile-ზე; sort headers tap-friendly

## Files to modify

```
app/dmt/invoices/page.tsx       — add filter state, pills row, date panel, persist effect
```

## Files NOT to touch

- ❌ `lib/dmt/offers-store.ts` — server-side ფილტრაცია არ ვცვლით
- ❌ `app/api/dmt/offers/**` — API არ იცვლება
- ❌ Other DMT pages (leads, contacts, inventory)
- ❌ DESIGN_RULES tokens — ფილტრის ფერები მხოლოდ არსებულ `STATUS_META`-დან + `var(--bdr)` / `var(--sur)` და ა.შ.

## Out of scope

- Filter by amount range (future task)
- Filter by lead/company dropdown
- Saved filter presets
- Server-side filtering / pagination (when offers > 1000)
- Export filtered set as CSV
- Renaming `o.id` in DB (`docNumber` is the new user-facing label, `o.id` stays as routing key)

## Test plan

1. `/dmt/invoices` open → status pills + "თარიღი ▾" trigger + sortable column headers ჩანს
2. ID column გამოაჩინებს `№1, №2, №3...` (PDF გენერირებული ოფერებისთვის) ან `—` (PDF ჯერ არ გენერირდა)
3. Click "გაგზავნილი" pill → მხოლოდ sent offers ჩანს, count badge updates
4. Click "დადასტურებული" pill while sent active → ორივე ჩანს (OR)
5. Open date panel → "ბოლო 7 დღე" → from + to ავტომატურად შევსება
6. Click "თარიღი" column header → ↑ indicator + sort asc; click again → ↓ desc
7. Click "სტატუსი" column header → draft → sent → approved → rejected → cancelled order (asc)
8. Click "ჯამი" → numeric sort
9. Refresh page → ფილტრი + sort key/dir ისევ აქტიურია (localStorage persists)
10. Combination test: status=sent + date=last 30 + search="acme" + sort by total desc → ცხრილი ფილტრავს + sort-ად აკეთებს
11. Search "№3" → ცხრილში მხოლოდ docNumber=3 ოფერი ჩანს
12. Search legacy `r177...` hash → იპოვის (backward compat)
13. Click "ფილტრების გასუფთავება" → ყველაფერი reset (filters + sort)
14. Filter to nothing → "ფილტრით შესაბამისი ინვოისი არ მოიძებნა" empty state
15. Mobile viewport → pills wrap, date panel mobile-friendly, sort headers tap-friendly
16. Run `npm run typecheck && npm run lint`

## Notes

- **Why client-side:** offers count realistically <500 per DMT user. Server-side filtering adds complexity without UX gain at this scale. Re-evaluate when offers > 2000.
- **Date semantics:** `updatedAt` chosen because it reflects "last touched". Document number (`docNumber`) date could be alternative — keep flexibility for follow-up.
- **Pill component:** consider extracting `<FilterPill>` to `components/dmt/filter-pill.tsx` if other DMT pages will reuse (leads page already needs similar treatment per Task 034). For this task, inline is OK; refactor in 047 if pattern repeats.
- **Quick presets timezone:** use local-machine timezone via `new Date()` constructor; user is in Tbilisi (UTC+4). Server stores UTC ISO; comparison must convert consistently.
- **Empty status filter Set:** Set.size === 0 means "show all" — NOT "show none". Document clearly in comment.
