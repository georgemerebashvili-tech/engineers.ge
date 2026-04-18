# Task 009 — Elevator Shaft Pressurization Simulator

**Delegated to:** Codex + Claude (visuals)
**Created:** 2026-04-18
**Parent:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** 007 (engine), 008 (pattern from stair)
**New file:** `public/calc/elevator-shaft-press.html`
**Slug:** `/calc/elevator-shaft-press`

## მიზანი

ლიფტის შახტის დაწნეხვის ცალკე სიმულატორი. სტრუქტურა — იგივე pattern, რაც stair (shell Claude-ს მზადა აქვს).

## Parameters (inputs)

- სართულების რაოდენობა (2–40)
- სართულის სიმაღლე (2.4–6 მ)
- შახტის ზომები (W × D): typical 2.0 × 2.5 მ
- ლიფტის კაბინის ზომები (W × D): typical 1.1 × 1.4 მ
- კაბინის სიჩქარე (m/s): 1.0–4.0
- კარის ზომები (mm): 900 × 2100
- კარების გახსნის სცენარი: ყველა დაკეტილი / 1 ღია / random ღია
- Standard + class (EN 12101-6, NFPA 92 Elevator, СП 7.13130 Лифт)

## Physics (from engine)

- **Leakage** per closed door: `leakageFlow(doorArea, Δp)`
- **Piston pressure:** `pistonPressure(car_area, shaft_area, velocity)` — კაბინის მოძრაობისას
- **Door opening force:** `doorOpeningForce(w, h, Δp + piston_dp)`
- **Required supply:** `requiredSupplyFlow(...)`
- **Piston visual** — 3D-ში კაბინის ზემოთ/ქვემოთ ცდება → airflow burst ნახატი

## Views (3 tabs, რეიზერებული)

- **ჭრილი (Section)** — SVG, vertical shaft, კაბინა შუაში, landing doors per floor
- **გეგმა (Plan)** — SVG, top-down shaft + cabin inside
- **3D** — Three.js, transparent shaft tower, animated cabin moving up/down, particles

## Acceptance Criteria

- [x] File live at `/calc/elevator-shaft-press`
- [x] Added to `lib/calculators.ts` with icon 🛗, tag 'HVAC', standard 'EN 12101-6 · Elevator'
- [x] Added to `components/calc-grid.tsx` under fire-safety (increment toolsCount)
- [x] Uses `_base.css` tokens + `_theme-sync.js`
- [x] Uses `_physics-engine.js`
- [x] Same sidebar structure as stair (templates · standard · params · supply · flow viz)
- [x] 3-4 templates: residential 5fl / office 15fl / hotel 30fl
- [x] 3D cabin animates up/down (toggle "📽 კაბინის მოძრაობა"). velocity-ს მიყვება, visual piston effect
- [x] Formulas tab with KaTeX
- [x] Export JSON + PDF
- [x] Light/dark theme
- [x] Drag-resizable sidebar (reuse pattern)

## Visuals (Claude will handle)

Before Codex starts, Claude delivers:
- HTML shell skeleton (copy stair, adapt labels)
- 3D scene with cabin + shaft
- SVG templates for section + plan
- Template presets

Codex then wires:
- Physics engine imports
- Computed results
- Formula rendering
- Cabin animation state
- Export/import

## Open Questions

- [ ] Machine room press. — include or separate?
  → Current v1 keeps top-supply / machine-room feel in visuals, but dedicated toggle is still open if we want a stricter sub-scenario.
- [ ] Multi-cabin shafts (express + local) — Phase 1 or later?
  → **Claude rec:** single cabin Phase 1, multi Phase 2

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** extracted inline module passes `node --check`; page opened locally at `http://localhost:3010/calc/elevator-shaft-press.html` after formulas/export/import/piston wiring.
