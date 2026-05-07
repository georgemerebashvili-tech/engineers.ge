# Task 040 — Contacts page: full feature parity with Leads page + bug fixes

**Status:** open · Codex
**Created:** 2026-05-06
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/contacts` only. Bug-fix sites: `/dmt/leads/manual`, shared `lib/dmt/*`. Do NOT touch `/admin`, `/calc`, `/tbc`, `/sazeo`, `/construction`, `lib/auth.ts`, `proxy.ts`.

---

## 0. Why this task exists

User reviewed `/dmt/contacts` after the seed populated 30 contacts. Verbatim feedback:

> შედი "ყველა ლიდი"-ს გვერდზე და იქ რა UI ფიჩერებიც გაქვს, ყველაფერი გადმოიტანე
> კონტაქტების გვერდზე — სვეტების გადაადგილება, სქროლი ლისტის დაბლა, ფილტრი,
> "ლიდი თუ არა" სვეტი/ფილტრი. ID-ები წესიერი (0,1,2,3 ან მსგავსი). UI-დან ლიდის
> დამატება და ამოშლა არ მუშაობს. თუ ლიდია სადმე გრაფაში, მწვანე იარლიკი გაუკეთე.

Leads page = [`app/dmt/leads/page.tsx`](../../app/dmt/leads/page.tsx) (1024 lines).
Contacts page = [`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx) (617 lines).

Contacts page is missing **most** of what leads has. This task closes the gap.

Two console errors are visible on `/dmt/leads/manual` and must ship in the same PR:
1. `Each child in a list should have a unique "key" prop` ([page.tsx:1520](../../app/dmt/leads/manual/page.tsx#L1520))
2. `[object Object]` thrown from `apiJson` ([page.tsx:154](../../app/dmt/leads/manual/page.tsx#L154))

---

## 1. Full feature inventory from `/dmt/leads`

The reference implementation. Every numbered item below MUST exist on `/dmt/contacts`
after this task lands, with identical visual styling and identical persistence keys
(but namespaced `dmt_contacts_*` instead of `dmt_leads_*`).

### 1.1 Toolbar (top of page)

[`app/dmt/leads/page.tsx:316-372`](../../app/dmt/leads/page.tsx#L316-L372) renders inside `<DmtPageShell>`:

| Element | Source | Behaviour |
|---|---|---|
| Page kicker | `kicker="OPERATIONS"` | grey caps mono label above title |
| Page title + subtitle | `title="ლიდები"` + `subtitle=...` | for contacts use `kicker="OPERATIONS"`, `title="კონტაქტები"`, `subtitle="ყველა კონტაქტი — ცხოვრელი grid, ცვლილებები ავტომატურად ინახება"` |
| Search box | `onQueryChange={setQ}` + placeholder `"ძიება სახელი / კომპანია / email / ID…"` | `<DmtPageShell>` renders the input; page filters in-memory |
| Actor pill | `<UserRound size={14} /> {actor}` clickable button | clicking → `prompt()` to change → `setActor(name)` |
| Filter status pill | shows `ფილტრი N ×` (clickable to clear) when filters set, or `ფილტრი სვეტებიდან` (passive hint) when empty | identical |
| History toggle button | `<History size={14} /> ისტორია · {audit.length}` | toggles right-hand audit panel |
| Export button | `<Download size={14} /> Export` → CSV download | identical CSV format adapted to contact columns |
| Add button | `<Plus size={14} /> ახალი` blue solid | inserts empty contact at top of list |

### 1.2 Stat cards (3 across, top of body)

[`app/dmt/leads/page.tsx:376-380`](../../app/dmt/leads/page.tsx#L376-L380):

For contacts, replace with:
- **`ნაჩვენები`** = `filtered.length`
- **`ლიდად კონვერტ.`** = count of contacts with `convertedTo != null` (accent `grn`)
- **`გაუხსნელი`** = count of contacts with `convertedTo == null` (accent `blue`)

Use the same `<StatCard>` component the leads page uses (extract from leads page if not yet shared — put in `components/dmt/stat-card.tsx`).

### 1.3 Sortable, resizable, filterable column system

This is the centerpiece. Leads has a column registry pattern at
[`lib/dmt/leads-store.ts:100-116`](../../lib/dmt/leads-store.ts#L100-L116) (`LEAD_COLUMNS`).

**Build the equivalent for contacts** in `lib/dmt/contacts-store.ts`:

```ts
export const CONTACT_COLUMNS: Record<string, ContactColumn> = {
  id:          {key: 'id',          label: 'ID',           kind: 'id',          width: 90,  readonly: true},
  name:        {key: 'name',        label: 'სახელი',       kind: 'text',        width: 170},
  company:     {key: 'company',     label: 'კომპანია',     kind: 'text',        width: 180},
  position:    {key: 'position',    label: 'თანამდებობა',  kind: 'text',        width: 140},
  phone:       {key: 'phone',       label: 'ტელეფონი',     kind: 'phone',       width: 160},
  email:       {key: 'email',       label: 'Email',        kind: 'email',       width: 200},
  source:      {key: 'source',      label: 'წყარო',        kind: 'source',      width: 120},
  tags:        {key: 'tags',        label: 'თეგები',        kind: 'tags',        width: 220},
  convertedTo: {key: 'convertedTo', label: 'ლიდი',          kind: 'leadLink',    width: 170},
  notes:       {key: 'notes',       label: 'შენიშვნა',     kind: 'text',        width: 220},
  createdAt:   {key: 'createdAt',   label: 'დამატებულია',  kind: 'date',        width: 140, readonly: true},
  createdBy:   {key: 'createdBy',   label: 'ვინ დაამატა',  kind: 'author',      width: 140, readonly: true},
  updatedAt:   {key: 'updatedAt',   label: 'ბოლო რედ.',    kind: 'date',        width: 140, readonly: true},
  updatedBy:   {key: 'updatedBy',   label: 'რედ. ავტორი',  kind: 'author',      width: 140, readonly: true},
};

export const DEFAULT_CONTACT_COLUMN_ORDER = [
  'id','name','company','position','phone','email','source','tags','convertedTo','notes','createdAt','createdBy','updatedAt','updatedBy'
] as const;
```

Column features each row must support — verbatim from
[`app/dmt/leads/page.tsx:199-243`](../../app/dmt/leads/page.tsx#L199-L243):

1. **Drag-drop reorder** (sections 1.3.a). Set `draggable` on the header, track `dragKey` and `dragOverKey`, splice into `order` on drop.
2. **Resize** (1.3.b). Right-edge `<span>` with `onMouseDown` → window-level mousemove/mouseup, `MIN_W = 80`, `MAX_W = 640`.
3. **Filter popover** (1.3.c). Filter icon on header → opens `<FilterPopover>`, kind-specific control inside. Click-outside closes.
4. **Persist all 3** to localStorage:
   - `dmt_contacts_col_order_v1`
   - `dmt_contacts_col_widths_v1`
   - `dmt_contacts_filters_v1`

### 1.4 Per-kind cell renderer

[`app/dmt/leads/page.tsx:476-587`](../../app/dmt/leads/page.tsx#L476-L587) — `renderCell`. Build the equivalent for contacts. Each `kind` rule:

| kind | render |
|---|---|
| `id` | `<div className="px-3 py-2 font-mono text-[11px] font-semibold text-navy">{id}</div>` — display raw `C-1001` (don't call `formatLeadId`) |
| `text` | `<EditableTextCell>` — inline contenteditable-style input, save on blur |
| `phone` | text but with `tel:` link affordance on hover |
| `email` | text but with `mailto:` link affordance on hover |
| `tags` | reuse / port the chip-multi-select used elsewhere — clickable +/- |
| `source` | rounded-full select pill, options from `CONTACT_SOURCE_ORDER` |
| `date` | `font-mono text-[10.5px] text-text-3` showing `fmtDate(iso)` |
| `author` | small initial avatar circle + name (see leads `kind: 'author'` block) |
| `leadLink` | green badge if `convertedTo != null`, otherwise `+ ლიდად` button. See §3.4 |

### 1.5 Per-kind filter popover

[`app/dmt/leads/page.tsx:664-...`](../../app/dmt/leads/page.tsx#L664) — `<FilterPopover>`. Mirror it:

| kind | popover control |
|---|---|
| `text`, `email`, `phone`, `id` | `<input type="text">` (substring match) |
| `source` | `<select>` of `CONTACT_SOURCE_ORDER` + "ყველა" |
| `tags` | multi-checkbox of distinct tags from current rows; row passes if intersection non-empty |
| `leadLink` | tri-state `<select>`: `ყველა` / `ლიდია` / `არ არის ლიდი`. The "ლიდი თუ არა" filter the user explicitly asked for. |
| `date` | from-date + to-date inputs, range filter |
| `author` | `<select>` of distinct values + "ყველა" |

### 1.6 Optimistic updates with rollback

[`app/dmt/leads/page.tsx:131-154`](../../app/dmt/leads/page.tsx#L131-L154):

```ts
setRows(applyChange);          // optimistic UI
try {
  const saved = await api(...);
  setRows((p) => p.map(...));  // reconcile with server response
  if (saved.auditEntries) setAudit((p) => [...saved.auditEntries, ...p]);
} catch (e) {
  console.error(e);
  setRows(rollback);           // revert
  alert('ცვლილება ვერ შეინახა. ძველი მნიშვნელობა დაბრუნდა.');
}
```

Apply this pattern to `addContact`, `updateField`, `deleteContact`,
`convertContactToLead`, `unlinkLeadFromContact`.

### 1.7 Audit history sidebar panel

[`app/dmt/leads/page.tsx:463-469`](../../app/dmt/leads/page.tsx#L463-L469) renders `<HistoryPanel>` when `showHistory === true`, side-by-side with the table.

The component (look for `HistoryPanel` definition lower in the leads page) shows each
audit entry: `{at} · {by} · {action} · {leadLabel} · {column}: before → after`.

For contacts, identical structure. Use `dmt_contacts_audit` rows already loaded by
`loadContactsAudit()`. Click an entry → `scrollToContact(id)` (mirror
[`scrollToLead`](../../app/dmt/leads/page.tsx#L72-L77)) → row highlights for 1.5s
(`bg-blue-lt/70`).

### 1.8 Sticky table header on vertical scroll

User said "სქროლი ლისტის დაბლა" — they want the header to stay visible as the row
list scrolls. Current contacts page does NOT do this. The leads page also doesn't
explicitly, but the user expects this in the rebuild. Implement via:

```tsx
<div className="overflow-y-auto" style={{maxHeight: 'calc(100vh - 280px)'}}>
  <div className="sticky top-0 z-20 bg-sur-2 grid border-b border-bdr" style={{gridTemplateColumns: gridTemplate}}>
    {/* header cells */}
  </div>
  {/* body rows */}
