# Task 054 — DMT leads / negotiations: filters + sort + ID + ActorChip parity with invoices

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Task 046 (invoices filters/sort) + Task 053 (actor display)
**Reference behavior:** mirror what's already shipped in [`app/dmt/invoices/page.tsx`](../../app/dmt/invoices/page.tsx)
**Scope:** [`app/dmt/leads/page.tsx`](../../app/dmt/leads/page.tsx) only — manual leads grid + facebook leads have separate concerns

## ⚠️ MUST READ — NO DELETIONS

- ✅ NO DELETIONS — existing pipeline cards / search input / stats / "ისტორია" / "Export" / "+ ახალი" stay
- ✅ STRICTLY `/dmt/leads` (the negotiations / pipeline grid). Manual-leads grid (`/dmt/leads/manual`) and FB analytics keep their current behavior — separate task if needed.
- ✅ Client-side filtering only — server returns full list; client filters in `useMemo`
- ✅ Filter + sort state persists in `localStorage` key `dmt:leads:filter` (mirrors `dmt:invoices:filter`)

## პრობლემა (User-asked 2026-05-07)

User: "მოლაპარაკებების გვერდზე გამართე ფილტრები, სტატუსებით, თარიღით სორტი და ა.შ. ყველა ვარიანტი გამოიყენე."

Currently `/dmt/leads` page has only:
- KPI cards (ნაჩვენები / აქტიური / მოგებული)
- Free-text search input
- Right-side icons (history, export, new lead, owner filter, "სვეტებიდან")

NO filters by stage / status / date, no sort options.

User wants ფილტერი mode parity with `/dmt/invoices` Phase 1+2 (which Codex already shipped).

## Spec

Lift the entire pattern from invoices page, applied to leads:

### A. Status / stage filter — multi-select pills

Lead status enum (depends on offer_status implementation per Task 034 / 0063 migration):
- `offer_in_progress` — შეთავაზება მიმდინარეობს
- `offer_accepted` — შეთავაზება მიღებული
- `offer_rejected` — შეთავაზება უარყოფილი

Plus pipeline `stage` column (legacy):
- `new`, `qualified`, `negotiating`, `won`, `lost`

Pick whichever taxonomy renders in the current grid. Most likely `offer_status`. Add multi-select pills row above the table:

```tsx
<FilterPill label="ყველა" active={statusFilter.size === 0} onClick={() => setStatusFilter(new Set())} />
{STATUSES.map((s) => (
  <FilterPill
    key={s}
    label={STATUS_META[s].label}
    active={statusFilter.has(s)}
    count={countByStatus[s] ?? 0}
    color={STATUS_META[s].color}
    onClick={() => toggleStatus(s)}
  />
))}
```

`OR` logic across selected statuses. Empty set = show all.

### B. Date range filter (created_at OR updated_at — pick one consistently)

Same UI as invoices: trigger button "თარიღი ▾" → opens panel with:
- From / To inputs
- 4 quick presets: ბოლო 7 / ბოლო 30 / ეს თვე / წინა თვე
- "გასუფთავება"
- End-day-inclusive range

Filter the leads array on chosen field (suggest `updated_at` for "recent activity").

### C. Owner filter — already partially exists (the "მე" icon on the right)

Verify it works. If not — fix it. Owner = `lead.owner` field, dropdown of distinct owners + "ყველა" + current user shortcut.

### D. Labels filter

If lead has tags/labels (Task 035 / contacts preset tags pattern), allow multi-select label filter. Pills row.

### E. Sort — clickable column headers

Mirror invoices Phase 2: 3 sortable columns (date / status / value). ↑/↓ indicator. Default `updated_at desc`.

```tsx
type SortKey = 'date' | 'status' | 'value' | null;
type SortDir = 'asc' | 'desc';

const STATUS_SORT_ORDER: Record<OfferStatus, number> = {
  offer_in_progress: 0,
  offer_accepted: 1,
  offer_rejected: 2,
};
```

### F. Filter toolbar collapse toggle

The "ფილტრი" header button toggles visibility of pills row. Active filter count badge.

### G. "ფილტრების გასუფთავება (N)" link

Visible only when ≥1 filter active. Resets all + sort.

### H. Combined logic with search

`AND` between filters/sort/search; `OR` within multi-select pill sets.

