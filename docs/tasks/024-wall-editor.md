# Task 024 — Wall Editor + Component Library (1-Floor Plan Designer)

**Delegated to:** Claude (MVP shell + library catalog) + Codex (physics + advanced snap + full library)
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2.5
**Depends on:** 007 (physics engine)
**Blocks:** 014 (composer can use wall-editor as input source)
**Slug:** `/calc/wall-editor`
**File:** `public/calc/wall-editor.html`

## მიზანი

1-სართულიანი გეგმის ნახაზის სრული ხელსაწყო — coohom-style 2D floor planner, მაგრამ ყურადღება ვენტილაციის/სახანძრო ელემენტებზე.

**ფუნქციონალი:**
- კედლების დახაზვა vertex-by-vertex + rectangle room tool
- ფანჯრები, კარები (ერთფრთიანი + ორფრთიანი) library-იდან placement
- კოლონები (კვადრ. + მრგვალი)
- გამწოვი ვენტილატორები + parking jet fan (round + rectangular)
- iatakis + გადახურვის სიმაღლე configurable
- მასშტაბი (meters per unit)
- Snap: grid, vertex, angle, parallel, perpendicular
- Physics-ready export — Building schema (Phase 2 integration)
- Real-time simulation overlay (airflow, CO, smoke) — integrated with Task 007 physics engine

## State model

