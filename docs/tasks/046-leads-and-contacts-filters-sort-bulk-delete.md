# Task 046 — Leads & Contacts: status filter, date filter, sort, bulk delete

**Status:** open · Codex
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/leads` and `/dmt/contacts` only. Files:
[`app/dmt/leads/page.tsx`](../../app/dmt/leads/page.tsx) +
[`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx). Stay inside `/dmt`.

---

## 0. Why

User feedback on `/dmt/leads`:

> სტატუსებით ფილტრი მინდა. "მე" რომ წერია — მოაშორე. დროის ფილტრიც გვინდა
> თარიღების მიხედვით. სტატუსების მაჩვენებელიც გვინდა. სიის დალაგება — ID-ით,
> თარიღით, სტატუსით. ბოლოში წაშლის აიქონიც გვინდა, ასევე select-ით წაშლა.
> ყოველივე ეს კონტაქტების გვერდზეც გვინდა.

Six items, both pages. Implement them all together — they share helpers.

---

## 1. Remove the `მე` actor pill

[`app/dmt/leads/page.tsx:329-331`](../../app/dmt/leads/page.tsx#L329-L331):

```tsx
<button onClick={changeActor} className="...">
  <UserRound size={14} /> {actor}
</button>
```

Delete the button + the `changeActor` callback + the pill rendering. Actor
identity is still tracked via `getActor()` for audit log writes — that part
stays. Just don't render the pill in the toolbar.

(Contacts page already had the pill removed in Task 041 — check it stays out.)

---

## 2. Status filter (toolbar, replaces per-column filter chrome)

The leads page still renders per-column filter funnels
([`app/dmt/leads/page.tsx:389-413`](../../app/dmt/leads/page.tsx#L389-L413)).
User wants those replaced by a few dedicated toolbar filters.

### 2.1 Drop the per-column filter popovers

Delete:
- `filterPopover` state and the `<FilterPopover>` callsite per header cell
- The `<Filter>` icon inside `HeaderCell`
- The `filters` state + `setFilter`/`clearFilters` mutators
- localStorage key `dmt_leads_filters_v1`
- The "ფილტრი N ×" / "ფილტრი სვეტებიდან" toolbar pill

Keep column drag-drop, resize, sticky header.

### 2.2 Add a status filter pill row

Toolbar gets a horizontal chip row, one chip per `offer_status` plus an "ყველა"
chip:

```tsx
const STATUSES = ['all', ...OFFER_STATUS_ORDER] as const;
type StatusFilter = typeof STATUSES[number];

<div className="flex items-center gap-1.5 flex-wrap">
  {STATUSES.map((s) => {
    const meta = s === 'all'
      ? {label: 'ყველა', bg: 'var(--sur-2)', color: 'var(--text-2)', border: 'var(--bdr)'}
      : OFFER_STATUS_META[s];
    const count = s === 'all' ? rows.length : rows.filter(r => r.offerStatus === s).length;
    const active = statusFilter === s;
    return (
      <button
        key={s}
        onClick={() => setStatusFilter(s)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${active ? 'ring-2 ring-offset-1 ring-blue' : ''}`}
        style={{background: meta.bg, color: meta.color, borderColor: meta.border}}
      >
        {meta.label}
        <span className="rounded-full bg-white/40 px-1.5 text-[10px]">{count}</span>
      </button>
    );
  })}
</div>
```

Persist `statusFilter` to localStorage `dmt_leads_status_filter_v1`.

The chip also doubles as the **status indicator** (count badge inside the
chip). One feature, two purposes.

For contacts, mirror the same pattern with the lead-state tri-state already
shipped in Task 041 — but expand to include counters:

```tsx
<button>ყველა <span>{rows.length}</span></button>
<button>ლიდი <span>{leadCount}</span></button>
<button>არ არის ლიდი <span>{notLeadCount}</span></button>
```

(Replace the existing tri-state buttons; same mechanic, just add the count badge.)

---

## 3. Date range filter

A second toolbar slot — two date inputs labeled `დან` / `მდე`:

```tsx
<div className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px]">
  <span className="text-text-3">დან</span>
  <input type="date" value={dateFrom} onChange={...} className="border-0 bg-transparent text-text-2 focus:outline-none" />
  <span className="text-text-3">მდე</span>
  <input type="date" value={dateTo} onChange={...} className="border-0 bg-transparent text-text-2 focus:outline-none" />
  {(dateFrom || dateTo) && (
    <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="ml-1 text-text-3 hover:text-red">
      <X size={12} />
    </button>
  )}
</div>
```

Filter logic: row passes if `row.createdAt >= dateFrom && row.createdAt <= dateTo + 1 day`.
Empty `dateFrom` = no lower bound. Empty `dateTo` = no upper bound.

Persist to localStorage `dmt_leads_date_filter_v1` (and `..._contacts_..` for
contacts) as `{from: string, to: string}`.

Apply the SAME date-range filter on `/dmt/contacts`, persisted to
`dmt_contacts_date_filter_v1`.

---

## 4. Sort by ID / date / status

Add a sort dropdown next to the date range:

```tsx
type SortKey = 'id' | 'createdAt' | 'updatedAt' | 'offerStatus' | 'name' | 'company';
type SortDir = 'asc' | 'desc';

