# Wall Editor — Component Specification (v1)

**Parent task:** [`tasks/024-wall-editor.md`](../tasks/024-wall-editor.md)
**Delivered file:** [`public/calc/wall-editor.html`](../../public/calc/wall-editor.html)
**Updated:** 2026-04-18

ამ დოკუმენტში ჩამოწერილია **ყოველი კომპონენტი**: რა პარამეტრებია, რა operation-ები აქვს, snap ქცევა, physics atributes.

---

## 1. Wall — კედელი

### პარამეტრები (state fields)

| ფილდი | ტიპი | ერთ. | დიაპაზონი | default | აღწერა |
|-------|------|------|-----------|---------|--------|
| `id` | uuid | — | — | auto | უნიკალური ID |
| `start` | `[x, y]` | m | — | — | საწყისი წერტილი |
| `end` | `[x, y]` | m | — | — | ბოლო წერტილი |
| `thickness` | number | m | 0.05–0.60 | 0.20 | კედლის სისქე |
| `height` | number | m | 2.0–8.0 | `floor.height` | კედლის სიმაღლე (iatakidan chermade) |
| `material` | enum | — | concrete / brick / drywall / glass / timber | concrete | მასალა |
| `color` | hex | — | — | auto per material | ფერი (material default override) |
| `label` | string | — | — | "" | ტექსტური ნიშანი (optional) |
| `structural` | bool | — | — | true | დატვირთვის მტვირთავი თუ partition |
| `u_value_W_m2K` | number | W/m²K | 0.1–5 | material default | თბოგადამცემი (physics) |
| `leakage_m2_per_m` | number | m²/m | 0.0001–0.01 | 0.001 | ჰაერის გაჟონვის ფართობი (pressurization) |
| `fire_rating` | enum | — | EI0 / EI30 / EI60 / EI90 / EI120 / EI240 | EI0 | სახანძრო რეიტინგი |
| `locked` | bool | — | — | false | ჩაბლოკილი ცვლილებისგან |

### Operations

| მოქმედება | როგორ | ქმედება |
|-----------|--------|---------|
| **Draw** | W tool → click vertices | new wall segment per click; Enter/Esc=finish |
| **Select** | V tool → click | highlight + show properties |
| **Move endpoint** | V tool → drag vertex handle | updates `start` or `end` |
| **Move whole** | V tool → drag midpoint | translate both endpoints |
| **Split at point** | right-click wall → "Split" | inserts vertex, creates 2 walls |
| **Merge** | auto on draw when endpoints snap | combines co-linear walls |
| **Rotate** | select → "R" in props → angle input | rotate around midpoint |
| **Resize (thickness)** | properties panel | live re-render |
| **Change height** | properties panel | per-wall override |
| **Change material** | dropdown | auto-updates U-value, color, leakage |
| **Duplicate** | Ctrl+D | offset 0.5m |
| **Mirror** | right-click → Mirror X / Mirror Y | reflects endpoints |
| **Delete** | Del key / right-click → Delete | removes wall + linked openings |
| **Lock/Unlock** | right-click → Lock | prevents accidental edit |

### Snap (drawing)

| ფაქტორი | threshold | ქცევა |
|---------|-----------|-------|
| Vertex endpoint | 0.08 m screen | mag to existing vertex |
| Midpoint | 0.05 m | dashed marker |
| Grid point | grid step | aligned to grid |
| Angle from prev vertex | ±1° | 0° / 15° / 30° / 45° / 60° / 75° / 90° |
| Parallel to existing | ±1° | pink guide line |
| Perpendicular to existing | ±1° | pink guide line |
| Wall intersection | 0.08 m | exact crossing point |

### Physics attributes

- **Leakage (closed):** `Q = 0.827 × A × √Δp` where `A = leakage_m2_per_m × wall_length`
- **Heat transfer:** `Q = U × A × ΔT`
- **Sound:** STC (future, based on material + thickness table)
- **Fire:** blocks fire spread for rating duration

### Validation

- სიგრძე > 0.05 m (under → auto-removed)
- Thickness < 0.05 m denied
- Cannot overlap another wall (warning, user confirms)
- Openings outside wall range auto-clamped

---

