# Task 027 — Editor Foundation Wiring (state ↔ panel)

**Delegated to:** Codex (state/logic)
**Created:** 2026-04-18
**Depends on:** Task 026 (Coohom parity spec)
**Blocks:** Task 026 Phase B.2 (selection ctx menu actions), Phase B.4 (PIP), Phase B.5 (multi-floor)

## What Claude already built (design side — DO NOT re-do)

Claude shipped the portable UI base. These files are the single source of truth and are meant to be reused by every future editor (stair-press, elevator, parking, corridor, composer):

- [`public/calc/_editor-ui.css`](../../public/calc/_editor-ui.css) — portable primitives with `.ep-*` namespace:
  - Panel shell: `.ep-panel`, `.ep-panel-head`, `.ep-panel-body`, `.ep-section`, `.ep-section-head/body`
  - Field primitives: `.ep-field`, `.ep-field-grid`, `.ep-input`, `.ep-num`, `.ep-seg`, `.ep-toggle`, `.ep-slider-row`, `.ep-swatch`
  - Floating UI: `.ep-ctx` (selection menu), `.ep-pip` (draggable preview), `.ep-chip`
  - Library: `.ep-lib-grid`, `.ep-lib-card`
  - Helpers: `.ep-empty`, `.ep-hint`, `.ep-warn`, `.ep-divider`, `[data-tip]`
- [`public/calc/_editor-panels.js`](../../public/calc/_editor-panels.js) — pure renderer with global `EditorPanels`:
  - `EditorPanels.render(container, ctx, handlers)`
  - `EditorPanels.ctxMenu(host, selection, handlers)`
  - `EditorPanels.registerType(type, fn)` — for editor-specific contexts
  - `EditorPanels.makePreviewSvg(kind, opts)` — catalog previews
  - `EditorPanels.build.*` — low-level builders (`h`, `field`, `numInput`, etc.)
- [`public/calc/wall-editor.html`](../../public/calc/wall-editor.html) — integrated:
  - Old `.we-aside` tabs + renderLibrary/renderProperties/4 sub-renderers **replaced** with `renderCtxPanel()` calling `EditorPanels.render`.
  - Floating ctx menu host `#ctx-host` added inside `<main.we-stage>`.
  - `buildCtxFromState()` maps tool/selection → ctx object.
  - Handlers: `onCtxField / onCtxAction / onCtxLibPick`.
  - Shims: `renderProperties()` and `renderLibrary()` → route to `renderCtxPanel()`.

**Do not** edit the `.ep-*` CSS or the `EditorPanels` renderer unless fixing a bug — they're the shared base.

## Your scope (Codex)

Fill in the logic side of the wiring. Right now the panel **renders correctly** and **field edits for existing selections work**, but several actions and context flows are stubs. Finish them.

### 1. Context actions (`onCtxAction` in `wall-editor.html`) — all currently toast stubs

Implement these actions against the existing `state` model (`state.walls`, `state.columns`, `state.openings`, `state.fixtures`):

- `duplicate` — clone selected element(s) with offset +0.5 m, new id, select the copies
- `lock-toggle` — add/remove `.locked = true` on selected items; locked items are non-hittable in `pickAt` (add a guard there)
- `visibility-toggle` — add/remove `.hidden = true`; hidden items skipped in `render*` functions
- `flip` — wall: swap `start` ↔ `end`. Door/window: toggle `swing` inner↔outer. Jet fan: add 180° to rotation
- `rotate` — column/jetfan/exhaust: rotation = (rotation + 90) % 360
- `reverse` — wall: swap start/end only (no swing change)
- `split` — wall: find midpoint, create two walls, remove original (redistribute openings by offset)
- `align`, `align-left`, `align-right`, `distribute-h`, `group` — multi-selection only; operate on selection bbox
- `floor:new-upper` / `floor:new-lower` — out of scope for 027 (placeholder, keep the toast). Task 030 will handle multi-floor.

Every action must call `snapshot()` before mutating, `render()` + `renderCtxPanel()` + `autosave()` after.

### 2. Selection → context menu positioning

The anchor computation in `renderCtxMenu()` is a best-effort first cut. Verify it's correct for:
- Walls at all orientations (not just horizontal)
- Doors/windows placed on vertical and diagonal walls
- Off-screen elements — clamp ctx menu to stage bounds so it never floats outside
- Zoomed-out state — ctx menu should remain same pixel size regardless of zoom (it already does, since positioning is pixel-space; just verify)

### 3. Tool defaults (`ui.toolDefaults`)

Right now tool panel fields (Wall drawing mode, door type, fan diameter, etc.) update `ui.toolDefaults[tool][key]` but **nothing uses them yet**. Wire:
- `commitWallSegment` — pass `thickness`, `height`, `type`, `material` from `ui.toolDefaults.wall`
- `placeOpeningOnWall` — pass `type`, `w`, `h`, `sill`, `swing`, `fireRating`, `frame` from `ui.toolDefaults[door|window]`
- `placeColumn` — pass `shape`, `w`, `depth`, `h`, `material` from `ui.toolDefaults.column`
- `placeFixture` — pass `shape`, `dia`/`w`/`h`, `thrust`, `flow`, `kw`, `zh`, `rot`, `reversible` from `ui.toolDefaults[jetfan|exhaust]`

