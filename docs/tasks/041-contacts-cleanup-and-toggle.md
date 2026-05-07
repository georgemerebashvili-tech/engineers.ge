# Task 041 — Contacts page cleanup: remove per-column filters, lead-toggle, plain IDs

**Status:** done 2026-05-07 — Codex ✅
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/contacts` only. Bug-fix sites: `lib/dmt/contacts-store.ts`, server route under `app/api/dmt/contacts`. Do NOT touch `/dmt/leads` or anywhere outside `/dmt/contacts/**`.

---

## 0. Why

User reviewed the just-shipped Task 040 result on `/dmt/contacts` and asked for
five focused cleanups. The page currently has too much chrome — filter icons on
every column, an unused actor pill, a heavy lead badge with its own X button.
This task strips it down.

User feedback verbatim:

> ყველა სვეტს აქვს ფილტრი — ეს ფილტრი არ მინდა. ფილტრი მინდა "ლიდია თუ არა"
> მაგით ასევე ფილტრეს. მარცხენა მხარეს რატო აწერია "მე" — არაფრის მომცემია.
> სვეტის ბოლოში არ არის სქროლი მაჩვენებელი. ლიდის აღნიშვნის ვიზუალი საშინელია —
> გადააკეთე toggle-ად: ეწეროს "ლიდი", toggle ჩართული თუ ლიდია, თორემ გამორთული.
> ID-ები იყოს გასაბრძი 1, 2, 3, 4 ასე შემდეგ.

This is **the only scope of this task**. Do not touch anything else. Do not
"improve" surrounding code.

---

## 1. Remove per-column filter funnel icons

**Current state:** every column header in `/dmt/contacts` renders a `<Filter>` icon
that opens a per-column filter popover.

**Wanted:** drop the funnel icon and popover from EVERY column header. The header
should contain ONLY:
- (optional) `<GripVertical>` drag handle on hover
- the column label
- the right-edge resize grabber

Delete (or stop rendering):
- `filterPopover` state in the contacts page component
- `<FilterPopover>` callsite per column
- The `<Filter>` icon inside header cell

**Keep** the column drag-drop reorder and resize features intact. Those are good.

Also delete the toolbar pill that shows `ფილტრი N ×` / `ფილტრი სვეტებიდან` —
both visual states should disappear, since they referenced the per-column filter
system that's being removed.

The per-column `filters` state object and its localStorage persistence
(`dmt_contacts_filters_v1`) should be removed too. Don't leave dead code.

---

## 2. Add a single "ლიდი თუ არა" filter in the toolbar

Replace the deleted filter pill with a dedicated tri-state toggle:

```tsx
<div className="inline-flex items-center rounded-md border border-bdr bg-sur-2 p-0.5 text-[11.5px] font-semibold">
  <button
    onClick={() => setLeadFilter('all')}
    className={leadFilter === 'all'
      ? 'rounded bg-blue px-2.5 py-1 text-white'
      : 'px-2.5 py-1 text-text-2 hover:text-blue'}
  >
    ყველა
  </button>
  <button
    onClick={() => setLeadFilter('lead')}
    className={leadFilter === 'lead'
      ? 'rounded bg-green-600 px-2.5 py-1 text-white'
      : 'px-2.5 py-1 text-text-2 hover:text-green-600'}
  >
    ლიდი
  </button>
  <button
    onClick={() => setLeadFilter('not')}
    className={leadFilter === 'not'
      ? 'rounded bg-text-3 px-2.5 py-1 text-white'
      : 'px-2.5 py-1 text-text-2 hover:text-text-2'}
  >
    არ არის ლიდი
  </button>
</div>
```

State key for localStorage persistence: `dmt_contacts_lead_filter_v1` (values: `'all' | 'lead' | 'not'`).

Filter logic:
- `all` → show everything
- `lead` → show contacts where `convertedTo != null`
- `not` → show contacts where `convertedTo == null`

---

## 3. Remove the "მე" (actor) pill

Toolbar has a `<UserRound> მე` button at the left. Delete it (button + click
handler + actor prompt). The actor identity is still tracked behind the scenes
(`getActor()` from `lib/dmt/leads-store`) for audit log writes — that part stays.
Just don't surface the pill in the contacts toolbar.

---

## 4. Visible horizontal scrollbar at the bottom of the table

Currently the table uses `overflow-x-auto` which on macOS hides the scrollbar
unless the user is actively scrolling (system preference). User can't tell that
horizontal scroll exists.

Force a visible scrollbar:

```css
.dmt-scroll-x {
  overflow-x: scroll; /* not auto */
  scrollbar-width: thin;          /* Firefox */
  scrollbar-color: var(--bdr-2) transparent;
}
.dmt-scroll-x::-webkit-scrollbar {
  height: 10px;
}
.dmt-scroll-x::-webkit-scrollbar-track {
  background: var(--sur-2);
  border-radius: 5px;
}
.dmt-scroll-x::-webkit-scrollbar-thumb {
  background: var(--bdr-2);
  border-radius: 5px;
}
.dmt-scroll-x::-webkit-scrollbar-thumb:hover {
  background: var(--text-3);
}
```

Apply the class to the wrapper `<div>` around the table that already has
`overflow-x-auto`. Keep vertical scroll behaviour as-is (sticky header, native
vertical scroll on `overflow-y-auto`).

Place the CSS in `app/dmt/contacts/page.tsx` as a `<style jsx>` block, OR add
to `app/globals.css` if a global utility makes more sense. Codex picks.

---

## 5. Lead-link as toggle, not badge

**Current:** the `convertedTo` cell renders one of:
- `+ ლიდად` button (when not a lead) → click opens a popover with stage/source/owner/value fields
- `<CheckCircle2 /> ლიდი L-XXXX <X>` green badge (when is a lead) → X click unlinks

**Wanted:** a single iOS-style toggle switch in the cell, with the label `ლიდი`
to its right.

```tsx
function ContactLeadToggle({contact, onConvert, onUnlink}: {
  contact: Contact;
  onConvert: (contact: Contact) => Promise<void>;
  onUnlink: (contact: Contact) => Promise<void>;
}) {
  const isLead = contact.convertedTo != null;
  const onToggle = async () => {
    if (isLead) {
      if (!confirm('ამოვშალო ლიდი?')) return;
      await onUnlink(contact);
    } else {
      await onConvert(contact); // no popover — convert with sane defaults
    }
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={isLead}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                    transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
                    focus:ring-green-500 ${isLead ? 'bg-green-500' : 'bg-text-3/40'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                          transition-transform duration-150
                          ${isLead ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </button>
      <span className={`text-[11.5px] font-semibold
                        ${isLead ? 'text-green-700 dark:text-green-300' : 'text-text-3'}`}>
        ლიდი
      </span>
    </div>
  );
}
```

- Toggle OFF (grey) → contact is not a lead. Click to convert: call
  `convertContactToLead(contact.id, {stage:'new', source:'manual', owner:'', value:0})`
  WITHOUT opening a popover. Use sane defaults; user can edit the lead later on
  `/dmt/leads`. Show toast: `ლიდი შეიქმნა: L-XXXX`.
- Toggle ON (green) → contact is a lead. Click to unlink with confirm:
  `unlinkLeadFromContact(contact.id)`. Show toast: `ლიდი ამოშლილია`.

The label always reads `ლიდი` regardless of state. The colour of the toggle and
label communicates state. No `L-XXXX` ID string in the cell. No `<X>` close
button — clicking the toggle itself flips the state.

Drop entirely:
- `components/dmt/contact-convert-popover.tsx` (created in Task 040) — no longer used
- `components/dmt/contact-lead-badge.tsx` (created in Task 040) — no longer used
- The `+ ლიდად` button render path
- The green badge render path

Replace with the new `<ContactLeadToggle>` component (place inline in
`app/dmt/contacts/page.tsx` or as `components/dmt/contact-lead-toggle.tsx` —
short enough to inline if it's <40 lines).

**Keep** the row-level cue: when `convertedTo != null`, the row gets a
`border-l-4 border-l-green-500` (4px green left-border). That's a nice
peripheral signal even at a glance.

---

## 6. Plain numeric IDs (`1, 2, 3, 4, …`)

Currently `nextContactId(rows)` returns `C-1001, C-1002, …`. Change to plain
positive integers stored as text:

```ts
// lib/dmt/contacts-store.ts
export function nextContactId(rows: Contact[]): string {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}
```

Server-side ID generation (`app/api/dmt/contacts/route.ts` POST handler) does the
same — derive from a SQL query:

```sql
select coalesce(max(case when id ~ '^[0-9]+$' then id::int end), 0) + 1 as next
from public.dmt_contacts;
```

Format validation: `/^[1-9][0-9]*$/` (no leading zeros).

**Apply the same scheme to `dmt_leads.id`** (`L-1001` → `1, 2, 3, …`). Update:
- `nextLeadId(rows)` in `lib/dmt/leads-store.ts`
- `app/api/dmt/leads/route.ts` POST handler
- The `?highlight=` query-param hook on `/dmt/leads` (it now matches plain digits)

**Display:** strip any `C-` / `L-` prefix everywhere the ID is shown. The leads
page already renders `{r.id}` raw — just confirm it works with `"42"` instead of
`"L-1042"`.

**Seeded data:** the seed script must use plain integers too. Update
[`scripts/seed-dmt-demo.mjs`](../../scripts/seed-dmt-demo.mjs):
- Contacts: `id = String(i + 1)` (loops from 0..29 → `"1".."30"`)
- Leads: `id = String(i + 1)` (loops from 0..29 → `"1".."30"`)
- Manual leads, offers, photos: same pattern (`"1".."N"`)

Then re-run seed:
```bash
DATABASE_URL=... node scripts/seed-dmt-demo.mjs
```

(Claude has already updated the seed in this PR — verify the script before re-running.)

The DB schema is already `id text primary key`, so no migration needed.

---

## 7. Acceptance criteria — verify in browser

Login as `giorgi@dmt.ge` / `demo123`. Open `/dmt/contacts`.

- [ ] **No** filter funnel icon next to ANY column label.
- [ ] **No** "მე" actor pill in the toolbar.
- [ ] **No** `ფილტრი N ×` or `ფილტრი სვეტებიდან` pill in the toolbar.
- [ ] Toolbar contains the new tri-state `ყველა / ლიდი / არ არის ლიდი` filter. Each option filters the table. State persists across reloads.
- [ ] At the bottom of the table area, a horizontal scrollbar is **always visible** (not just on hover). Dragging it scrolls columns horizontally.
- [ ] In the `convertedTo` column cell:
  - When the contact is not a lead, an **OFF** toggle (grey) + label `ლიდი` (grey) is shown.
  - Click the toggle → instant convert (no popover) → toggle flips to **ON** (green) → label turns green → toast `ლიდი შეიქმნა: NN`.
  - On a converted contact, click the toggle → confirm → toggle flips OFF → toast `ლიდი ამოშლილია`.
- [ ] Converted contact row has a 4px green left-border. Removing the lead removes the border too.
- [ ] All seeded contacts display IDs `1..30` (plain integers, no `C-` prefix).
- [ ] All seeded leads on `/dmt/leads` display IDs `1..30` (plain integers, no `L-` prefix).
- [ ] Adding a new contact via `+ ახალი` creates ID `31` (next sequential).
- [ ] Column reorder still works. Column resize still works. Sticky header still works. Search still works. CSV export still works. History panel still works.
- [ ] No console errors or React warnings on either page.
- [ ] `npm run lint` passes. `npm run typecheck` passes.

---

## 8. Out of scope

- Any change to `/dmt/leads` UI beyond the ID-format change.
- Any change to `/dmt/leads/manual`, `/dmt/inventory`, `/dmt/invoices`,
  `/dmt/users`, `/dmt/audit`, `/dmt/contacts/*` sub-routes.
- Visual restyling of cells unrelated to the lead toggle.
- Adding new columns, removing columns other than the filter chrome.
- Migration of existing user-created data IDs (those don't exist in prod yet —
  only seed data, which we re-seed).

---

## 9. Files expected to change

- `app/dmt/contacts/page.tsx` — main page; rip out filter UI, drop actor pill, add lead-tri-state toggle in toolbar, swap convertedTo cell renderer to `<ContactLeadToggle>`, add `dmt-scroll-x` className.
- `lib/dmt/contacts-store.ts` — `nextContactId` returns plain integer; drop column-filter persistence helpers if they live here.
- `lib/dmt/leads-store.ts` — `nextLeadId` returns plain integer.
- `app/api/dmt/contacts/route.ts` — server-side plain-integer ID generation + format validation.
- `app/api/dmt/leads/route.ts` — same.
- `app/dmt/leads/page.tsx` — adapt `?highlight=` regex to match plain digits (one-line change). NO other changes here.
- `scripts/seed-dmt-demo.mjs` — plain-integer IDs for contacts, leads, manual leads, offers, photos.
- (delete) `components/dmt/contact-convert-popover.tsx` — no longer used.
- (delete) `components/dmt/contact-lead-badge.tsx` — no longer used.
- (new, optional) `components/dmt/contact-lead-toggle.tsx` — the toggle component.
- `app/globals.css` OR inline `<style jsx>` in contacts page — `dmt-scroll-x` rules.

**No migrations.** **No package.json changes.**

---

## 10. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md).
3. Commit: `feat(dmt/contacts): cleanup — drop per-column filter, lead-toggle UI, plain IDs (Task 041)`