<div className="inline-flex items-center rounded-md border border-bdr bg-sur-2 text-[11px]">
  <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="border-0 bg-transparent px-2 py-1 focus:outline-none">
    <option value="id">ID</option>
    <option value="createdAt">დამატების თარიღი</option>
    <option value="updatedAt">ბოლო რედ.</option>
    <option value="offerStatus">სტატუსი</option>
    <option value="company">კომპანია</option>
    <option value="name">სახელი</option>
  </select>
  <button
    onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
    className="border-l border-bdr px-2 py-1 text-text-2"
    title={sortDir === 'asc' ? 'ზრდადი' : 'კლებადი'}
  >
    {sortDir === 'asc' ? '▲' : '▼'}
  </button>
</div>
```

Sort logic:
- `id` — numeric ascending/descending (parseInt on both sides; non-numeric IDs sort last alphabetically)
- `createdAt` / `updatedAt` — ISO date string comparison
- `offerStatus` — order from `OFFER_STATUS_ORDER` (in_progress < accepted < rejected)
- `company` / `name` — Georgian-aware locale compare: `a.localeCompare(b, 'ka')`

Persist to localStorage `dmt_leads_sort_v1` and `dmt_contacts_sort_v1` as `{key, dir}`.

For contacts the sort options: `id`, `createdAt`, `updatedAt`, `convertedToLeadId` (lead status),
`company`, `name`. Replace `offerStatus` with `convertedToLeadId` (boolean: lead first, non-lead second when desc).

---

## 5. Per-row delete icon (already on leads, ensure on contacts)

[`app/dmt/leads/page.tsx:431-440`](../../app/dmt/leads/page.tsx#L431-L440) already
renders a `<Trash2>` button per row, opacity-0 / opacity-100 on hover. Confirm
it's there after the refactor.

For contacts — currently the page also has a delete icon (per Task 040 acceptance
criteria). Confirm it still works after this task's changes.

No new code here — just don't regress.

---

## 6. Bulk select + bulk delete

This is the big one. Both pages.

### 6.1 Add a checkbox column on the LEFT

A new fixed-position checkbox column at the left of the grid (NOT part of the
draggable column system — always first). 32px wide.

Header cell renders a "select all" checkbox:

```tsx
<input
  type="checkbox"
  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
  onChange={(e) => {
    if (e.target.checked) setSelected(new Set(filtered.map((r) => r.id)));
    else setSelected(new Set());
  }}
/>
```

Body cell per row renders a row checkbox:

```tsx
<input
  type="checkbox"
  checked={selected.has(r.id)}
  onChange={(e) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.target.checked) next.add(r.id);
      else next.delete(r.id);
      return next;
    });
  }}
