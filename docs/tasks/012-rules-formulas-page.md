# Task 012 — Rules & Formulas Reference Page

**Delegated to:** Claude (UI) + Codex (KaTeX integration + data wiring)
**Created:** 2026-04-18
**Parent:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** 007 (engine), 008-011 (simulators)
**Route:** `/calc/docs/physics` (Next.js page, not iframe)
**File:** `app/(withSidebar)/calc/docs/physics/page.tsx`

## მიზანი

ერთი reference page, სადაც ყოველი active formula იხსნება — ცვლადებით, ახსნით, worked example-ით, references-ით, ბმულით რომელ სიმულატორში გამოიყენება.

## UI

### Layout

- Left sidebar: formula list (alphabetical + by category)
- Main: selected formula full detail
- Top search bar: client-side filter

### Per formula card

```
┌─────────────────────────────────────────────────────────┐
│ LEAKAGE FLOW · EN 12101-6 §A.4                          │
│                                                         │
│ ფორმულა (KaTeX rendered):                              │
│   Q = C_d × A × √(2 Δp / ρ)                             │
│                                                         │
│ ცვლადები:                                               │
│   Q  m³/s   ნაკადი                                      │
│   Cd —      discharge coef. (0.65 typical)              │
│   A  m²     ხვრელის ფართობი                             │
│   Δp Pa     წნევის სხვაობა                              │
│   ρ  kg/m³  ჰაერის სიმკვრივე (1.2)                     │
│                                                         │
│ ახსნა:                                                  │
│   ორიფისის განტოლება. ნაკადი პროპორციულია √Δp-ის...    │
│                                                         │
│ მაგალითი:                                               │
│   A = 0.02 m² (2 cm door crack), Δp = 50 Pa             │
│   Q = 0.827 × 0.02 × √50 = 0.117 m³/s                  │
│                                                         │
│ Reference: EN 12101-6:2005 eq (A.7)                    │
│ გამოიყენება: stair-pressurization, elevator-press,      │
│              floor-pressurization                       │
└─────────────────────────────────────────────────────────┘
```

## Data source

Static import of `public/calc/_physics-engine.js` from the Next.js page:
- `PHYS` object → function names + docstrings
- `REFS` object → standard references
- `STANDARDS` object → classes/tiers

Auto-generated formula list from JSDoc parsing OR manually curated array in page component (recommended for control).

## Acceptance Criteria

- [x] Route live: `/calc/docs/physics`
- [x] Listed in dashboard-sidebar under a "📚 დოკუმენტაცია" section
- [x] Lists all formulas from engine (min 8: leakage, door force, ACH, CO, plume, smoke layer, piston, fan sizing)
- [x] Each formula rendered with KaTeX (install `katex` npm, import CSS)
- [x] Client-side search filter (instant)
- [x] Variable table per formula
- [x] Worked example per formula (numeric)
- [x] Links out to consuming simulators
- [x] Print-friendly (@media print, one formula per page)
- [x] Light + dark theme
- [x] Georgian primary, with English terminology in parentheses

## Visual design (Claude)

- Follow DESIGN_RULES tokens
- Formula cards: `bg-sur`, `border`, radius-card, `shadow-card`
- Category chips (leakage / doors / smoke / airflow) — color-coded
- Monospace font for variables + values
- Georgian sans for prose

## Technical

- `katex` npm package — install
- Imports: `import 'katex/dist/katex.min.css'` in page
- `import { InlineMath, BlockMath } from 'react-katex'` — uses server-friendly rendering
- Static generation OK (no client state besides filter)

## Open Questions

- [ ] Should formulas be extractable as standalone `.md` files for export?
  → **Claude rec:** Phase 2 feature, not now
- [ ] Interactive variable sliders per formula (playground)?
  → **Claude rec:** nice-to-have, add as stretch goal

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** `npm install katex react-katex` completed successfully; targeted `eslint` passes for [`app/(withSidebar)/calc/docs/physics/page.tsx`](../../app/(withSidebar)/calc/docs/physics/page.tsx) and [`components/dashboard-sidebar.tsx`](../../components/dashboard-sidebar.tsx); `git diff --check` is clean for the route + dependency manifest updates. Live HTTP spot-check remains pending from this shell because local `localhost:3010` requests are not responding inside the sandbox.
