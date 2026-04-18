# Task 014 — Building Composer Page

**Delegated to:** Claude (UI shell) + Codex (state + 3D wiring)
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2
**Depends on:** 013 (module schema), Phase 1 complete
**Route:** `/calc/building-composer`
**Files:**
- `app/(withSidebar)/calc/building-composer/page.tsx`
- `components/composer/*.tsx`
- `app/(withSidebar)/calc/[slug]/page.tsx`

## მიზანი

ერთი page, სადაც user აწყობს building-ს 4 module type-იდან (stair, elevator, parking, corridor). Real 3D scene, drag-drop library, per-module params editor.

## Decision 014.0 — React vs iframe

**Chosen: React page** (not iframe) — composer is state-heavy, React ecosystem (zustand/context, drag-drop libs) more natural. Three.js via `@react-three/fiber`.

## Dependencies

- `npm i zustand @react-three/fiber @react-three/drei three`
- Uses existing `DashboardSidebar` layout wrapper

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Header: Building name (editable) · Save · Load · Export PDF    │
├─────────────────┬──────────────────────────────┬───────────────┤
│                 │                              │               │
│  📦 Library     │       3D Composer Scene      │  ⚙ Selected   │
│  ─────────      │                              │  module       │
│  Stair          │   [Three.js canvas]          │  params       │
│  Elevator       │                              │  editor       │
│  Parking        │   grid + placed modules      │  (per-type    │
│  Corridor       │                              │   form)       │
│                 │                              │               │
│  Presets:       │                              │  [Open in     │
│  - SFH          │                              │   simulator]  │
│  - Office 15fl  │                              │               │
│                 │                              │               │
├─────────────────┴──────────────────────────────┴───────────────┤
│ Status bar: N modules · last saved · coordinate hover           │
└────────────────────────────────────────────────────────────────┘
```

## Scene

- **Floor grid** — 50×50m, 1m subdivisions, KAYA blue tokens
- **Orbit controls** — like simulator
- **Module placement** — click library card → ghost follows pointer on grid → click to place
- **Selection** — click module → highlights (blue outline + selection gizmo)
- **Transform gizmo** — @react-three/drei TransformControls for move/rotate
- **Light/dark scene** — same tokens as stair sim

## Module library cards

Each card shows:
- Type name + description
- Click-to-place state

## Selected-module editor

- Right panel — form per module type:
  - Stair: floors, floorH, shaftW, shaftD, stairType, ...
  - Elevator: ...
  - Parking: ...
  - Corridor: ...
- Live preview in 3D
- "🔗 გახსენი სიმულატორში" button → opens full simulator with this module's params (via URL: `/calc/stair-pressurization?state=base64json`)

## State (zustand)

```ts
// stores/composer.ts
interface ComposerState {
  building: TBuilding;
  selectedId: string | null;
  addModule: (type, params) => void;
  selectModule: (id: string | null) => void;
  updateModule: (id, patch) => void;
  removeModule: (id) => void;
  save: () => void;              // download JSON
  load: (file: File) => Promise<void>;
  autosave: () => void;          // debounced localStorage
}
```

## Acceptance

- [x] Route live at `/calc/building-composer`
- [x] 4 module types addable via drag-drop or click-to-add
- [x] Selected module shows in right panel with editable form
- [x] Transform gizmo works (move/rotate)
- [x] "Open in simulator" pre-loads state (use query param `?state=`)
- [x] Save downloads JSON (Building schema)
- [x] Load reads JSON + validates via Zod → restores
- [x] Autosave to localStorage every 2s (debounced)
- [x] Status bar live updates
- [x] Light/dark theme
- [x] Mobile degrade: stack panels vertically, touch-friendly

## Visual design (Claude)

- Use DESIGN_RULES tokens
- Library cards — `bg-sur border rounded-8 p-2` · hover: `border-blue`
- Transform gizmo — KAYA blue
- Floor grid — `var(--bdr)` opacity 0.4, main axes blue
- Selection highlight — 2px blue outline + subtle glow

## Open Questions

- [ ] Undo/Redo stack? → **Rec:** add in Phase 3 (nice-to-have Phase 2)
- [ ] Library presets (e.g. "5-floor residential bundle")? → **Rec:** include 3-4

---

**Status:** done (2026-04-18)