/>
```

State: `const [selected, setSelected] = useState<Set<string>>(new Set());`

Selected rows get a `bg-blue-lt/30` background tint to distinguish them visually.

### 6.2 Floating action bar when selection is non-empty

When `selected.size > 0`, show a small action bar pinned to the top of the
table area:

```tsx
{selected.size > 0 && (
  <div className="mb-2 flex items-center gap-2 rounded-md border border-blue bg-blue-lt px-3 py-1.5 text-[12px] font-semibold text-blue">
    <span>{selected.size} მონიშნული</span>
    <button onClick={() => setSelected(new Set())} className="rounded px-2 py-0.5 hover:bg-white/40">
      მონიშვნის გასუფთავება
    </button>
    <button
      onClick={bulkDelete}
      className="ml-auto inline-flex items-center gap-1 rounded border border-red bg-red px-2 py-0.5 text-white hover:bg-red/90"
    >
      <Trash2 size={12} /> წავშალო {selected.size}
    </button>
  </div>
)}
```

### 6.3 Bulk delete handler

```ts
const bulkDelete = async () => {
  if (selected.size === 0) return;
  if (!confirm(`წავშალო ${selected.size} ჩანაწერი?`)) return;
  const ids = Array.from(selected);
  const before = rows.filter((r) => ids.includes(r.id));
  // Optimistic remove
  setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
  setSelected(new Set());
  try {
    await Promise.all(ids.map((id) => deleteLeadApi(id)));
    setAudit(await loadAudit());
    showToast(`წაიშალა ${ids.length} ჩანაწერი`);
  } catch (e) {
    setRows((prev) => [...before, ...prev]);
    alert('ზოგი ჩანაწერი ვერ წაიშალა. სცადე თავიდან.');
  }
};
```

For contacts, equivalent using `deleteContact()`.

### 6.4 Selection cleared on filter change

When the user changes status filter, date range, or sort — clear the selection
(stale row IDs may no longer be visible). Use a `useEffect` watching those
state vars:

```ts
useEffect(() => { setSelected(new Set()); }, [statusFilter, dateFrom, dateTo]);
```

Don't clear on sort change — same rows, just reordered.

---

## 7. Acceptance criteria — both pages

Login as `giorgi@dmt.ge` / `demo123`. Test on `/dmt/leads` AND `/dmt/contacts`.

### Leads page

- [ ] No `მე` actor pill in toolbar.
- [ ] No filter funnel icons in column headers.
- [ ] Toolbar shows status chip row: `ყველა (32)`, `ოფერის გაკეთება (X)`, `მიღებულია (Y)`, `უარყოფილი (Z)`. Counts match filtered rows. Click a chip → filter applies. Reload → persists.
- [ ] Toolbar shows date range inputs (`დან`/`მდე`). Setting dates filters rows by `createdAt`. X button clears. Reload → persists.
- [ ] Sort dropdown: pick `ID` → rows sort numerically. Pick `დამატების თარიღი` → sort by createdAt. Pick `სტატუსი` → in_progress first (asc) or rejected first (desc). Pick `კომპანია` → ქართული locale order. Direction toggle (▲/▼) flips. Reload → persists.
- [ ] Hover a row → `<Trash2>` icon appears on the right. Click → confirm → row deletes.
- [ ] Click left checkbox on 5 rows → bulk action bar appears: `5 მონიშნული · მონიშვნის გასუფთავება · წავშალო 5`. Click `წავშალო 5` → confirm → 5 rows delete.
- [ ] Click "select all" header checkbox → all currently filtered rows selected. Uncheck → all cleared.
- [ ] Selected rows have a slight blue tint background.
- [ ] Change status filter → selection clears.
- [ ] Change sort → selection persists (not cleared).
- [ ] Column drag-drop reorder still works. Column resize still works. Sticky header still works.

### Contacts page

- [ ] Existing tri-state lead filter chips now show counts: `ყველა (30) · ლიდი (12) · არ არის ლიდი (18)`.
- [ ] Date range filter and sort dropdown work identically to leads page.
- [ ] Per-row delete icon still works after refactor.
- [ ] Bulk select via checkboxes + bulk delete works the same as leads.
- [ ] Optimistic toggle, ribbon, sticky header, horizontal scroll — all preserved.

### Both

- [ ] No console errors. No React warnings.
- [ ] `npm run lint` passes. `npm run typecheck` passes.

---

## 8. Implementation hints

### Where to extract shared code

If you find yourself duplicating between the two pages, extract to:
- `lib/dmt/table-state.ts` — `loadStatusFilter`/`saveStatusFilter`,
  `loadDateFilter`/`saveDateFilter`, `loadSort`/`saveSort` with namespaced keys.
- `components/dmt/bulk-action-bar.tsx` — the floating selection bar.
- `components/dmt/status-chip-row.tsx` — the status chip filter row (parameterized
  by chip metadata so leads + contacts pass different chip lists).
- `components/dmt/date-range-filter.tsx` — the date inputs.
- `components/dmt/sort-dropdown.tsx` — the sort key + dir control.

Skip extraction only if a primitive is used by ONE page and is <30 lines.

### Sort stability

Use `Array.prototype.sort()` with a comparator. Be aware sorts are stable in
modern V8 — relying on stability for "secondary sort by id" is fine. If user
sorts by `company`, contacts with the same company stay in insertion order,
which is acceptable.

### Don't break the leads page audit / pipeline UX

The screenshot shows `/dmt/leads?stage=negotiating` — the stage query param is
a deep-link hook. Don't accidentally drop it. If it's consumed via
`useSearchParams()` somewhere, leave that alone.

### Re-seed not required

The seed already has 30 contacts + 30 leads with realistic dates, statuses,
companies. Sort + filter immediately have data to work on without a re-seed.

---

## 9. Out of scope

- Saved filter presets ("My open leads this week" etc.) — defer.
- Column-level sort-on-click in headers — sort dropdown is enough.
- Mobile layouts.
- Anything outside `/dmt/leads/page.tsx` and `/dmt/contacts/page.tsx`
  (and the optional shared modules in §8).
- The manual leads page (`/dmt/leads/manual`) — separate UX.

---

## 10. Files expected to change

**Modified:**
- `app/dmt/leads/page.tsx` — remove actor pill + per-column filters + filterPopover; add status chip row, date range, sort dropdown, bulk select + bulk delete.
- `app/dmt/contacts/page.tsx` — add date range, sort dropdown, status counts on existing chips, bulk select + bulk delete.

**Optionally new (extract if shared):**
- `lib/dmt/table-state.ts` — persistence helpers.
- `components/dmt/bulk-action-bar.tsx`, `status-chip-row.tsx`, `date-range-filter.tsx`, `sort-dropdown.tsx`.

No migrations. No package.json changes.

---

## 11. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md).
3. Commit: `feat(dmt): leads + contacts — status filter, date filter, sort, bulk delete (Task 046)`
