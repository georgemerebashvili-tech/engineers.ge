# Task 026 — Coohom-Parity Editor + Fire Safety Mode

**Delegated to:** Claude (UX / structure) + Codex (state mgmt / physics / 3D)
**Created:** 2026-04-18
**Spec:** [`specs/coohom-parity-spec.md`](../specs/coohom-parity-spec.md)
**Builds on:** Task 024 (wall-editor MVP)
**Depends on:** 007 (physics engine) for fire mode

## ამ task-ის მიზანი

100%-თან მიახლოებული Coohom-style 2D/3D home planner + ჩვენი გამოყოფილი fire-safety სიმულაციის mode (jet fans, smoke, pressurization, evac paths).

## Scope — 5 ფაზა

### Phase B — UX parity (10–14 დღე)
- [x] **Right context panel** refactor: Floor / Wall / Door / Window / Room / Fixture per selection · Claude+Codex 2026-04-20
- [x] **PIP window** — draggable small alt-view (2D ↔ 3D sketch) · Claude 2026-04-18
- [x] **Selection context menu** — floating toolbar + full actions (duplicate/lock/hide/rotate/flip/reverse/split/align/distribute) · Claude 2026-04-18 + 2026-04-19
- [x] **Arc wall** tool — 3-point curve drawing (start / end / apex) · Claude 2026-04-18
- [x] **Room auto-detect** — planar graph face extraction → "Unnamed N" + area label · Claude 2026-04-18
- [x] **Multi-floor** — New upper / New lower buttons, floor switcher · Claude 2026-04-18
- [x] **3D view toggle** — Three.js scene extruded from 2D data · Claude 2026-04-18
- [x] **Dimensions auto-all** toggle — Floor panel → "ზომები" · Claude 2026-04-18
- [x] **Bottom bar** proper — floor / view / zoom controls · Claude 2026-04-18

### Phase C — Library expansion (5–7 დღე)
- [x] Door subtypes (single / double / unequal / sliding / frame) — 12 items · Claude 2026-04-18
- [x] Window subtypes (casement / tilt-turn / sliding / bay / corner / panoramic) — 10 items · Claude 2026-04-18
- [x] Structural (beam 2 / stair 3 / slab void) — 6 items · Claude 2026-04-18
- [x] Material library (wall 4 / floor 4 / ceiling 3) · Claude 2026-04-18
- [x] Basic furniture (10 essentials + placement tool M + 2D+3D render + ctx panel) · Claude 2026-04-18

### Phase D — 🔥 Fire safety mode (7–10 დღე)
- [x] **🔥 Fire tool** in left toolbar (X shortcut) · Claude 2026-04-18
- [x] Scenario selector (stair / corridor / elevator / parking / evac) · Claude 2026-04-18
- [x] Standard integration shell (EN 12101-6 / NFPA 92 / СП 7.13130) · Claude 2026-04-18
- [x] Fire source placement (HRR kW, growth t², presets) · Claude 2026-04-18
- [x] Physics engine wiring (Task 007) → Codex Task 028 · shipped 2026-04-19
- [x] Simulation overlays (smoke plume + CO rings + fire core) · Claude 2026-04-18 MVP + Task 028 wiring 2026-04-19
  - Airflow particles ✓ (Task 028)
  - Smoke layer descent (2D schematic) ✓
  - CO heatmap (3 concentric rings) ✓ + cell grid refine ✓ (Task 028)
  - Pressure isolines ✓ (Task 028)
  - Evac paths — straight-line with smoke-aware walking speed (A* skipped) ✓ (Task 028)
  - Door force gauges ✓ (Task 028)
- [x] Time-lapse (0→600s, play/pause/reset, 1×/5×/10×) · Claude 2026-04-18
- [x] Compliance PDF report → Codex Task 028 · shipped 2026-04-20

### Phase E — CAD / Cloud
- Covered by Tasks 018–023 (DXF, AI walls, Supabase)

## UI structure (post-B)

