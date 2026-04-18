# Task 008 — Stair Pressurization · Physics Upgrade

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** 007 (physics engine)
**File:** [`public/calc/stair-pressurization.html`](../../public/calc/stair-pressurization.html)

## კონტექსტი

არსებული სიმულატორი ვიზუალურად სრულია (Claude). ფიზიკა ჯერ არ არის ნამდვილი — მხოლოდ static labels. ამ task-ში ვაერთებთ `_physics-engine.js`-ს და real-time გამოთვლას.

## მიზანი

- ცოცხალი ფიზიკა: ყოველი input change → leakage + door force + required flow განიანგარიშება
- ახალი ტაბი "📐 ფორმულები" — active calculations + references
- Export JSON + PDF buttons

## Acceptance Criteria

### ფიზიკის ინტეგრაცია

- [x] Import `_physics-engine.js` via `<script type="module">`
- [x] On every state change, compute:
  - `leakQ_total` — ყველა კარის leakage ჯამი (closed doors)
  - `openDoorQ` — ღია კარების flow (v_min × area)
  - `requiredSupplyQ` — `requiredSupplyFlow(leakQ_total, openDoorQ, 1.1)`
  - `doorForce` — თითო სართულისთვის, `doorOpeningForce(w, h, Δp)`
  - `maxDpAllowed` — `maxDpForDoor(w, h, class.force_max)`
- [x] Results rendered in std-info overlay (replace static values with computed)
- [x] If computed `doorForce > class.force_max` → show red warning badge

### ახალი ტაბი "📐 ფორმულები"

- [x] 4th tab: "ფორმულები"
- [x] Content:
  - ყოველი active formula — KaTeX rendered
  - ცვლადების current value-ები
  - Standard reference (from REFS)
  - "გამოთვლილია:" → ზუსტი რიცხვი
- [x] Formulas shown:
  1. Leakage per door: `Q = 0.827 × A × √Δp`
  2. Door opening force
  3. Total supply flow
  4. Smoke layer (if applicable)

### Export / Save

- [x] "⬇ JSON" button in header — downloads state + results
- [x] "⬇ PDF" button — window.print() with clean print CSS
- [x] "⬆ JSON" button — file-picker → restore state
- [x] JSON schema matches shared contract (see PLAN.md § Phase 1 Shared contract)

### Print CSS

- [x] `@media print` — hide sidebar, tabs, interactive controls
- [x] Show: title, params summary, results table, active formulas, one view (section SVG prominent)
- [x] A4 landscape or portrait (whichever fits)

## Technical notes

- ახალი functions `redraw()`-ში: `computeResults()` → updates `state.results` → renders into std-info + formulas tab
- No server calls
- KaTeX via CDN (`https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js` + CSS)

## Open Questions

- [x] Rolling/live animation — formula values animate on change?
  → Implemented as instant update, no animation, per Claude recommendation.

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** extracted inline module passes `node --check`; page opened locally at `http://localhost:3010/calc/stair-pressurization.html` after wiring formulas/export/import/print flow.
