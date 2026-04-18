# Coohom Parity — UI Enumeration + Gap List

**Goal:** 100% Coohom-parity 2D/3D home planner + Phase: fire-safety simulation overlay.
**Based on user screenshots:** 2026-04-18 (4 images)
**Status:** spec-in-progress · awaiting additional screenshots
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2.5 extension

Legend: ✅ = visible in screenshots · 📷 = needs screenshot · ❓ = inferred but not confirmed · 🔥 = our addition (fire safety)

---

## A. Top Bar (fixed, not movable)

### A.1 Brand / Trial
- Logo "COOHOM" ✅
- "Try Pro now" CTA pill ✅
- (ჩვენს საიტზე → "engineers.ge" + "Pro" ან ტრიალი)

### A.2 Center toolbar — horizontal icons + labels

| ღილაკი | ტიპი | ცნობილი დროფდაუნი | სტატუსი |
|--------|------|---------------------|---------|
| **File** ▾ | dropdown | New / Open / Import / Save / Save as / Export / Recent | 📷 ზუსტი ცხრილი არ ჩანს |
| **Save** ▾ | dropdown | Save / Save as / Save copy / Cloud save | 📷 |
| **Undo** | button | — | ✅ |
| **Redo** | button | — | ✅ |
| **Clear** ▾ | dropdown | Clear walls / Clear furniture / Clear all | 📷 |
| **Toolkit** ▾ | dropdown | Dimension / Annotation / Area / Ruler / Layer tools | 📷 სრული ცხრილი |
| **Gallery** ▾ | dropdown | Furniture / Materials / Fixtures / My library | 📷 სრული ცხრილი |

### A.3 Right side
- "Search for help" input field with 🔍 icon ✅
- **Help** ▾ (dropdown: docs / tutorial / contact) 📷
- User avatar + **BASIC** badge (plan tier) ✅

**🔥 ჩვენი:** დავამატოთ "Simulate" ▾ ღილაკი center toolbar-ში — airflow / smoke / CO scenarios.

---

## B. Left narrow icon column (mode selector, fixed)

ვერტიკალური zip column ~48px სიგანე. Tool mode ცვალება.

| ხატი | Mode | სტატუსი |
|------|------|---------|
| 🎨 design/room | Floor plan editor (default) | ✅ active on screenshot |
| 💡 lighting | Lighting editor (place fixtures) | ❓ 📷 |
| 🖨 printing | Print layout mode | ❓ 📷 |
| 📋 schedules/BOM | Door/window/material schedule tables | ❓ 📷 |
| 📷 snapshot | Renders / cameras | ❓ 📷 |
| ⬜ panels | Custom panels / extensions | ❓ 📷 |

**🔥 ჩვენი:** `🚨 fire safety` mode — switches to simulation overlay (airflow, smoke, CO, evacuation paths).

---

## C. Left panel "Floor plan" (docked, collapsible sections, resizable width)

### C.1 Import floor plan
- **Import 2D drawing** card — JPG / PNG / CAD (DXF/DWG) / PDF ✅
- Drag-drop support 📷

### C.2 Draw room

| ღილაკი | Shortcut | ქმედება |
|--------|----------|---------|
| Straight wall | **B** | Wall line (vertex-by-vertex) ✅ |
| Rectangle wall | **F** | Drag rect → 4 walls ✅ |
| Arc wall | **H** | Curved wall (3 points: start/apex/end) ✅ |
| External area | — | Site boundary outline ✅ |

### C.3 Place doors and windows

| ღილაკი | Dropdown subtypes |
|--------|-------------------|
| **Door** ▾ | Single door / Double door / Sliding door / Unequal double door (Customized) / Door frame (Customized) ✅ |
| **Window** ▾ | Standard / Sliding / Hinged / Tilt-turn / Corner / Custom 📷 (confirm) |
| **Bay window** | Curved/trapezoidal bay window ✅ |
| **Opening** ▾ | Archway / Cased opening / Pass-through 📷 |

### C.4 Add structures
- (truncated in screenshot) 📷 — likely: Column / Beam / Stair / Ceiling opening / Chimney

### C.5 More sections (scroll down) 📷
- Floor / wall finishes
- Ceiling elements
- Site landscape

---

## D. Main canvas (central, flex-1)

- 3D orbital view (default active) with transparent walls to see interior ✅
- 2D view (toggleable) with dimensions + room labels + CAD underlay ✅
- Drawing view (floor plan blueprint mode) 📷 — probably CAD-overlay priority
- Grid + snap

**Tools above canvas (contextual, appear when element selected or tool active):**
- 2D mode: **Edit** · **Split area** ✅
- Other modes: unknown 📷

---

## E. PIP (Picture-in-Picture) window — **movable** ✅

Top-right corner. Key properties:
- **Drag handle**: left grip (·· dots) ✅
- Tabs inside: **2D / Floor plan / Drawing** ✅
- Contents: thumbnail of alternate view
- Close / collapse / expand buttons 📷
- Can be resized? 📷
- Can be docked at sides/corners? 📷

