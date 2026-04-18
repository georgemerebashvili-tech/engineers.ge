# Task 010 — Parking Ventilation Simulator

**Delegated to:** Codex + Claude (visuals)
**Created:** 2026-04-18
**Parent:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** 007 (engine), 008 (pattern)
**New file:** `public/calc/parking-ventilation.html`
**Slug:** `/calc/parking-ventilation`

## მიზანი

ერთსართულიანი მიწისქვეშა / ფარდული პარკინგის ვენტილაციის სიმულატორი — CO controlled mode + smoke extraction scenario.

## Parameters (inputs)

- **გეომეტრია**
  - Floor area (m²): 500–10000
  - Ceiling height (m): 2.4–4.0
  - Parking spots count
  - Ramp dimensions (W × L)
- **Ventilation mode**
  - Jet fans / supply+exhaust ducts
  - Fan count, thrust (N), noise (dBA)
- **Operation scenario**
  - Normal (CO-controlled)
  - Peak hour (cars × N per hour)
  - Fire smoke extraction
- **Standard**
  - EN 12101-3 (smoke)
  - ASHRAE 62.1 (ventilation)
  - СП 60.13330 + НПБ (RU)

## Physics (from engine)

- **CO accumulation** — `coConcentration(emission, volume, ventFlow, c0, t)`
- **Required ACH** — from standard: normal 3–6 ACH, smoke extract 10+
- **Fan layout** — jet fans: 1 per 600m² typical; number + thrust → momentum flux
- **Smoke layer** — `plumeMassFlow`, `smokeLayerHeight` for fire scenario
- **Fire size** — typical car 5 MW / truck 20 MW

## Views

- **გეგმა (Plan)** — main view: floor plan, parking spots, fans (arrows show thrust direction), ramp, supply/exhaust grilles
- **ჭრილი (Section)** — horizontal slice showing smoke layer height, fan positions
- **3D** — Three.js, top-down cinematic, cars, smoke particles during fire scenario

## Acceptance Criteria

- [x] File live at `/calc/parking-ventilation`
- [x] Added to calculators registry + dashboard (fire-safety category, +1 tool)
- [x] Sidebar sections: Templates · Standard · Geometry · Fans · Scenario · Flow viz
- [x] Templates (4–5):
  - Residential 500m² / 20 cars / 2 jet fans
  - Office 1500m² / 60 cars / 6 jet fans
  - Shopping 4000m² / 150 cars / 16 jet fans
  - Multi-level (stacked, Phase 1 = top floor only)
- [x] CO accumulation chart (line, 0–600s) in "📐 ფორმულები" tab
- [x] Smoke layer visual in 3D (brown/grey particles descending)
- [x] Jet fans: animated thrust cones
- [x] Standard switch updates ACH targets + CO limits (9 ppm EN, 35 ppm ASHRAE, etc.)
- [x] Export JSON + PDF
- [x] Light/dark, drag-resize, reuse patterns

## Visual design notes (Claude)

- Plan view = primary (პარკინგი top-down ბუნებრივი)
- Car icons: simple rect 4.5×1.8m
- Jet fans: visible cylinders with thrust arrow
- CO heatmap toggle — red zones where concentration exceeds limit
- Fire source: orange glow + expanding smoke particle spawn

## Open Questions

- [x] Multi-level parking → Phase 2?
  → v1 keeps a `multi-level top floor` template only; stacked floors remain Phase 2.
- [ ] Car movement animation (entry/exit) for engagement?
  → **Claude rec:** static cars, animate fan thrust + smoke only (performance)

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** extracted inline module passes `node --check`; `git diff --check` is clean for the new simulator + registry files. Live HTTP check from this shell to `localhost:3010` did not respond, so browser/runtime spot-check remains pending in this sandbox.