</div>
```

The horizontal `overflow-x-auto` outer wrapper + `minWidth: tableMinWidth` inner div
stays as in leads page.

### 1.9 Empty state

[`app/dmt/leads/page.tsx:418-419`](../../app/dmt/leads/page.tsx#L418-L419) renders
`<EmptyState hasData={rows.length > 0} onAdd={addContact} />`. Two variants:
- `hasData=false` → "ცარიელია · დაამატე პირველი კონტაქტი"
- `hasData=true` (filtered to nothing) → "ფილტრი ცარიელია · გასუფთავება ფილტრის"

### 1.10 Row hover delete button

[`app/dmt/leads/page.tsx:431-439`](../../app/dmt/leads/page.tsx#L431-L439) — `<Trash2>`
icon, opacity-0 by default, opacity-100 on `group-hover`. Confirm dialog before delete.

### 1.11 "Clear table" / Eraser button

[`app/dmt/leads/page.tsx:451-459`](../../app/dmt/leads/page.tsx#L451-L459) — bottom-right
`<Eraser>` button that nukes all visible contacts (audit log preserved). Confirm dialog.

### 1.12 Helper text strip below table

[`app/dmt/leads/page.tsx:447-450`](../../app/dmt/leads/page.tsx#L447-L450):

> 💡 Header-ზე drag — სვეტის გადალაგება · ფუნელი — ფილტრი · მარჯვენა კიდეზე drag — ზომა.
> ცვლილებები ავტომატურად ინახება browser-ში.

Identical text on contacts page.

### 1.13 CSV export of filtered set

[`app/dmt/leads/page.tsx:282-303`](../../app/dmt/leads/page.tsx#L282-L303). Export only
the currently filtered rows, in the currently visible column order. File:
`contacts-{YYYY-MM-DD}.csv`. Quote-escape values.

### 1.14 Actor pill prompt

[`app/dmt/leads/page.tsx:192-197`](../../app/dmt/leads/page.tsx#L192-L197). Reuse `getActor()`/`setActor()` from `lib/dmt/leads-store.ts`. Single shared identity across both pages.

### 1.15 Highlighted row flash

[`app/dmt/leads/page.tsx:70-77`](../../app/dmt/leads/page.tsx#L70-L77). After history-panel click → `setHighlightedId(id)` → row gets `bg-blue-lt/70` for 1500ms then clears. Identical for contacts.

### 1.16 Click-outside-closes for filter popover

[`app/dmt/leads/page.tsx:676-684`](../../app/dmt/leads/page.tsx#L676-L684). `mousedown`
listener checks `closest('[data-filter-popover]')` to keep popover open when clicking
inside. Identical.

### 1.17 keyboard / focus

Match leads page's tab order, focus rings, and Esc-to-close behaviours. No new
keyboard shortcuts beyond what leads has.

---

## 2. Bug fixes (must ship in the same PR)

### 2.1 `Each child in a list should have a unique "key" prop`

Origin: [`app/dmt/leads/manual/page.tsx:1518-1524`](../../app/dmt/leads/manual/page.tsx#L1518-L1524)
renders `<select>` options whose `o.id` is sometimes undefined when seeded data is
malformed. Even though seed has been corrected
([`scripts/seed-dmt-demo.mjs`](../../scripts/seed-dmt-demo.mjs)), the React render
must defend against bad data.

Apply this defensive pattern to **every** `set.options.map(...)` site under `/dmt/**`:

```tsx
{(set?.options ?? [])
  .filter((o): o is {id: string; label: string; color?: string} =>
    !!o && typeof o.id === 'string' && o.id.length > 0
  )
  .map((o) => (
    <option key={o.id} value={o.id}>{o.label}</option>
  ))}
```

Audit at minimum:
- `app/dmt/leads/manual/page.tsx` — `renderExtraCell` callsite
- `components/dmt/lead-status-cell.tsx`
- `components/dmt/lead-labels-cell.tsx`
- `components/dmt/manual-lead-status-cell.tsx`
- `components/dmt/tags-combo.tsx`
- Anywhere new built in this task that maps over variable-set options

### 2.2 `[object Object]` thrown from `apiJson`

Origin: [`app/dmt/leads/manual/page.tsx:152-156`](../../app/dmt/leads/manual/page.tsx#L152-L156)
and the parallel helper at [`lib/dmt/contacts-store.ts:60-72`](../../lib/dmt/contacts-store.ts#L60-L72):

```ts
const error = new Error(String(body?.error ?? `Request failed: ${res.status}`));
```

`String({foo: 'bar'})` → `"[object Object]"`. Fix by extracting a shared helper into
a NEW file `lib/dmt/api.ts`:

```ts
// lib/dmt/api.ts
export function describeApiError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const err = (body as {error?: unknown; message?: unknown}).error
             ?? (body as {message?: unknown}).message;
    if (typeof err === 'string' && err.length > 0) return err;
    if (err && typeof err === 'object') {
      const msg = (err as {message?: unknown}).message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
      try {
        const j = JSON.stringify(err);
        if (j !== '{}') return j;
      } catch {}
    }
  }
  return `Request failed: ${status}`;
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'content-type': 'application/json', ...(init?.headers ?? {})},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(describeApiError(body, res.status));
    (error as Error & {status?: number; body?: unknown}).status = res.status;
    (error as Error & {status?: number; body?: unknown}).body = body;
    throw error;
  }
  return res.json() as Promise<T>;
}
```

Then **delete** the inline `apiJson` definitions in:
- `lib/dmt/contacts-store.ts` — replace with `import {apiJson} from '@/lib/dmt/api'`
- `lib/dmt/leads-store.ts` — replace likewise (audit existing helpers in this file)
- `app/dmt/leads/manual/page.tsx` — replace likewise
- `lib/dmt/offers-store.ts`, `lib/dmt/photos-store.ts` — replace if they have their own copy

Toast/alert UI surfaces `error.message` directly — the new helper guarantees it's a
human-readable string, never `[object Object]`.

---

## 3. Lead-link UI: convert + unlink + green badge

### 3.1 Sequential ID format enforcement

Already implemented in store helpers:
- [`lib/dmt/contacts-store.ts:121-128`](../../lib/dmt/contacts-store.ts#L121-L128) → `nextContactId(rows)` → `C-1001..C-9999`
- [`lib/dmt/leads-store.ts:287-296`](../../lib/dmt/leads-store.ts#L287-L296) → `nextLeadId(rows)` → `L-1001..L-9999`

Server enforcement: `app/api/dmt/contacts/route.ts` POST handler must reject any `id`
not matching `/^C-\d{4,}$/`. Same for leads POST. If the request body lacks `id`, the
server generates the next sequential ID using a SQL query like:

```sql
select coalesce(max(substring(id from '^C-(\d+)$')::int), 1000) + 1 as next
from public.dmt_contacts where id ~ '^C-\d+$';
```

This guarantees uniqueness even with concurrent inserts. Wrap in a transaction.

Display: contacts page renders the raw ID. Drop
[`app/dmt/contacts/page.tsx:39-41`](../../app/dmt/contacts/page.tsx#L39-L41)
(`formatLeadId`) — with sequential IDs there's no need to truncate.

### 3.2 Convert button (when contact is NOT a lead)

Cell renders `<button>+ ლიდად</button>`:

```tsx
<button
  onClick={() => openConvertDialog(contact)}
  className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue-lt px-2 py-0.5 text-[11px] font-semibold text-blue hover:bg-blue hover:text-white"
>
  <Plus size={11} /> ლიდად
</button>
```

Click → opens a small inline popover (NOT a full-screen modal) anchored to the cell:

```tsx
<div className="absolute z-30 mt-1 w-72 rounded-md border border-bdr bg-sur p-3 shadow-lg">
  <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
    ლიდად კონვერტაცია
  </div>
  <label className="block text-[11px] text-text-2">
    Stage
    <select value={stage} onChange={...}>{STAGE_ORDER.map(...)}</select>
  </label>
  <label>Source <select>{SOURCE_ORDER.map(...)}</select></label>
  <label>Owner <input type="text" /></label>
  <label>ღირებულება ₾ <input type="number" /></label>
  <div className="mt-2 flex justify-end gap-1.5">
    <button onClick={cancel} className="...">გაუქმება</button>
    <button onClick={save} className="...">შენახვა</button>
  </div>
</div>
```

On save:
1. Call `convertContactToLead(contact.id, {stage, source, owner, value})`.
2. On success: row's `convertedTo` updates → cell now renders the green badge (3.4).
3. Show toast: `ლიდი შეიქმნა: L-XXXX`.
4. Refresh audit panel (a new `convert` row arrives).

On error: alert with the error message (now safe, never `[object Object]`).

### 3.3 Unlink button (when contact IS a lead)

When `contact.convertedTo` is set, the green badge has an `<X>` button at its right.

Click → `confirm("ამოვშალო ლიდი " + contact.convertedTo + "-დან?")` → on confirm,
call `unlinkLeadFromContact(contact.id)`. On success:
- Row's `convertedTo` becomes null.
- Badge disappears, replaced with `+ ლიდად` button (back to 3.2 state).
- Toast: `ლიდი ამოშლილია`.
- Audit panel gets a new entry.

### 3.4 Green badge (when `convertedTo != null`)

```tsx
<span className="inline-flex items-center gap-1 rounded-full
                 bg-green-50 dark:bg-green-950/30
                 text-green-700 dark:text-green-300
                 border border-green-200 dark:border-green-800
                 px-2 py-0.5 text-[11px] font-medium">
  <CheckCircle2 className="h-3 w-3" aria-hidden />
  ლიდი {contact.convertedTo}
  <button
    onClick={() => unlinkLead(contact)}
    className="ml-1 rounded p-0.5 text-green-700 hover:bg-red-100 hover:text-red-600"
    aria-label="ამოშლა"
    title="ლიდის ამოშლა"
  >
    <X className="h-3 w-3" />
  </button>
</span>
```

Additional row-level cue: when `convertedTo != null`, the row gets
`border-l-4 border-l-green-500` (4px green left-border). This makes "this contact is
a lead" obvious at a glance even when the `convertedTo` column is hidden by user
column reorder.

### 3.5 Click on the lead ID inside the badge

Clicking the lead ID text (not the X) navigates to `/dmt/leads?highlight={leadId}`.
The leads page reads the `highlight` query param on mount and calls `scrollToLead(id)`
to scroll + flash. Ship this query-param hook on the leads page too.

---

## 4. Acceptance criteria — Codex MUST verify each in browser before reporting done

Login as `giorgi@dmt.ge` / `demo123`. Navigate to `/dmt/contacts`. Then:

### Bugs
- [ ] Open browser devtools console. Reload `/dmt/contacts`. **No** `Each child in a list should have a unique "key" prop` warning.
- [ ] Reload `/dmt/leads/manual`. **No** `[object Object]` thrown from `apiJson`. **No** `key` warning.
- [ ] Trigger an API failure (turn off Wi-Fi briefly, then try to update a row). The toast/alert shows a real error string, not `[object Object]`.

### Toolbar
- [ ] Toolbar shows: kicker `OPERATIONS`, title `კონტაქტები`, subtitle text, search box, actor pill, filter pill, history toggle, Export, ახალი.
- [ ] Search "ბერიძე" — table filters to matching contacts. Clear search — full list returns.
- [ ] Click actor pill — prompt opens, change name, table author cells update for new edits.

### Stat cards
- [ ] 3 cards visible at top: `ნაჩვენები`, `ლიდად კონვერტ.` (green accent), `გაუხსნელი` (blue accent). Numbers match filtered set.

### Columns
- [ ] Drag a column header by its `<GripVertical>` handle — column reorders. Reload — order persists.
- [ ] Drag the right edge of a column — column resizes (cursor changes to col-resize). Width clamps to 80–640px. Reload — width persists.
- [ ] Click filter icon on `company` column — popover with checkboxes of distinct companies opens. Tick one → table filters. Reload — filter persists. Click X on the popover — popover closes. Click outside — popover closes.
- [ ] Filter popover for `convertedTo` column shows tri-state select: `ყველა` / `ლიდია` / `არ არის ლიდი`. Each option filters correctly.
- [ ] Filter popover for `tags` column shows multi-checkbox. Selecting `VIP` shows only contacts with that tag.

### Sticky scroll
- [ ] Scroll the body of the table down — the header row stays pinned at the top. Horizontal scroll still works for narrow viewports.

### Editing rows
- [ ] Click on a `name` cell — text becomes editable. Type, blur — value saves to server. New audit entry appears in the history panel.
- [ ] Optimistic update: edit a cell, edit lands instantly in UI before the network request completes.
- [ ] Hover a row — `<Trash2>` icon appears at the right. Click it — confirm dialog, then row deletes. Audit entry recorded.
- [ ] Click `+ ახალი` in toolbar — new contact row inserts at top with ID `C-{next}`. All cells empty/default.

### Lead linkage
- [ ] On a contact with `convertedTo == null`, the `convertedTo` cell shows `+ ლიდად` button. Click → popover with stage/source/owner/value fields → fill → save → cell now shows green badge `<CheckCircle2 /> ლიდი L-XXXX <X>`. Toast: `ლიდი შეიქმნა: L-XXXX`. Row gets 4px green left-border.
- [ ] On a converted contact, click `<X>` in the badge → confirm dialog → row's `convertedTo` becomes null, badge disappears, `+ ლიდად` button returns. Toast: `ლიდი ამოშლილია`. Green left-border removed.
- [ ] Click the lead ID text inside the badge (not the X) → navigates to `/dmt/leads?highlight=L-XXXX` → leads page scrolls to that row + flashes.

### History panel
- [ ] Click `<History>` toggle — right-hand panel slides in showing audit entries. Click an entry — table scrolls to that row + flash for 1.5s.
- [ ] Click toggle again — panel closes.
- [ ] After a convert/unlink, panel updates with the new entry without a page reload.

### CSV export
- [ ] Click `Export` — downloads `contacts-YYYY-MM-DD.csv`. Open in Excel — contains only the filtered rows in the currently visible column order. Headers in row 1, escaped values, UTF-8.

### Clear table
- [ ] Click bottom-right `<Eraser> ცხრილის გასუფთავება` → confirm → all visible contact rows deleted. Audit log retained.

### Misc
- [ ] All 30 seeded contacts display. The 12 with `convertedTo` set show the green badge linking to a real `L-XXXX` ID. The 18 without show `+ ლიდად` button.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] No regressions on `/dmt/leads` (run that page after the refactor and confirm it still works as before).

---

## 5. Implementation hints

### Refactor for reuse — don't copy-paste

Three new shared modules. Move identical logic into them; don't duplicate.

**`lib/dmt/api.ts`** — `apiJson` + `describeApiError` (per §2.2).

**`lib/dmt/table-state.ts`** — generic column-order/widths/filters persistence:

```ts
export function loadColumnOrder<K extends string>(
  storageKey: string,
  defaults: readonly K[]
): K[] { ... }

export function saveColumnOrder<K extends string>(storageKey: string, order: K[]) { ... }

export function loadColumnWidths(storageKey: string): Record<string, number> { ... }
export function saveColumnWidths(storageKey: string, w: Record<string, number>) { ... }

export function loadFilters<F extends Record<string, unknown>>(storageKey: string): Partial<F> { ... }
export function saveFilters<F>(storageKey: string, f: F) { ... }
```

Both leads-store and contacts-store re-export thin wrappers with their own keys.

**`components/dmt/audit-panel.tsx`** — generic audit sidebar:

```tsx
type AuditEntry = {
  id: string;
  at: string;
  by: string;
  action: 'create' | 'update' | 'delete' | 'convert';
  rowId: string;
  rowLabel: string;
  column?: string;
  columnLabel?: string;
  before?: string;
  after?: string;
};

export function DmtAuditPanel({entries, onClose, onScrollToRow}: {
  entries: AuditEntry[];
  onClose: () => void;
  onScrollToRow: (id: string) => void;
}) { ... }
```

Reuse on both leads and contacts.

### Scope discipline — STAY IN /dmt

Do NOT touch:
- `/admin/**`, `/calc/**`, `/tbc/**`, `/sazeo/**`, `/construction/**`, `/auth/**`, `/r/**`
- `lib/auth.ts`, `lib/me-auth.ts`, `proxy.ts`, `next.config.ts`
- Top-level `components/*` outside `components/dmt/**`
- Any migration NOT prefixed `dmt_`

If you need a cross-cutting change (rare), STOP and ask Claude in a comment in this
task doc instead of making the change.

### Don't break the leads page

After refactor, manually navigate to `/dmt/leads`. Confirm:
- Add a lead. Edit cells. Delete. Filter. Resize. Reorder. Export.
- All flows behave identically to before.

If anything regressed, fix before reporting done.

---

## 6. Files expected to change

**New:**
- `lib/dmt/api.ts` — shared `apiJson` + `describeApiError`.
- `lib/dmt/table-state.ts` — shared column/filter persistence helpers.
- `components/dmt/audit-panel.tsx` — shared audit sidebar component.
- `components/dmt/stat-card.tsx` — shared stat card component (if not already shared).
- `components/dmt/contact-convert-popover.tsx` — convert-to-lead inline popover.
- `components/dmt/contact-lead-badge.tsx` — green badge with unlink button.
- `components/dmt/contact-cell-renderers.tsx` — per-kind cell renderer (mirrors leads).
- `components/dmt/contact-header-cell.tsx` — drag/resize/filter header.
- `components/dmt/contact-filter-popover.tsx` — kind-aware popover.

**Modified:**
- `app/dmt/contacts/page.tsx` — full rewrite (~600 → ~1000 lines) using new primitives.
- `lib/dmt/contacts-store.ts` — add `CONTACT_COLUMNS` registry, `DEFAULT_CONTACT_COLUMN_ORDER`, column-state helpers, drop inline `apiJson`.
- `lib/dmt/leads-store.ts` — drop inline `apiJson`, import from `lib/dmt/api`.
- `app/dmt/leads/manual/page.tsx` — drop inline `apiJson`, defensive `.filter(o=>o.id)` on every option-map.
- `app/dmt/leads/page.tsx` — read `?highlight=L-XXXX` query param on mount → `scrollToLead`.
- `components/dmt/lead-status-cell.tsx`, `components/dmt/lead-labels-cell.tsx`, `components/dmt/manual-lead-status-cell.tsx`, `components/dmt/tags-combo.tsx` — defensive `.filter`.
- `app/api/dmt/contacts/route.ts` (POST), `app/api/dmt/leads/route.ts` (POST) — server-side ID generation + format validation.

**No migrations.** **No package.json changes.**

---

## 7. Out of scope

- Mobile layouts (`/dmt/m/contacts`) — defer to follow-up.
- Bulk actions (multi-select rows + bulk delete / bulk convert) — defer.
- Saved filter presets — defer.
- Server-side pagination — current dataset is small (30 rows), client-side filter is fine.
- Visual refresh / theme changes — match existing leads page styling exactly.

---

## 8. Reporting back

When all acceptance criteria pass:
1. Append a `(done YYYY-MM-DD — Codex ✅)` note at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md) — mark the corresponding entry checked + dated.
3. Commit message format:
   ```
   feat(dmt/contacts): full feature parity with leads page + bug fixes (Task 040)

   — column drag-drop reorder / resize / filter popover with persistence
   — sticky table header on vertical scroll
   — convert-to-lead inline popover + unlink with green badge
   — sequential C-XXXX ID format enforced server-side
   — audit history sidebar with scroll-to-row
   — CSV export of filtered set
   — fix: defensive .filter on every set.options.map for malformed seed data
   — fix: shared describeApiError so [object Object] never reaches the user
   ```
