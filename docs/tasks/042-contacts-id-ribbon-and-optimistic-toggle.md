# Task 042 — Contacts: diagonal LEAD ribbon on ID cell + optimistic lead-toggle

**Status:** done 2026-05-07 — Codex ✅
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/contacts` only. Specifically [`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx). No other files.

---

## 0. Why

User reviewed `/dmt/contacts` after Task 041 shipped. Two refinements:

> სვეტზე ID-თან რამე ცერად გადაადე ზევიდან, რომ ლიდია — რაიმე იარლიკი.
> ასევე, როცა toggle ვაწვები, დიდხანს უნდება ძალიან.

Translation:
1. **Diagonal ribbon overlay on the ID cell** when the contact is a lead — visual cue at the leftmost column saying "this is a lead", in addition to the green left-border + green toggle.
2. **Lead toggle is slow** — clicking it waits for the server roundtrip before flipping the UI. Make it optimistic so the toggle flips instantly and the network call runs in the background.

This task is just those two items. Nothing else.

---

## 1. Diagonal "ლიდი" ribbon on the ID cell

### Where

[`app/dmt/contacts/page.tsx:533`](../../app/dmt/contacts/page.tsx#L533):

```tsx
if (col === 'id') return <ReadCell mono>{row.id}</ReadCell>;
```

### What to render

When `row.convertedToLeadId != null`, the ID cell should additionally render a small
diagonal banner ribbon over its top-left corner. When `convertedToLeadId == null`,
the cell renders unchanged (no ribbon, no overhead).

### Visual spec

- A green ribbon, ~42px wide × ~14px tall, anchored to the top-left of the cell.
- Rotated -45° so the ribbon runs from upper-right of the cell down to lower-left.
- Text inside ribbon: `ლიდი`, white, 8px, bold, uppercase tracking, letter-spaced.
- Background: the same green used by the toggle (`bg-green-500` / `#10b981`).
- A faint shadow under the ribbon for depth (1px green-700 below).
- Overflow on the cell must be `hidden` so the ribbon's tail doesn't bleed into
  neighbouring cells. Apply `position: relative` on the cell wrapper.

### Implementation

Replace the line above with a small wrapper component:

```tsx
function ContactIdCell({id, isLead}: {id: string; isLead: boolean}) {
  return (
    <div className="relative h-full overflow-hidden border-r border-bdr">
      {isLead && (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-[14px] top-[6px]
                     w-[56px] -rotate-45 select-none
                     bg-green-500 text-center font-mono text-[8px] font-bold
                     uppercase tracking-[0.06em] text-white shadow-[0_1px_0_0_#047857]"
        >
          ლიდი
        </span>
      )}
      <div className="px-3 py-2 font-mono text-[11.5px] font-semibold text-navy">
        {id}
      </div>
    </div>
  );
}
```

Then update the cell renderer:

```tsx
if (col === 'id') return <ContactIdCell id={row.id} isLead={row.convertedToLeadId != null} />;
```

(`<ReadCell mono>` becomes inline — fine, it's a one-off shape.)

### Acceptance for §1

- A contact with `convertedToLeadId != null` shows a small diagonal green
  `ლიდი` ribbon in the top-left of its ID cell, plus the existing 4px green
  left-border on the row.
- A contact with `convertedToLeadId == null` shows the ID cell unchanged.
- Toggling lead-state on/off makes the ribbon appear / disappear immediately
  (paired with §2 below).
- Ribbon does not bleed outside the cell — column resize narrower than 60px
  still works without visible overflow into the next column.

---

## 2. Optimistic lead-toggle (instant UI, background network)

### Where

[`app/dmt/contacts/page.tsx:213-239`](../../app/dmt/contacts/page.tsx#L213-L239):

```ts
const convertToLead = async (contact: Contact) => {
  try {
    const converted = await convertContactToLead(contact.id, {...});
    setRows((prev) => prev.map((row) => row.id === contact.id ? converted.contact : row));
    ...
  } catch (err) { ... }
};

const unlinkLead = async (contact: Contact) => {
  if (!contact.convertedToLeadId) return;
  try {
    const result = await unlinkLeadFromContact(contact.id);
    setRows((prev) => prev.map((row) => row.id === contact.id ? result.contact : row));
    ...
  } catch (err) { ... }
};
```

Currently both `await` the server before updating `rows`, so the toggle stays in
its old visual state until the request finishes — feels frozen.

### What to change

Flip the row state **before** the await, then reconcile / rollback after.

```ts
const convertToLead = async (contact: Contact) => {
  // Optimistic flip — toggle visually goes ON immediately.
  const nowIso = new Date().toISOString();
  const optimistic: Contact = {
    ...contact,
    convertedToLeadId: '__pending__',
    convertedAt: nowIso,
    convertedBy: actor,
    updatedAt: nowIso,
    updatedBy: actor,
  };
  setRows((prev) => prev.map((row) => row.id === contact.id ? optimistic : row));

  try {
    const converted = await convertContactToLead(contact.id, {
      stage: 'new',
      source: 'manual',
      owner: '',
      value: 0,
    });
    // Reconcile with server response (real lead id replaces __pending__).
    setRows((prev) => prev.map((row) => row.id === contact.id ? converted.contact : row));
    if (converted.contactAuditEntry) {
      setAudit((prev) => [converted.contactAuditEntry!, ...prev]);
    }
    showToast(`ლიდი შეიქმნა: ${converted.lead.id}`);
  } catch (err) {
    // Rollback to the original contact.
    setRows((prev) => prev.map((row) => row.id === contact.id ? contact : row));
    showToast(err instanceof Error ? err.message : 'ლიდად გადაყვანა ვერ დასრულდა');
  }
};

const unlinkLead = async (contact: Contact) => {
  if (!contact.convertedToLeadId) return;
  // Optimistic flip — toggle visually goes OFF immediately.
  const nowIso = new Date().toISOString();
  const optimistic: Contact = {
    ...contact,
    convertedToLeadId: null,
    convertedAt: null,
    convertedBy: null,
    updatedAt: nowIso,
    updatedBy: actor,
  };
  setRows((prev) => prev.map((row) => row.id === contact.id ? optimistic : row));

  try {
    const result = await unlinkLeadFromContact(contact.id);
    setRows((prev) => prev.map((row) => row.id === contact.id ? result.contact : row));
    if (result.contactAuditEntry) {
      setAudit((prev) => [result.contactAuditEntry!, ...prev]);
    }
    showToast('ლიდი ამოშლილია');
  } catch (err) {
    setRows((prev) => prev.map((row) => row.id === contact.id ? contact : row));
    showToast(err instanceof Error ? err.message : 'ლიდი ვერ ამოიშალა');
  }
};
```

### Concurrency / double-click guard

Add a Set tracking in-flight contact IDs so a fast double-click on the toggle
doesn't fire two requests:

```ts
const [pendingLeadOps, setPendingLeadOps] = useState<Set<string>>(new Set());
```

Wrap each handler:

```ts
const convertToLead = async (contact: Contact) => {
  if (pendingLeadOps.has(contact.id)) return;
  setPendingLeadOps((prev) => { const n = new Set(prev); n.add(contact.id); return n; });
  // ... optimistic + try/catch ...
  setPendingLeadOps((prev) => { const n = new Set(prev); n.delete(contact.id); return n; });
};
```

Pass `disabled={pendingLeadOps.has(row.id)}` down to the `ContactLeadToggle` so
the button greys out / shows a small spinner during the in-flight request. The
toggle button becomes:

```tsx
<button
  type="button"
  role="switch"
  aria-checked={isLead}
  onClick={onToggle}
  disabled={pending}
  className={`... ${pending ? 'opacity-60 cursor-wait' : ''} ...`}
>
  ...
</button>
```

### `__pending__` placeholder behaviour

While the server request is in flight, `convertedToLeadId` is `'__pending__'`.
The ribbon and toggle treat any non-null value as "is a lead", so the visual is
correct. The cell does NOT display the placeholder string anywhere — only the
ribbon shows `ლიდი`. This is fine because `convertedToLeadId` isn't rendered as
text after the Task 041 cleanup (the cell only renders the toggle + label).

If the request fails, rollback restores the original null. If it succeeds, the
real `L-XXXX` (or plain integer) lead id replaces `__pending__`. Either way,
`'__pending__'` never reaches the user's eye.

### Acceptance for §2

- Click the toggle on a non-lead contact: toggle flips ON within 1 frame
  (~16ms). Ribbon appears immediately. Green left-border appears immediately.
  The network roundtrip happens in the background.
- After the network completes, the toast `ლიდი შეიქმნა: X` appears, history
  panel updates with a new audit row, and the lead is visible on `/dmt/leads`.
- Click the toggle on a lead contact: confirm dialog → toggle flips OFF within
  1 frame, ribbon disappears, border disappears. Network roundtrip happens in
  the background.
- Disconnect Wi-Fi, click the toggle: it flips optimistically, then ~5s later
  the request fails, the toggle rolls back to its prior state, and a toast
  shows the error message (real string, not `[object Object]`).
- Double-clicking the toggle does NOT fire two requests. Second click is
  ignored while the first is in flight (toggle visibly disabled / opacity-60 /
  cursor-wait).
- After all of the above, no console errors, no React warnings, no leaked
  state where a toggle stays "frozen" pending forever.

---

## 3. Out of scope

- Anywhere outside `app/dmt/contacts/page.tsx` and the file's local helpers.
- The lead conversion form / popover (gone in Task 041 — stay gone).
- Any other column's cell renderer.
- `/dmt/leads` page.

---

## 4. Files expected to change

Just one:
- `app/dmt/contacts/page.tsx` — add `<ContactIdCell>` helper, update id cell
  renderer, rewrite `convertToLead` + `unlinkLead` for optimistic updates,
  add `pendingLeadOps` set, plumb `pending` prop into `<ContactLeadToggle>`.

No new components. No new files. No migrations. No package.json changes.

---

## 5. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md).
3. Commit: `feat(dmt/contacts): diagonal LEAD ribbon on ID cell + optimistic lead toggle (Task 042)`