## 2. Column — კოლონა

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default | აღწერა |
|-------|------|------|---------|--------|
| `position` | `[x, y]` | m | — | ცენტრი |
| `shape` | enum | — | square | square / round / rectangular |
| `size` | number | m | 0.40 | square side / round diameter |
| `dimensions` | `[w, d]` | m | — | for rectangular shape only |
| `rotation` | number | ° | 0 | for square/rectangular |
| `height` | number | m | `floor.ceiling_height` | — |
| `material` | enum | — | concrete | concrete / steel / composite |
| `structural` | bool | — | true | load-bearing |
| `number` | string | — | "" | კოლონის ნომერი (C-1, C-2) |

### Operations

| მოქმედება | ქმედება |
|-----------|---------|
| Place | C tool → click |
| Move | V → drag |
| Rotate | +15° (Shift+R), −15° (Ctrl+R) |
| Resize | properties size input |
| Change shape | square ↔ round ↔ rectangular |
| Duplicate | Ctrl+D |
| Array | Shift+A → grid of columns (n × m spacing) |
| Delete | Del |

### Snap

- Grid
- Wall intersection (edge snap)
- Other column (align horizontal / vertical)
- Room center

### Physics

- N/A for airflow (blocks area subtraction in sim)
- Casts shadow in 3D
- Fire resistance based on material

---

## 3. Door — კარი

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default | დიაპაზონი |
|-------|------|------|---------|-----------|
| `wallId` | uuid FK | — | — | must belong to wall |
| `offset` | number | m | auto-centered | 0 – `wall_length` |
| `width` | number | m | 0.90 | 0.70–2.40 |
| `height` | number | m | 2.10 | 1.90–2.40 |
| `leafs` | int | — | 1 | 1 (single) / 2 (double) |
| `subtype` | enum | — | single | single / double / sliding / revolving / bifold |
| `swing_side` | enum | — | right | left / right |
| `swing_direction` | enum | — | in | in / out / both (swinging) |
| `swing_angle_max` | number | ° | 90 | 0–180 (for animations) |
| `fire_rating` | enum | — | EI0 | EI0 / EI30 / EI60 / EI90 / EI120 |
| `material` | enum | — | wood | wood / metal / glass / composite |
| `glass_panel` | bool | — | false | ინახებს ფანჯრიანი კარი |
| `automatic` | bool | — | false | სენსორიანი |
| `closer_force_N` | number | N | 30 | 10–50 (door closer) |
| `handle_side` | enum | — | opposite-hinge | left/right |
| `leakage_m2` | number | m² | 0.02 | 0.005–0.05 (crack area) |
| `state` | enum | — | closed | closed / open / ajar (for sim) |

### Operations

| მოქმედება | ქმედება |
|-----------|---------|
| Place | D tool → click on wall |
| Move along wall | V → drag (offset change) |
| Move to other wall | drag beyond current wall → finds nearest |
| Swap swing side | Shift+click / menu |
| Flip direction (in↔out) | Ctrl+click |
| Change single↔double | properties `leafs` |
| Resize width | drag edge handle or input |
| Change fire rating | dropdown (visual tag change) |
| Toggle state (sim) | click in sim mode |
| Delete | Del |

### Snap

- Grid along wall
- Midpoint of wall
- Wall endpoints (with margin for door width)
- Other doors (symmetric placement)

### Physics

- **Closed:** `Q = 0.827 × leakage_m2 × √Δp`
- **Open:** `Q = velocity × (width × height)` where velocity = standard v_min
- **Opening force:** `F = closer_force + (W·A·Δp·d) / (2(W-d))` per NFPA 92

---

## 4. Window — ფანჯარა

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default | — |
|-------|------|------|---------|---|
| `wallId` | uuid FK | — | — | |
| `offset` | number | m | — | |
| `width` | number | m | 1.20 | 0.60–3.00 |
| `height` | number | m | 1.40 | 0.40–3.00 |
| `sill_height` | number | m | 0.90 | 0.0–2.0 (distance floor → lower edge) |
| `subtype` | enum | — | fixed | fixed / tilt-turn / sliding / hopper / awning / casement |
| `glazing` | enum | — | double | single / double / triple / vacuum |
| `u_value` | number | W/m²K | 1.4 | 0.5–6.0 |
| `g_value` | number | — | 0.55 | 0.1–0.9 (SHGC) |
| `frame` | enum | — | PVC | PVC / aluminum / wood / steel |
| `openable` | bool | — | false | fixed otherwise |
| `leakage_class` | int | — | 3 | EN 12207 class 1–4 |
| `state` | enum | — | closed | closed / open (for sim) |

### Operations