**🔥 ჩვენი:** PIP-ში შეიძლება აჩვენოს simulation overlay (airflow heatmap, smoke spread).

---

## F. Right sidebar (context-dependent, fixed docked, resizable)

### F.1 "Floor" panel (when no selection, 3D mode)
- **New upper floor** ✅
- **New lower floor** ✅
- **Current floor** dropdown + rename input ✅
- **Basic**:
  - Interior area (readonly, auto) ✅
  - Room height (mm) ✅
  - Slab thickness (mm) ✅
- **Opacity (Y)** collapsible:
  - Wall slider (0–100%) ✅
  - Floor slider (0–100%) ✅
- **Basemap display (P)** checkbox ✅
- More sections below 📷

### F.2 "Draw wall" panel (wall tool active, 2D mode) ✅
- Tabs: **Regular** / **Custom** ✅
- **Inputs**:
  - Location (Space) dropdown (Center / Left / Right / Offset) ✅
  - Height (mm) ✅
  - Room bounding (Yes/No) ✅
- **Basic**:
  - Type dropdown (Non-structural / Structural / Partition...) 📷 confirm options
  - Thickness (mm) with lock icon ✅

### F.3 "Door" panel (door placed/selected) 📷
Inferred fields:
- Type (Single/Double/Sliding/...)
- Width / Height / Offset from floor
- Swing direction / side
- Fire rating
- Material / handle type / lock

### F.4 "Window" panel 📷
- Type
- Width / Height / Sill / Frame / Glazing
- Opening type

### F.5 Other context panels 📷
- Room selected → Room properties (name, type, function)
- Furniture → item properties
- Fixture → fixture properties

---

## G. Selection context menu (floating, follows selection) ✅

Screenshot 3 shows icons (left→right):
1. Grip / drag handle
2. Cursor / select + rotate ❓
3. Add (+) / duplicate ❓
4. Align / center ❓
5. Flip / mirror
6. Hide (eye-off)
7. Lock
8. Delete (trash)

**📷 საჭიროა ზუსტი labels-ების cross-reference, hover-tooltip screenshot.**

Live dimensions between walls visible (48, 215, 300, 30, 100, 86, 2620, 1620...).

---

## H. Bottom bar

### H.1 Bottom-left (floor + view mode)
- **1F ▾** — floor selector dropdown ✅
- **2D ▾** — view mode (with dropdown options?) ✅
- **3D ▾** — view mode active ✅
- 👁 visibility toggle (hide walls/floor) ✅
- Layers icon (open layers panel?) ✅

### H.2 Bottom-right (viewport controls)
- Camera / snapshot icons 📷 (5-7 icons, unclear which is which)
- Export / render icons 📷
- Zoom controls: **−** / **74%** / **+** ✅
- Zoom to fit 📷

**📷 საჭიროა clear screenshot each icon.**

---

## I. Keyboard shortcuts (partial from screenshots)

| Shortcut | Action |
|----------|--------|
| **B** | Straight wall |
| **F** | Rectangle wall |
| **H** | Arc wall |
| **Y** | Toggle wall opacity |
| **P** | Toggle basemap |
| (others) | 📷 need full list |

---

## J. Likely full feature set (inferred)

### J.1 Layers (like CAD)
- Architectural / furniture / electrical / plumbing / HVAC
- Toggle visibility per layer

### J.2 Rendering
- 3D OrbitControls
- Lighting presets (day/night)
- Photoreal renders (Pro feature)

### J.3 Library
- **60,000+ furniture models** (Coohom claim)
- Materials / textures
- Fixtures / appliances
- My custom items

### J.4 Measurement
- Dimension lines auto
- Manual dimensions
- Area labels auto (Unnamed XX.XXm²)
- Angle labels

### J.5 Multi-floor
- "New upper floor" / "New lower floor" buttons
- Each floor has own plan
- Stairs connect floors
- 3D vertical assembly

### J.6 Project management
- Save / Load / Cloud sync
- Templates
- Clone / share / collaboration 📷

### J.7 Import/Export
- DXF / DWG / JPG / PNG / PDF import ✅
- Render PNG / walkthrough video export 📷
- Report PDF 📷

---

## K. 🔥 Fire safety extensions (our addition)

### K.1 Mode selector (left column)
- **🚨 Fire Safety** new mode
- Switches right panel to fire-safety properties
- Reveals simulation overlay in canvas

### K.2 Fire-safety panel (right sidebar)
- **Scenario selector**:
  - Stair pressurization
  - Corridor / lobby pressurization
  - Elevator shaft
  - Parking ventilation (CO + smoke)
  - Fire evacuation
- **Standard selector**: EN 12101-6 / NFPA 92 / СП 7.13130
- **Δp / velocity / force limits**: auto from standard
- **Fire source placement**: click to add fire (HRR in kW)
- **Ventilation source**: place supply/exhaust/jet fans from library
- **Simulation playback**:
  - Time-lapse slider (0 → 600s)
  - Play/pause/reset
  - Speed 1x / 5x / 10x

### K.3 Overlay in canvas
- Airflow particles (from physics engine Task 007)
- Smoke layer descent
- CO heatmap
- Pressure isolines
- Evacuation path arrows
- Door force gauges
- Fan thrust cones