### I. Persist state in localStorage

Key: `dmt:leads:filter`. Payload:
```json
{
  "status": ["offer_in_progress"],
  "from": "2026-04-01",
  "to": "2026-05-07",
  "owner": "g@example.com",
  "labels": ["hot", "key-account"],
  "sortKey": "date",
  "sortDir": "desc"
}
```

### J. Sequential ID column

If leads have a `docNumber`-like sequential identifier (most likely there's already an ID column showing crypt hash/id) — mirror invoices: show `№ N` for sequential, fall back to `—` + tooltip with full hash.

If no docNumber exists in the leads schema, **skip** this part.

### K. Empty states — filtered nothing-found vs empty DB

Same two-variant pattern as invoices.

### L. ActorChip cell (Task 053 follow-through)

If "ვინ დაამატა" / "createdBy" column visible — render via `<ActorChip name={row.createdBy} />` (defined in Task 053). Replaces literal "მე" badge.

## Acceptance criteria

✅ Status pills above leads table with multi-select OR logic
✅ Date range panel with 4 quick presets, end-day inclusive
✅ Sortable column headers (date / status / value) with ↑/↓ indicator + active key tinted
✅ "ფილტრი" header button toggles pill row + shows active count badge in blue
✅ "ფილტრების გასუფთავება (N)" link visible only when active
✅ Combined search × filters × sort = AND logic; multi-select within = OR
✅ localStorage `dmt:leads:filter` persists across refresh
✅ Filtered nothing-found empty state vs empty-DB empty state
✅ Stats cards (ნაჩვენები / აქტიური / მოგებული) re-compute from `filtered` array
✅ TypeScript pass + lint
✅ NO regression on existing pipeline view, history sidebar, export button, new lead button
✅ Task 053 ActorChip integrated where applicable
✅ Mobile (md<) — pills wrap; date panel mobile-friendly modal

## Files to modify

```
app/dmt/leads/page.tsx        — add state + UI for filters/sort + persist + wire into useMemo
```

Optional helper extract to `components/dmt/filter-pill.tsx` if same pill is duplicated 3+ times across the codebase. Otherwise inline.

## Files NOT to touch

- ❌ `lib/dmt/leads-store.ts` (server already permissive)
- ❌ `app/api/dmt/leads/**`
- ❌ `app/dmt/leads/manual/page.tsx` (separate page; may benefit from same in follow-up)
- ❌ `app/dmt/leads/facebook/**` (different data source)
- ❌ Migration files

## Out of scope

- Server-side filtering / pagination (when leads >> 1000)
- Saved filter presets
- Bulk operations (select-all + bulk action) — already in invoices but separate concern
- CSV export of filtered set (future task)
- Multi-tenancy / cross-user visibility

## Test plan

1. `/dmt/leads` open → pills + date trigger visible
2. Click a status pill → only that status's rows visible, count updates
3. Add date range "ბოლო 7 დღე" → cross-filter applies (AND)
4. Click date column header → ↑ + sort asc; click again → ↓
5. Refresh page → all filters + sort persist
6. Click "ფილტრების გასუფთავება (3)" → all reset
7. Type search "acme" while filters active → AND logic narrows further
8. Filter to nothing → "ფილტრით შესაბამისი ლიდი ვერ მოიძებნა" empty state
9. Mobile viewport → pills wrap nicely
10. `npm run typecheck && npm run lint`
11. Update [docs/TODO.md](../TODO.md) → mark Task 054 done

## Notes for Codex

- **Reuse invoices code**: `app/dmt/invoices/page.tsx` already has the full pattern. Copy the relevant sections (FilterPill, DateFilterPanel, status sort order, persistence effect, sortable th component) and rename for leads context.
- **STATUS_META mapping**: pull from existing leads UI — there's already `offer_status` rendering somewhere (`lead-status-cell.tsx` or `lead-detail-drawer.tsx`).
- Default sort: `updated_at desc` (most recently active first).
- `dmt:leads:filter` localStorage key — separate from invoices to avoid conflict.
- Don't break the existing right-side toolbar buttons (history, export, new) — just add filter row below the search.
- When extracting `<FilterPill>` to shared component, place under `components/dmt/filter-pill.tsx` and import from both invoices + leads. Tag this as a refactor in the summary.