- Place on wall (F tool)
- Move along wall
- Resize (width + height)
- Change subtype/glazing/frame
- Change sill (vertical position)
- Delete
- Duplicate

### Snap

- Same as Door
- Plus: align with other windows on same wall (rhythm)

---

## 5. Jet Fan — ჯეტ ფანი (parking)

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default |
|-------|------|------|---------|
| `position` | `[x, y]` | m | — |
| `rotation` | number | ° | 0 (thrust direction) |
| `model` | string | — | JFR-400 |
| `shape` | enum | — | rect / round |
| `dimensions` | `[w, d]` | m | per model |
| `diameter` | number | m | per model (round) |
| `height_from_floor` | number | m | `ceiling - 0.3` |
| `thrust_N` | number | N | per model (50–400) |
| `flow_m3h` | number | m³/h | per model |
| `power_W` | number | W | per model |
| `rpm` | number | rpm | 1450 |
| `noise_dBA_3m` | number | dBA | 65–85 |
| `pressure_class` | enum | — | F300 | F200 / F300 / F400 / F600 (EN 12101-3) |
| `duration_min` | int | min | 60 / 120 | at pressure_class |
| `state` | enum | — | off | off / on / fault |
| `controller` | enum | — | co-based | co-based / scheduled / manual |

### Operations

- Place (J tool)
- Rotate 15° (R / Shift+R)
- Move
- Change model (swaps all physical params)
- Toggle on/off (sim)
- Set CO trigger threshold (controller)
- Delete

### Snap

- Grid
- Align with other jet fans (row/column)
- Ceiling mount (auto-position Y relative to slab)

### Physics (parking ventilation)

- **Jet momentum:** J = ρ × Q × v — creates velocity field cone
- **Spread:** ~12° divergence downstream
- **Range:** ~10× diameter (effective push)
- **CO dispersal:** removes CO at `flow` rate from near-source region

### Built-in library models

| Model | Shape | Size (mm) | Thrust | Flow | Power |
|-------|-------|-----------|--------|------|-------|
| JFR-315 | rect | 450×500 | 50 N | 2700 m³/h | 0.55 kW |
| JFR-400 | rect | 500×550 | 80 N | 3600 | 0.75 |
| JFR-500 | rect | 550×600 | 125 N | 4800 | 1.1 |
| JFR-560 | rect | 600×650 | 160 N | 5600 | 1.5 |
| JFR-630 | rect | 650×700 | 200 N | 6800 | 1.85 |
| JFR-D315 | round | Ø400 | 30 N | 2400 | 0.37 |
| JFR-D400 | round | Ø500 | 60 N | 3400 | 0.55 |
| JFR-D500 | round | Ø600 | 100 N | 4500 | 0.85 |
| JFR-D630 | round | Ø750 | 160 N | 6200 | 1.25 |

---

## 6. Exhaust Vent — გამწოვი / Supply Vent — მიმწოდი

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default |
|-------|------|------|---------|
| `position` | `[x, y]` | m | — |
| `subtype` | enum | — | exhaust / supply / transfer |
| `shape` | enum | — | square / round / rectangular |
| `size` | number | m | 0.40 |
| `mounting` | enum | — | ceiling / wall / floor |
| `flow_m3h` | number | m³/h | 300 |
| `connected_duct` | string | — | "" (free-flow / linked) |
| `filter` | enum | — | none | none / G4 / F7 / HEPA |
| `damper` | bool | — | false |
| `fire_damper` | enum | — | none | none / 60 min / 90 min / 120 min |
| `diffuser_type` | enum | — | 4-way | 4-way / swirl / linear / perforated |

### Operations

- Place (E tool)
- Move
- Resize
- Change shape/type
- Link to duct line (future)
- Delete

### Physics

- **Supply:** adds airflow `Q` at position
- **Exhaust:** removes `Q` at position
- Sim uses these as source/sink nodes in airflow

---

## 7. Dimension — ზომა

### პარამეტრები

| ფილდი | ტიპი | ერთ. | default |
|-------|------|------|---------|
| `from` | `[x, y]` | m | — |
| `to` | `[x, y]` | m | — |
| `offset` | number | m | 0.5 (distance from line) |
| `label` | string | — | auto (computed distance) |
| `units` | enum | — | metric | metric / imperial |
| `precision` | int | — | 2 (decimals) |
| `style` | enum | — | arch | arch / engineering / extended |

### Operations