```ts
interface WallEditorState {
  version: 1;
  meta: { name: string; createdAt: ISO; updatedAt: ISO };
  scale: {
    metersPerUnit: number;      // 1 = 1m per SVG unit
    gridStep_m: number;          // e.g. 0.25, 0.5, 1.0
  };
  floor: {
    height_m: number;            // floor-to-ceiling (structural)
    slab_thickness_m: number;    // default 0.2
    ceiling_height_m: number;    // clear ceiling (under beams), can differ
    material?: 'concrete' | 'wood' | 'steel';
  };
  walls: Array<{
    id: string;
    start: [number, number];     // meters, world coords
    end: [number, number];
    thickness_m: number;         // 0.10 / 0.15 / 0.20 / 0.30 typical
    height_m?: number;           // defaults to floor.height_m
    material: 'concrete' | 'brick' | 'drywall' | 'glass';
  }>;
  columns: Array<{
    id: string;
    position: [number, number];
    shape: 'square' | 'round';
    size_m: number;              // side or diameter
    rotation_deg: number;        // for square
    height_m?: number;
  }>;
  openings: Array<{              // doors + windows
    id: string;
    wallId: string;              // must belong to a wall
    offset_m: number;            // distance along wall from start
    type: 'door' | 'window';
    subtype: 'single' | 'double' | 'sliding' | 'fixed';
    width_m: number;
    height_m: number;
    sillHeight_m?: number;       // for window
    swingDirection?: 'in' | 'out' | 'slide';
    swingSide?: 'left' | 'right';
  }>;
  fixtures: Array<{              // fans / vents / equipment
    id: string;
    position: [number, number];
    rotation_deg: number;
    type: 'exhaust-vent' | 'supply-vent' | 'jet-fan-round' | 'jet-fan-rect' | 'smoke-fan' | 'ahu';
    model: string;               // from library (e.g. 'JFR-400')
    params: Record<string, number>;  // thrust_N, flow_m3s, power_W, etc.
  }>;
  rooms: Array<{                 // auto-detected or named
    id: string;
    polygon: Array<[number, number]>;
    name?: string;
    type?: 'office' | 'hallway' | 'stairwell' | 'elevator-lobby' | 'parking' | 'storage';
    area_m2: number;
    volume_m3: number;
  }>;
  dimensions: Array<{
    id: string;
    from: [number, number];
    to: [number, number];
    offset_m: number;
    label?: string;
  }>;
  simulation?: {                 // optional overlay
    active: boolean;
    scenario: 'airflow' | 'co-accumulation' | 'smoke-spread' | 'fire-evac';
    time_s: number;
    play: boolean;
  };
}
```

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Topbar: Name · Scale · Floor H · Ceiling H · Grid · ⬇JSON ⬆JSON │
├──────┬──────────────────────────────────────────────┬────────────┤
│      │                                              │             │
│ Tool │                                              │ Library     │
│ bar  │                                              │             │
│ (V)  │        SVG Canvas                            │ - Walls     │
│ (W)  │        (pan+zoom, grid)                      │ - Doors     │
│ (R)  │                                              │ - Windows   │
│ (C)  │                                              │ - Columns   │
│ (D)  │                                              │ - Fixtures  │
│ (F)  │                                              │             │
│ (J)  │                                              │ Properties  │
│ (M)  │                                              │ (selected)  │
│      │                                              │             │
├──────┴──────────────────────────────────────────────┴────────────┤
│ Status: coords(X,Y) · scale · selection · snap info              │
└─────────────────────────────────────────────────────────────────┘
```

## Tool list (left sidebar, vertical icons)

| Key | Tool | Action |
|-----|------|--------|
| V | Select | Click to select, shift-click to add, drag to move |
| W | Wall | Click points, click → close OR Esc → open |
| R | Room | Drag rectangle → 4 walls forming closed room |
| C | Column | Click to place (square by default, Shift → round) |
| D | Door single | Click on wall → place 900×2100 single-leaf |
| Shift+D | Door double | 1200×2100 double-leaf |
| F | Window | Click on wall → place 1200×1400 sill 900 |
| E | Exhaust vent | Click → place 400×400 ceiling vent |
| J | Jet fan rect | Click → place JFR-400 (rectangular) |
| Shift+J | Jet fan round | Click → place JFR-D315 (round) |
| M | Measure | Click two points → dimension line |
| Del | Delete | Remove selection |
| Z | Undo | Ctrl+Z also |
| Y | Redo | Ctrl+Y also |
| Space+drag | Pan | Temporary hand tool |
| Wheel | Zoom | Center on cursor |
| G | Grid toggle | Snap on/off |
| Esc | Cancel | Exits current tool back to Select |

## Component Library (built-in catalog)

### Walls
- 100mm (drywall partition)
- 150mm (drywall + insulation)
- 200mm (concrete/brick)
- 300mm (external concrete)
- custom (input thickness)

### Doors
- **Single-leaf:** 700 / 800 / 900 / 1000 / 1100 mm × 2100 mm
- **Double-leaf:** 1200 / 1400 / 1600 / 1800 mm × 2100 mm (split 50/50 or 70/30)
- **Sliding:** 900 / 1200 / 1800 / 2400 mm × 2100 mm
- **Fire-rated:** EI30 / EI60 / EI90 / EI120 tags

### Windows
- Single: 600 / 900 / 1200 / 1500 × 1400 mm, sill 900
- Double: 1800 / 2400 × 1400 mm
- French / panoramic: 2400 × 2400 floor-sill
- Fixed / operable / tilt-turn

### Columns
- **Square:** 300 / 400 / 500 / 600 / 800 mm side
- **Round:** Ø300 / Ø400 / Ø500 / Ø600 mm
- **Rectangular:** 300×600, 400×800 mm
- Height default = floor.ceiling_height_m

### Fixtures — Ventilation
- **Exhaust vents (ceiling):** 300×300, 400×400, 600×600, Ø315, Ø400
- **Supply vents:** same sizes, blue-coded
- **Jet fan rectangular** (parking):
  - JFR-315 (thrust 50 N, Ø315)
  - JFR-400 (thrust 80 N)
  - JFR-500 (thrust 125 N)
  - JFR-560 (thrust 160 N)
  - JFR-630 (thrust 200 N)
  - JFR-800 (thrust 400 N)
- **Jet fan round** (smoke extract):
  - JFR-D315 (thrust 30 N)
  - JFR-D400 (thrust 60 N)
  - JFR-D500 (thrust 100 N)
- **Smoke exhaust fans** (roof):
  - SEF-5k (5000 m³/h, 400°C/2h)
  - SEF-10k (10000, 400°C/2h)
  - SEF-20k (20000, 600°C/1h)
- **AHU** (air handling unit):
  - AHU-S (small, 2000 m³/h)
  - AHU-M (medium, 8000 m³/h)
  - AHU-L (large, 20000 m³/h)

### Fire-safety
- Smoke detector (ceiling, dot)
- Sprinkler head (pendant / upright)
- Fire extinguisher
- Emergency exit sign

## Snap Logic

Order of precedence (1 wins):
1. **Vertex endpoint** (wall start/end): within 0.08m screen-equivalent
2. **Midpoint** of wall: within 0.05m, dashed mark
3. **Intersection** of extended wall lines: within 0.08m
4. **Grid point**: whichever grid step is active
5. **Angle** from last vertex: 0° / 15° / 30° / 45° / 60° / 75° / 90° — ±1° threshold
6. **Parallel** to existing wall: highlighted guide line
7. **Perpendicular** to existing wall: highlighted guide line

Visual feedback:
- Snap indicator: small circle / cross at snap point
- Angle label: "45° · 3.20m"
- Parallel guide: pink dashed line through reference wall

## Grid

- Major gridlines: every 1m (default)
- Minor gridlines: every 0.25m
- Toggle visibility via G key
- Ruler on top/left edges of canvas (metric marks)

## Scale & Zoom

- Default: 1 SVG unit = 1 m
- Zoom range: 10× (showing 10cm per unit) to 0.05× (20m per screen)
- Zoom centered on cursor position
- Pan: middle-mouse drag OR Space+left-drag
- Status bar: current zoom percentage + cursor coords (x, y) in meters

## Physics Integration (simulation mode)

When user toggles "simulation mode":

1. **Airflow** (for ventilation scenarios)
   - Particles spawn at supply vents, disappear at exhaust
   - Flow direction visible as arrow + speed (from Task 007 engine)
   - Jet fans show thrust cone with velocity decay
   - Real Δp computation for rooms (Q = A × v through openings)

2. **CO accumulation** (parking)
   - Heatmap overlay: green (< 9 ppm) → yellow (< 25) → red (> 35)
   - Time-lapse slider (0 → 60 min)
   - Reads car count from room metadata if `type: 'parking'`
   - Uses `coConcentration()` from engine

3. **Smoke spread** (fire scenario)
   - User places "fire source" (new tool F+Shift)
   - Smoke layer height visualized as alpha overlay (descending from ceiling)
   - Uses `plumeMassFlow`, `smokeLayerHeight`
   - Exhaust fans reduce smoke accumulation
   - Time-lapse 0-600s

4. **Fire evacuation** (stair / corridor)
   - Path-finding from rooms to exits
   - Door states (open/closed) affect flow
   - Flow rate per door from `leakageFlow` + class velocity

All scenarios use Task 007 `_physics-engine.js`. No duplicate math.

## Acceptance Criteria

### MVP (Claude delivers)

- [x] Page live at `/calc/wall-editor`
- [x] Canvas with grid + pan + zoom
- [x] Tools: Select, Wall, Column, Door, Window, JetFanRect
- [x] Click-to-draw walls with vertex chaining
- [x] Grid snap + vertex endpoint snap
- [x] Library panel with ≥3 items per category
- [x] Properties panel for selected element
- [x] Floor height + ceiling height + scale in topbar
- [x] Delete selection (Del key)
- [x] Undo/Redo (last 50 steps)
- [x] Export JSON (download)
- [x] Import JSON
- [x] Keyboard shortcuts working
- [x] Light/dark theme
- [x] Georgian UI

### Full (Codex extends)

- [ ] Full library (all doors/windows/columns/fans above)
- [ ] Advanced snap (angle 15/45°, parallel, perpendicular, intersection)
- [ ] Room auto-detection from closed polygons
- [ ] Area + volume computed per room
- [ ] Dimension tool with live measurements
- [ ] Physics simulation integration:
  - [ ] Airflow visualization (particles + arrows)
  - [ ] CO heatmap for parking
  - [ ] Smoke spread for fire scenario
- [ ] Time-lapse slider for sim scenarios
- [ ] Multi-select + group operations
- [ ] Copy/paste + duplicate
- [ ] PDF export with dimensions + legend
- [ ] Connection to Phase 2 Building Composer (extrude walls, add modules on top)

## Rendering details

**SVG layers** (z-order bottom → top):
1. Grid
2. Rulers
3. Rooms (filled polygons with light tint by type)
4. Walls (thick lines with thickness → polygons)
5. Columns (filled shapes)
6. Openings (cutouts in walls + swing arcs)
7. Fixtures (fans, vents icons)
8. Dimensions
9. Simulation overlay (particles, heatmap)
10. Selection highlights
11. Cursor preview (drawing in progress)
12. Snap indicators

## State persistence

- Autosave to localStorage every 2s (debounced)
- Key: `eng_wall_editor_state_v1`
- Restore on page load
- Undo history NOT persisted (session-only)

## Open Questions (answered by Claude)

- [ ] Multi-floor support? → **No, strictly single-floor**. Multi-floor = composer (Phase 2).
- [ ] Auto-dimension every wall? → **No**, user adds dimensions explicitly via M tool. Avoids clutter.
- [ ] Real-time sim OR on-demand? → **On-demand** (toggle). Real-time would kill perf on complex plans.
- [ ] Touch support? → **Phase 2**, start with mouse/keyboard only.

## Notes for Codex

- Use existing `_base.css` tokens
- Use existing patterns from stair/elevator simulators
- Theme sync via `_theme-sync.js`
- Physics engine import from `_physics-engine.js`
- Same resize pattern (splitter between library and canvas)
- Same "no overlay" rule (§13.2)

---

**Status:** MVP shell pending Claude · full implementation pending Codex

**Verification (Claude must perform after MVP):**
1. Open `/calc/wall-editor` in browser
2. Draw 4 walls forming a room
3. Add door, window, column, fan
4. Export JSON — verify structure matches schema above
5. Import same JSON — state restored
6. Light/dark toggle works
7. Undo/redo works through 10 steps