```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: File|Save|Undo|Redo|Clear|Toolkit|Gallery|Simulate │
├──┬──────────────────────────────────────────────────────┬──┤
│  │                                              [PIP]    │  │
│M │                                              2D|3D    │  │
│o │                                              ────     │  │
│d │        Main Canvas (2D SVG ↔ 3D Three.js)            │C │
│e │                                                      │ტ │
│  │                                                      │ექ│
│i │                                                      │ს │
│c │                                                      │ტ │
│o │                                                      │  │
│n │  [Selection context menu floating when sel]          │p │
│  │                                                      │a │
│  │                                                      │n │
├──┴──────────────────────────────────────────────────────┴──┤
│ BottomBar: 1F ▾ 2D 3D 👁 Layers │ ... │ -  74%  +         │
└─────────────────────────────────────────────────────────────┘
```

## Acceptance — Phase B priority order

1. **Context panel** (right side)
2. **Selection menu** (floating on selection)
3. **Arc wall**
4. **PIP window**
5. **Multi-floor**
6. **3D toggle** (biggest lift, last)

## 🔥 Fire-safety mode specifics (Phase D)

Rendering pipeline:
```
plan state (walls/rooms/fixtures)
    → physics engine (Task 007)
    → simulation grid (cell-based 1m² for heatmap)
    → SVG overlay (particles, isolines, heatmap)
    → time-lapse controls
```

### Fire source
- New tool "Fire" in mode (or via toolbar)
- Click to place
- HRR parameter (kW): 1000 (trash can) / 5000 (car) / 20000 (truck) / custom
- Growth pattern: t² (slow/medium/fast/ultra-fast)

### Physics integration
- `plumeMassFlow()` — from engine
- `smokeLayerHeight()` — overlay alpha gradient from ceiling down
- `coConcentration()` — per-room concentration → heatmap
- `doorOpeningForce()` — per door, color-coded gauge
- `requiredSupplyFlow()` — fan sizing recommendation

### Time-lapse
- Slider 0 → 600s
- 1× / 5× / 10× speed
- Play / pause / reset

### Evac paths
- Auto-detect exits (doors to outside or stair)
- A* pathfinding per room
- Arrow overlays
- Travel time estimate

### Compliance report
- PDF export
- Per-room status: pass/fail
- Δp achieved vs required
- Door forces vs class max
- Smoke layer clearance height
- Active formulas + references

## Missing info (📷 needed — see spec §N for full list)

Top 10 priority screenshots:
1. File / Save / Clear menu dropdowns
2. Toolkit menu
3. Gallery menu  
4. Left column full icons (lighting, printing, schedules, etc.)
5. Window / Opening dropdown subtypes
6. Context menu hover tooltips
7. 2D mode Edit/Split area tools
8. Door selected → right panel fields
9. Room selected → right panel fields
10. Bottom-right icon row tooltips

## Labor split

**Claude:**
- All UI components (React / SVG / Three.js scenes)
- Component structure + state integration
- Visual design per DESIGN_RULES
- Spec updates as new screenshots arrive

**Codex:**
- Physics wiring (Task 007 integration)
- 3D extrude logic (2D→3D meshes)
- Time-lapse state machine
- PDF report generation
- DXF import (Task 018)
- Supabase sync (Task 022)
- Performance optimization (grid cell count, particle LOD)

## Integration with other tasks

- **Task 007** blocks Phase D physics
- **Task 013** module schema = save format
- **Task 014** composer = extends to multi-building
- **Task 018–021** DXF + AI
- **Task 022** Supabase save
- **Task 025** project gate pattern — already done ✅

## Timeline estimate

| Phase | Duration | Team |
|-------|----------|------|
| B — UX parity | 10–14d | Claude+Codex |
| C — Library | 5–7d | Claude+Codex |
| D — Fire safety | 7–10d | Codex (physics) + Claude (overlay) |
| **Total** | **~28 დღე** | პარალელურ |

## Closeout

Phases B, C, D shipped — all Claude MVP items + Task 028 physics wiring + compliance report delivered. Phase E (CAD/Cloud) remains gated on Tasks 022/023 (Supabase provision).

**Remaining follow-up:**
- Manual browser QA pass on `/calc/wall-editor` (all Phase B tools, Phase C library insert, Phase D fire-mode time-lapse + PDF export)
- Spec screenshot audit (see `docs/TODO.md` line 62 — 20 screenshot items still to capture from Coohom reference)

---

**Status:** ✅ closed 2026-04-21 · code ships · docs synced · manual QA + screenshot audit tracked separately in `docs/TODO.md`