Persist `ui.toolDefaults` in the same localStorage blob as `autosave()` so the editor reopens with the last-used settings.

### 4. Library → tool default sync

When user clicks a library card (`onCtxLibPick`), the current code only stores `ui.selectedLib[libKey] = key`. It should **also** copy that library item's spec into `ui.toolDefaults[tool]` so the form reflects what was picked. Example: picking "JFR-D500" should set `fanDia=600, fanThrust=100, fanFlow=4500` in tool defaults.

### 5. Keyboard shortcuts

Already wired: V/W/R/C/D/F/J/E/H/?, Ctrl+Z/Y, Del, Esc. Add:
- `Ctrl+D` → `onCtxAction('duplicate')` when selection non-empty
- `L` → lock-toggle
- `Tab` → cycle through elements in selection (when multi)
- `G` → group
- Arrow keys when selection non-empty → nudge position by 0.05 m (Shift = 0.5 m)

### 6. Topbar ↔ ctx panel cross-sync

Editing `#inp-name`, `#inp-floor-h`, `#inp-ceiling-h`, `#inp-grid` in the topbar should update `state` **and** re-render the ctx panel (so the Floor panel stays in sync). Use a single function `updateFloorMeta(key, value)` that's called from both sides.

### 7. Validation boundaries

- Prevent negative / NaN values in numeric fields (clamp, don't error)
- Thickness `<50 mm` → warn (show `.ep-warn` inline)
- Wall type='fire' → force material to fire-rated (concrete/block)
- Door fireRating ≠ 'none' + parent wall type ≠ 'fire' → warn ("სახანძრო კარი ჩვეულებრივ კედელში")

### 8. Unit test (manual checklist)

- [ ] Open `/calc/wall-editor` — Floor panel shows with current floor name, grid step, ceiling height
- [ ] Click Wall tool — panel switches to "კედლის ხატვა" with line/rect/arc seg, thickness/height, library below
- [ ] Draw a wall, click it — panel switches to "კედელი" with thickness, height, material; floating ctx menu appears above midpoint with Flip/Lock/Eye/Delete
- [ ] Change thickness 120→200 — wall visually updates; autosave key `eng_wall_editor_v1` updates
- [ ] Place door on wall, select it, click Flip — swing inverts, ctx menu repositions
- [ ] Ctrl+Z → thickness reverts; Ctrl+Y → redo
- [ ] Reload page → last state restored incl. `ui.toolDefaults`
- [ ] Resize window to 800 px wide → right panel hides (responsive)
- [ ] Dark mode toggle in `_theme-sync.js` → panel colors flip correctly

### 9. Integration test with stair-pressurization ✅ DONE (Claude 2026-04-19)

Ported via sub-agent: 558-line delta in [`public/calc/stair-pressurization.html`](../../public/calc/stair-pressurization.html). Registered `tool:stair-params`, `sel:stair-fan`, `sel:stair-damper`, `sel:door-level`. Right-side `.ep-panel` sits beside existing info aside (≥1100px screens), ProjectBridge wired with `eng_stair_press_v1` legacy key. Topbar gets project badge + Save as / Rename / Gate. **Portability proof: ✅ the base file `_editor-ui.css` + `_editor-panels.js` + `_project-bridge.js` work unmodified in a second editor.**

## Files to touch

Primary (expected changes):
- [`public/calc/wall-editor.html`](../../public/calc/wall-editor.html) — implement action bodies, tool-defaults plumbing, validation, keyboard shortcuts
- [`public/calc/stair-pressurization.html`](../../public/calc/stair-pressurization.html) — port panel (step 9)

Do **not** modify (Claude's territory):
- [`public/calc/_editor-ui.css`](../../public/calc/_editor-ui.css) — design tokens; open a PR request if you need additions
- [`public/calc/_editor-panels.js`](../../public/calc/_editor-panels.js) — add custom contexts via `registerType`, don't edit core

## Acceptance

1. All 8 checklist items pass manually in browser (Chrome + Safari).
2. No console errors, no red network requests.
3. `ui.toolDefaults` persists across page reloads.
4. All toast stubs (`ოპერაცია: X — Codex#027`) removed — they must be implemented.
5. stair-pressurization uses EditorPanels for its right panel (proof of portability).

## Out of scope (later tasks)

- PIP 2D↔3D window (Task 028)
- Multi-floor switcher (Task 030)
- Fire-safety simulation overlays (Task 026 Phase D)
- 3D toggle for wall-editor (Task 029)

---

**Hand-off note from Claude:** The renderer is a pure function of `(ctx, handlers)` — all state stays in the host page. If Codex needs a new field type, add it to `_editor-panels.js`'s `build.*` export and note it in Task 026 spec. Keep the `.ep-*` namespace sacred — future ports depend on it.
