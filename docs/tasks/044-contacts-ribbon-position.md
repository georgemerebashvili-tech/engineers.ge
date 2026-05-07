# Task 044 — Contacts: move LEAD ribbon to top-right (don't cover the ID)

**Status:** done 2026-05-07 — Codex ✅
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/contacts` only. Specifically the `ContactIdCell` helper in
[`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx). No other files.

---

## 0. Why

User feedback after Task 042 shipped:

> ლიდი რომ აწერია — ეგ იარლიკი აიდზე ფარავს. ამიტომ მარჯვენა მხარეს გადაიტანე,
> ან ისე, რომ არაფერი დაფაროს.

The diagonal `ლიდი` ribbon currently sits at the **top-left** corner of the ID
cell, rotated `-45°`. With ID values like `1`, `2`, `10` rendered at
`px-3 py-2` from the cell's top-left, the rotated ribbon visually crosses over
the digits. The user wants the ribbon out of the ID's way.

This task moves the ribbon to the **top-right** corner of the ID cell so the
digits remain clearly readable.

---

## 1. Where

[`app/dmt/contacts/page.tsx:625-641`](../../app/dmt/contacts/page.tsx#L625-L641):

```tsx
function ContactIdCell({id, isLead}: {id: string; isLead: boolean}) {
  return (
    <div className="relative h-full overflow-hidden border-r border-bdr">
      {isLead && (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-[14px] top-[6px]
                     w-[56px] -rotate-45 select-none bg-grn text-center
                     font-mono text-[8px] font-bold uppercase tracking-[0.06em]
                     text-white shadow-[0_1px_0_0_var(--navy-2)]"
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

---

## 2. The fix

Flip the ribbon to the **top-right** corner with a positive 45° rotation, so it
sits in the cell's top-right triangle. The ID text at `px-3 py-2` lives in the
left/center of the cell — well clear of the right-corner ribbon.

```tsx
function ContactIdCell({id, isLead}: {id: string; isLead: boolean}) {
  return (
    <div className="relative h-full overflow-hidden border-r border-bdr">
      <div className="px-3 py-2 font-mono text-[11.5px] font-semibold text-navy">
        {id}
      </div>
      {isLead && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[14px] top-[6px]
                     w-[56px] rotate-45 select-none bg-grn text-center
                     font-mono text-[8px] font-bold uppercase tracking-[0.06em]
                     text-white shadow-[0_1px_0_0_var(--navy-2)]"
        >
          ლიდი
        </span>
      )}
    </div>
  );
}
```

Three changes:

1. `-left-[14px]` → `-right-[14px]` (anchor to right edge instead of left).
2. `-rotate-45` → `rotate-45` (positive 45°, ribbon runs upper-left to lower-right
   inside the top-right corner).
3. Move the ribbon `<span>` to render **after** the ID `<div>`. With `position:
   absolute` the visual order doesn't matter for layout, but rendering order
   determines z-stacking when both are present in the same stacking context.
   Putting the ribbon last means it's on top — visible — but the ID is already
   not under it after the position flip, so this is just defensive.

The rest stays the same: same green (`bg-grn`), same 8px caps font, same shadow,
same `overflow-hidden` clipping on the parent so the ribbon's tail doesn't bleed
into the column to the right.

---

## 3. Acceptance

Login as `giorgi@dmt.ge` / `demo123`. Open `/dmt/contacts`. Then:

- [ ] On a contact where the lead toggle is ON, the green `ლიდი` ribbon appears
  in the **top-right** corner of the ID cell, rotated so the text reads from
  upper-left to lower-right of the ribbon.
- [ ] The ID number itself (e.g. `1`, `7`, `12`, `30`) is **fully visible** —
  no part of any digit is covered by the ribbon.
- [ ] On a contact where the lead toggle is OFF, no ribbon is rendered.
- [ ] Toggling lead-state still flips the ribbon visibility immediately
  (Task 042's optimistic update remains intact).
- [ ] Resizing the ID column narrower than 60px still doesn't make the ribbon
  bleed into the next column (the `overflow-hidden` parent clips it).
- [ ] No regression on the toggle, the green left-border, the row hover, or
  any other column.

---

## 4. Out of scope

Anything outside the `ContactIdCell` helper. No other files. No CSS file
changes. No new components.

---

## 5. Files expected to change

Just one:
- `app/dmt/contacts/page.tsx` — three small attribute edits inside `ContactIdCell`.

---

## 6. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md).
3. Commit: `fix(dmt/contacts): move LEAD ribbon to top-right corner so it doesn't cover the ID (Task 044)`