- Draw (M tool → 2 clicks)
- Move offset (drag perpendicular)
- Edit label (override auto)
- Delete
- Auto-all-walls (batch annotate)

---

## 8. Room — ოთახი (auto-detected)

### პარამეტრები

| ფილდი | ტიპი | — |
|-------|------|---|
| `polygon` | `[[x,y]...]` | auto |
| `name` | string | user-set |
| `number` | string | auto (101, 102, ...) |
| `type` | enum | office / hallway / stairwell / elevator-lobby / parking / storage / bathroom / kitchen / technical |
| `area_m2` | number | auto |
| `volume_m3` | number | auto |
| `perimeter_m` | number | auto |
| `occupancy` | int | persons (user) |
| `fire_compartment` | string | zone ID |
| `finish_floor` | enum | concrete / tile / carpet / wood |
| `finish_ceiling` | enum | plaster / tile / exposed |
| `acoustic_class` | — | (future) |
| `hvac_zone` | string | associated zone |

### Operations

- Auto-detect on wall-close
- Rename
- Set type
- Add occupancy
- Generate label in center
- Export list (CSV)

---

## 9. Annotation / Label / Note

- Text labels placeable anywhere
- Callout arrows
- Section markers (A-A', B-B')
- North arrow
- Scale bar
- Title block

---

## Global editor capabilities

### Canvas
- Pan (Space+drag / middle / H tool)
- Zoom (wheel, centered on cursor)
- Fit all (F button)
- Zoom to selection
- Grid toggle + custom step (10/25/50cm/1m)
- Ruler on top+left edges
- Axis cross at origin

### Snap system
- Grid, vertex, midpoint, intersection, parallel, perpendicular, angle
- Toggle each individually (F7/F8/F9/...)
- Smart guides (visual feedback during drag)

### Selection
- Single click
- Shift-click add
- Ctrl-click toggle
- Drag rectangle (marquee)
- Alt+drag = deselect rectangle
- Ctrl+A = select all
- Filter by type (toolbar dropdown)

### Transform
- Move (drag / arrow keys 1cm / Shift+arrows 10cm)
- Rotate (R key, 15° steps; Shift for 5°)
- Scale (S key for selection)
- Mirror (Alt+X / Alt+Y)
- Array (Shift+A → dialog)

### History
- Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y)
- 50-step buffer
- Session history (not persisted)

### Persistence
- Autosave localStorage every 1.5s
- Export JSON (schema v1)
- Import JSON (validated)
- Export PDF (future)
- Export DXF (future)

### Simulation overlay (Phase 2)
- Airflow particles
- CO heatmap (parking)
- Smoke spread (fire)
- Pressure isolines
- Evacuation paths

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| W | Wall tool |
| R | Room tool (rectangle) |
| C | Column tool |
| D | Door tool |
| F | Window tool |
| J | Jet fan tool |
| E | Exhaust vent tool |
| M | Dimension tool |
| H / Space-drag | Pan |
| Del / Backspace | Delete selection |
| Esc | Cancel current tool |
| Enter | Finish drawing |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+D | Duplicate |
| Ctrl+A | Select all |
| Ctrl+S | Save (autosave trigger) |
| Ctrl+E | Export JSON |
| Ctrl+O | Import JSON |
| +/− | Zoom in/out |
| 0 | Fit to content |
| 1 | 100% zoom |
| G | Toggle grid |
| L | Toggle layers panel |

---

## Color / Material mapping (defaults)

| Material | Fill | Stroke | U-value |
|----------|------|--------|---------|
| concrete | #7A8FA8 | #1A3A6B | 2.5 |
| brick | #B85D3A | #6B2C1A | 2.0 |
| drywall | #E8ECF2 | #6B82A6 | 1.8 |
| glass | #CFE7F5 (alpha 0.4) | #2D7EB5 | 5.7 |
| timber | #8B6B4A | #4A3520 | 1.5 |
| steel | #6E7785 | #2A2E35 | 50 |

---

## Out-of-scope (v1)

- Furniture library
- Lighting fixtures
- MEP routing (ducts, pipes, cables)
- Structural beams (only columns + walls in v1)
- Terrain / landscape
- Multi-floor (single floor only)
- Curved walls (only straight segments)

Will address in v2.

---

**Consume this spec when:**
- Implementing wall-editor features (Codex)
- Building 3D visualizer (Claude)
- Wiring physics simulation (Codex, per `_physics-engine.js`)
- Designing property panels
- Validating user input
