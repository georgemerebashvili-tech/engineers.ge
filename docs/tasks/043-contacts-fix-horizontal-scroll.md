# Task 043 — Contacts: fix the horizontal scrollbar (broken in Task 041)

**Status:** done 2026-05-07 — Codex ✅
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `/dmt/contacts` only. Specifically [`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx). No other files.

---

## 0. Why

User feedback after Task 041 shipped:

> ქვედა ჰორიზონტალური სქროლი არ მუშაობს.

The custom-styled `.dmt-scroll-x` scrollbar is rendered, but dragging it doesn't
move the columns. Resizing columns past the viewport width does not produce a
working horizontal scroll.

This task fixes that single bug. Nothing else.

---

## 1. Root cause

Current structure in [`app/dmt/contacts/page.tsx:382-446`](../../app/dmt/contacts/page.tsx#L382-L446):

```tsx
<div className="dmt-scroll-x rounded-[10px] border border-bdr bg-sur">         {/* outer: overflow-x: scroll */}
  <div style={{minWidth: tableMinWidth}}>                                       {/* inner: wider-than-parent */}
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">                 {/* ❌ broken: overflow-y on a child kills overflow-x of parent */}
      <div className="sticky top-0 z-20 grid …">{header cells}</div>
      {body rows}
    </div>
  </div>
</div>
```

Why this is broken:

- The outer `<div>` has `overflow-x: scroll` (from `.dmt-scroll-x`).
- The inner-most `<div>` has `overflow-y: auto`. Per CSS spec, when one axis has
  `auto`/`scroll`/`hidden` and the other is `visible`, the `visible` value is
  silently converted to `auto`. So that inner element ends up with effectively
  `overflow: auto auto` — it clips on **both** axes.
- That clipping happens at the inner element, so the outer `.dmt-scroll-x`
  never sees content wider than its own viewport. There's nothing to scroll
  horizontally at the outer level.
- The custom-styled scrollbar at the bottom of `.dmt-scroll-x` renders (because
  `overflow-x: scroll` always reserves the gutter), but it has zero scrollable
  range. Dragging it does nothing.
- The horizontal scrollbar that *would* work is on the inner `overflow-y-auto`
  element — but that element's `<div minWidth={tableMinWidth}>` parent is
  positioned outside it, so the inner element's content is exactly its own
  width. No horizontal overflow, no horizontal scroll.

In short: **two nested overflow contexts cancel each other out**.

---

## 2. The fix

Collapse the two scroll containers into one element that owns both axes. Then
the wider-than-parent `<div minWidth={tableMinWidth}>` lives inside that single
container.

### New structure

```tsx
<div className="dmt-scroll rounded-[10px] border border-bdr bg-sur">
  <div style={{minWidth: tableMinWidth}}>
    <div
      className="sticky top-0 z-20 grid border-b border-bdr bg-sur-2 text-[11px] font-bold text-text-3"
      style={{gridTemplateColumns: gridTemplate}}
    >
      {/* header cells */}
    </div>

    {/* body rows */}
  </div>
</div>
```

(Drop the inner `<div className="max-h-... overflow-y-auto">` entirely.)

### CSS update

Rename the class from `.dmt-scroll-x` to `.dmt-scroll` and own both axes on the
same element. This is also where the `max-height` lives now:

```css
.dmt-scroll {
  overflow-x: scroll;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  scrollbar-width: thin;
  scrollbar-color: var(--bdr-2) transparent;
}
.dmt-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.dmt-scroll::-webkit-scrollbar-track {
  background: var(--sur-2);
  border-radius: 5px;
}
.dmt-scroll::-webkit-scrollbar-thumb {
  background: var(--bdr-2);
  border-radius: 5px;
}
.dmt-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-3);
}
.dmt-scroll::-webkit-scrollbar-corner {
  background: var(--sur-2);
}
```

Update [`app/dmt/contacts/page.tsx:454-471`](../../app/dmt/contacts/page.tsx#L454-L471)
(the `<style jsx global>` block) accordingly.

### Wrapper element update

[`app/dmt/contacts/page.tsx:382`](../../app/dmt/contacts/page.tsx#L382):

```tsx
- <div className="dmt-scroll-x rounded-[10px] border border-bdr bg-sur">
+ <div className="dmt-scroll rounded-[10px] border border-bdr bg-sur">
```

Drop the now-redundant inner `<div className="max-h-[calc(100vh-280px)] overflow-y-auto">`
at line 384 — the parent now owns both axes. Move its children up one level so
the structure is:

```tsx
<div className="dmt-scroll rounded-[10px] border border-bdr bg-sur">
  <div style={{minWidth: tableMinWidth}}>
    <div className="sticky top-0 z-20 grid …">…header…</div>
    …body rows…
  </div>
</div>
```

### Why the sticky header still works

The sticky-positioned header looks for the nearest scrolling ancestor as its
"sticky context". After the collapse, the nearest scrolling ancestor is
`.dmt-scroll` (which has both `overflow-x: scroll` + `overflow-y: auto`).
`top: 0` therefore pins the header to the top of `.dmt-scroll` during vertical
scroll — same UX as before. Horizontal scroll moves both header and body
together because they live inside the same wider-than-viewport `<div minWidth>`.

---

## 3. Acceptance criteria — verify in browser

Login as `giorgi@dmt.ge` / `demo123`. Open `/dmt/contacts`. Then:

- [ ] **Horizontal scrollbar visible at the bottom of the table area** (custom-styled, 10px height, blue thumb).
- [ ] **Drag the horizontal scrollbar thumb** with the mouse — columns scroll left/right. Both header and body rows scroll together (no drift).
- [ ] **Resize a column wider than the viewport** — horizontal scroll range increases, scrollbar thumb shrinks proportionally.
- [ ] **Reorder columns** by dragging headers — the new order persists during horizontal scroll.
- [ ] **Sticky header still works** — scroll the body vertically, the header stays pinned at the top of `.dmt-scroll`.
- [ ] **Vertical scroll** still works (the page has ~30 contacts; with `max-height: calc(100vh - 280px)` on most viewports, vertical scroll appears when the content exceeds viewport height).
- [ ] **Trackpad two-finger horizontal swipe** scrolls horizontally (Mac).
- [ ] **Shift+mousewheel** scrolls horizontally (Windows / standard).
- [ ] **Lead toggle, ID ribbon, filters, search, history panel, CSV export, row delete** — none of these regress.
- [ ] **No console errors or React warnings.**
- [ ] `npm run lint` passes. `npm run typecheck` passes.

---

## 4. Out of scope

- Anywhere outside `app/dmt/contacts/page.tsx`.
- Visual styling of the scrollbar beyond what's in §2 (height, thumb colour).
- The scrollbar on `/dmt/leads` (different file, different scope).

---

## 5. Files expected to change

Just one:
- `app/dmt/contacts/page.tsx` — collapse two overflow contexts into one,
  rename `.dmt-scroll-x` → `.dmt-scroll`, move `max-height` and `overflow-y` into
  the unified class.

No new files. No deletions. No migrations. No package.json changes.

---

## 6. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md) — mark the corresponding entry checked.
3. Commit: `fix(dmt/contacts): collapse nested overflow wrappers so horizontal scroll works (Task 043)`
