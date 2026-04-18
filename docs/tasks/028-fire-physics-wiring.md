# Task 028 — Fire-Safety Physics & Report Wiring

**Delegated to:** Codex
**Created:** 2026-04-18
**Depends on:** Task 007 (physics engine ✅), Task 026 Phase D (Claude MVP ✅), Task 027 (editor foundation)
**Blocks:** Compliance report generation, real simulation grid

## What Claude already built (MVP visual shell)

Claude shipped the Fire-Safety UI and visual-only time-lapse. See [`public/calc/wall-editor.html`](../../public/calc/wall-editor.html):

- **Fire tool** (`X` shortcut) in left toolbar — click to place `fire` sources in `state.fires[]`
- **Ctx panel** (`tool:fire`, `sel:fire`) — HRR max, radius, growth (slow/medium/fast/ultra), presets (trash/car/truck/custom)
- **Time-lapse bar** (`.we-fire-bar`) with scenario + standard selectors, reset/play/pause, slider (0–600 s), 1×/5×/10× speed
- **Visual overlay** (`#g-sim-overlay`) — expanding smoke disc (via radial gradient), 3 concentric CO rings, pulsating fire core
- **Placeholder math** — `FIRE_GROWTH` (kW/s²), `smokeRadiusAt(fire, t, ceiling)`, `smokeLayerDepth(...)` — empirical only, NOT physically calibrated

**Do not replace** the UI shell — extend it. All visual primitives and the time-lapse loop work.

## Your scope (Codex)

### 1. Hook real physics (Task 007 `_physics-engine.js`)

Replace Claude's empirical `smokeRadiusAt` / `smokeLayerDepth` with Task-007 functions:
- `plumeMassFlow(Q, z)` — SFPE axisymmetric plume
- `smokeLayerHeight(A, Q, t, h_ceiling)` — Zukoski / NFPA 92 algebraic model
- `coConcentration(V_room, Q, t, yield_CO)` — CO mass accumulation
- `doorOpeningForce(w, h, Δp, closer)` — NFPA 101 §7.2.1.4

Wire these into `renderFires()` so the overlay reflects **actual** values, not just time-progress visuals.

### 2. Cell-based simulation grid

Current: single radial gradient per fire. Target: 1 m² cell grid over plan bbox, store per-cell `{ smokeAlpha, co_ppm, temp_C, pressure_Pa }`. Render as colored rects (heatmap).

- Grid resolution: 1 m (tunable via `ui.simGridSize`)
- Update every time-lapse frame OR at 0.5 s sim-time intervals (whichever is cheaper)
- Performance target: 60 fps at 50×50 grid + 4 fires

### 3. Evac paths (A* with obstacles)

- Auto-detect exits from `state.openings` where door leads outside (infer by `fireRating` + `leadsOutside` flag added by user via ctx panel)
- For each room: compute A* shortest path to nearest exit, avoiding walls and smoke-heavy cells
- Render as arrow polylines in `#g-sim-overlay` (green gradient along path → red near exit congestion)
- Show travel time estimate per room (assume 1.0 m/s walking through smoke)

### 4. Door force gauges

For every door: compute `doorOpeningForce` based on:
- Δp across door (from surrounding zone pressures)
- Door width/height/closer weight
- Render color-coded gauge next to door (green ≤ 110 N, yellow 110–133, red > 133 N — NFPA 101)

Extend `renderOpenings()` to call a new `renderDoorForceGauges()` when `state.fires.length > 0`.

### 5. Pressure isolines

- Solve mass-balance for each zone (simplified)
- Generate marching-squares isolines at -25, 0, +25, +50, +75 Pa
- Render as SVG `<path>` in `#g-sim-overlay` (blue = low pressure, red = high)

### 6. Airflow particles (animated)

- Sample 100–500 particles advected by local velocity field
- Update each frame of time-lapse
- Render as tiny dots with alpha trail
- Use `requestAnimationFrame` already established via `fireLoop(ts)`

### 7. Compliance PDF report

- Add server route `/api/fire-report` (Next.js route handler) that accepts `{ plan, fires, results }` and returns PDF via `@react-pdf/renderer` or `pdf-lib`
- Per-room status: pass/fail
- Δp achieved vs required (per EN 12101-6 / NFPA 92 / СП 7.13130 selected standard)
- Door forces vs class max
- Smoke layer clearance height (must be ≥ 1.8 m per NFPA 92)
- Active formulas + references (KaTeX-rendered PNG snippets)
- Wire `#fire-report` button (currently toasts "Task 028") to call the API and trigger download

### 8. Scenario-specific behavior

When user picks a scenario in `#fire-scenario`:
- **stair** — default fan position (top), δp target, piston-effect on
- **corridor** — pressurize corridor; smoke stays in rooms
- **elevator** — shaft pressurization (use Task 009 math)
- **parking** — jet-fan drive; use Task 010 CO model
- **evac** — show evac path overlay always-on

### 9. Standards compliance

When user picks standard in `#fire-standard`:
- **EN 12101-6** — 50 Pa min Δp, 100 N max door force
- **NFPA 92** — 25 Pa min Δp, 133 N max door force
- **СП 7.13130** — 20 Pa min Δp, 150 N max (RU)

Show the current standard thresholds in the report.

### 10. Persist fires in floor archive

Currently `state.fires` is floor-independent (shared across floors). Either:
- Move fires into `state.floors[i].data.fires`, OR
- Keep fires global but tagged with `floor: i`.

Pick whichever aligns with how stair/elevator multi-floor scenarios work.

## Manual QA checklist

- [ ] Place 3 fires in a room, play time-lapse 5× → smoke expands, CO rings bloom, slider advances
- [ ] Pause at t=120 s → state frozen, slider position matches
- [ ] Switch scenario parking → stair → evac arrows appear
- [ ] Switch standard EN → NFPA → door force gauges recolor based on new threshold
- [ ] Click 📋 report button → PDF downloads, shows per-room pass/fail + formulas
- [ ] Place fire on floor 1F, switch to 2F — fires respect floor scope per decision in §10

## Files to touch

Primary:
- [`public/calc/wall-editor.html`](../../public/calc/wall-editor.html) — replace empirical math, add gauges/particles/isolines
- [`public/calc/_physics-engine.js`](../../public/calc/_physics-engine.js) — add any missing exports
- New: `app/api/fire-report/route.ts` — PDF endpoint
- New (optional): `lib/fire-sim-grid.ts` — cell grid solver if you extract it

Do not edit:
- `.ep-*` CSS / `EditorPanels` renderer — design layer only Claude touches

## Acceptance

1. All 10 steps implemented.
2. QA checklist passes.
3. `/calc/wall-editor` at 60 fps with 4 fires placed + 50×50 grid + particles.
4. PDF matches the 3 international standards.
5. Task 027 (editor wiring) stays working — no regressions.