### K.4 Report
- Export fire-safety compliance report (PDF)
- Pass/fail per zone
- Active formulas + Δp values + door forces
- Citations to EN/NFPA/СП

---

## L. What our current wall-editor (`/calc/wall-editor`) covers

| Coohom feature | Our status |
|----------------|------------|
| Draw straight wall | ✅ W tool |
| Rectangle room | partial (R key tagged, logic not done) |
| Arc wall | ❌ |
| Door library | ✅ 6 presets (single/double) |
| Window library | ✅ 5 presets |
| Column | ✅ placed |
| Jet fan | ✅ 6 models |
| Exhaust | ✅ 5 presets |
| PIP window | ❌ |
| Multi-floor | ❌ (single-floor only) |
| Context menu | ❌ |
| Floor panel (right) | partial (floor height in topbar) |
| Draw wall panel (right) | partial (properties panel) |
| Library dropdown hierarchy | partial (flat cards, no subtype dropdown yet) |
| 3D mode | ❌ (only 2D SVG) |
| Import CAD | ❌ (Task 018–021 planned) |
| Fire safety sim | ❌ (Task 006, 010, 011) |

**Gap:** ~60% of Coohom-parity. Main missing: 3D mode, PIP, context menu, arc walls, multi-floor, furniture/material library, renders.

---

## M. Implementation roadmap (proposed)

### Phase A — Foundation (✅ done — current wall-editor)
- 2D canvas + grid + snap
- Walls / doors / windows / columns / fans library
- Undo/redo / save/load

### Phase B — Coohom UX parity (new, ~10–14 days)
1. **Right context panel** — replaces Library/Properties tab with contextual Floor/Wall/Door/Window forms
2. **PIP window** — draggable small preview (2D ↔ 3D ↔ sketch)
3. **Selection context menu** — floating toolbar on selection (flip/hide/lock/delete/duplicate/align)
4. **Arc wall tool** — 3-point curve drawing
5. **Room auto-detection** — closed polygon → named room with area label
6. **Multi-floor** — New upper/lower floor buttons, floor switcher bottom-left
7. **Dimensions auto-all** — toggle showing every wall/opening dimension
8. **Bottom toolbar** — floor/view/zoom controls
9. **3D view toggle** — Three.js scene rendered from 2D data (extrude walls, extrude floor, add doors/windows cutouts, columns, fixtures)

### Phase C — Library expansion (~5–7 days)
1. Door subtypes (sliding, revolving, unequal-double, frame-only)
2. Window subtypes (tilt-turn, casement, bay, corner)
3. Structural library (column, beam, stair, opening)
4. Material library (wall / floor finishes)
5. Furniture library (MVP: 10 essential items — table/chair/bed/sofa/sink/toilet/kitchen...)

### Phase D — Fire safety mode (🔥, ~7–10 days)
1. Mode switcher (🚨 icon in left column)
2. Physics engine wiring (Task 007)
3. Airflow particles overlay
4. Smoke/CO heatmap
5. Time-lapse controls
6. Standard selector integration
7. Compliance PDF report

### Phase E — Import/Cloud (Task 018–023)
1. DXF parser
2. Claude AI wall detection
3. Supabase server save
4. Collaboration (multi-user)

**Total estimate:** 35–45 days for full parity + fire safety.

---

## N. Screenshots still needed (please provide)

If you can send screenshots of:

1. **📷 File menu** dropdown open (all options)
2. **📷 Save** menu open
3. **📷 Clear** menu open
4. **📷 Toolkit** menu open (critical — unclear)
5. **📷 Gallery** menu open
6. **📷 Help** menu open
7. **📷 Each left-column icon** (lighting / printing / schedules / etc.)
8. **📷 Window** dropdown (subtypes full list)
9. **📷 Opening** dropdown
10. **📷 Add structures** section scrolled
11. **📷 Door panel** when door selected (all fields)
12. **📷 Window panel** when window selected
13. **📷 Room panel** when room selected
14. **📷 Type dropdown** in Draw Wall (full options of "Non-...")
15. **📷 Location dropdown** in Draw Wall
16. **📷 Custom tab** in Draw Wall
17. **📷 Selection context menu** hover tooltips (8 icons, full labels)
18. **📷 Bottom-right** icon row (7+ icons, each tooltip)
19. **📷 2D mode top toolbar** (Edit / Split area / more?)
20. **📷 PIP window** close-up (tabs behavior, docking options)

Without these, my implementation will have gaps marked as "? Coohom parity".

---

## O. Next steps (autonomous decision)

Given the scope, I will:
1. ✅ Write this spec (done)
2. Expand current wall-editor with Phase B items incrementally
3. Await user screenshots for remaining ambiguous menus
4. Write detailed task files per Phase B sub-feature
5. Handoff physics-integrated fire mode to Codex (Task 006 + 010 + 011 + new 026)

**Recommendation:** build Phase B step-by-step, each committable; focus first on **right context panel + PIP + selection menu + arc walls + multi-floor** — that's the visible coohom feel.
