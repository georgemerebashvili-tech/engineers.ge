# Task 007 — Physics Engine (Shared Library)

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent plan:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** —
**Blocks:** 008, 009, 010, 011, 012

## მიზანი

ერთი გაზიარებული ES module (`public/calc/_physics-engine.js`), რომელსაც ყოველი სიმულატორი იტვირთავს `<script type="module">` ან import-ით. ფიზიკა ერთ ადგილზე — zero duplication.

## Scope — ფუნქციები

ყოველი ფუნქცია **pure**, side-effect-free, fully typed JSDoc-ით.

### Leakage / Flow

```js
/**
 * Orifice flow through a crack or opening.
 * Q = Cd × A × √(2 Δp / ρ)
 * Simplified (ρ=1.2 kg/m³, Cd=0.65): Q = 0.827 × A × √Δp
 * @param {number} area_m2
 * @param {number} dp_pa
 * @param {number} [cd=0.65]
 * @param {number} [rho=1.2]
 * @returns {number} Q in m³/s
 * @ref EN 12101-6:2005 §A.4 eq (A.7)
 */
export function leakageFlow(area_m2, dp_pa, cd = 0.65, rho = 1.2) { ... }

/**
 * Sum leakage through multiple parallel openings at same Δp.
 * @param {Array<{area: number, cd?: number}>} openings
 * @param {number} dp_pa
 */
export function totalLeakage(openings, dp_pa) { ... }
```

### Doors

```js
/**
 * Door opening force under pressure differential.
 * F = F_dc + (W × A × Δp × d) / (2 × (W - d))
 * @param {number} width_m — door leaf width
 * @param {number} height_m — door leaf height
 * @param {number} dp_pa
 * @param {number} [doorcloserForce_N=30]
 * @param {number} [handleOffset_m=0.07] — handle to edge
 * @returns {number} force in N at handle
 * @ref NFPA 92:2021 §A.4.4.4 eq (A.4.4.4a)
 */
export function doorOpeningForce(width_m, height_m, dp_pa, doorcloserForce_N = 30, handleOffset_m = 0.07) { ... }

/**
 * Max Δp for given max force limit.
 * Inverse of doorOpeningForce.
 */
export function maxDpForDoor(width_m, height_m, maxForce_N, doorcloserForce_N = 30, handleOffset_m = 0.07) { ... }
```

### Airflow rates

```js
/** ACH = Q × 3600 / V */
export function airChangeRate(flow_m3_s, volume_m3) { ... }

/** Required Q given target ACH and volume */
export function flowFromACH(ach, volume_m3) { ... }
```

### Parking — CO

```js
/**
 * CO concentration at time t (first-order mass balance).
 * dC/dt = (Q_gen - Q_vent × C) / V
 * Analytic solution: C(t) = C_eq + (C0 - C_eq) × exp(-Q_vent × t / V)
 * where C_eq = Q_gen / Q_vent
 * @param {number} co_emission_m3_s — CO generation rate
 * @param {number} volume_m3
 * @param {number} vent_flow_m3_s
 * @param {number} c_initial_ppm
 * @param {number} t_seconds
 * @returns {number} C in ppm
 * @ref ASHRAE Fundamentals Ch 16 · simplified
 */
export function coConcentration(co_emission_m3_s, volume_m3, vent_flow_m3_s, c_initial_ppm, t_seconds) { ... }

/**
 * Emission rate for N cars entering/exiting per hour.
 * Typical: 20 g/cycle × N_cars per hour → converted to m³/s at 1.25 g/m³ density.
 */
export function coEmissionRate(cars_per_hour, grams_per_cycle = 20) { ... }
```

### Smoke (SFPE / Heskestad)

```js
/**
 * Plume mass flow at height z above fire.
 * m_p = 0.071 × Q_c^(1/3) × z^(5/3) + 0.0018 × Q_c
 * @param {number} Qc_kW — convective heat release
 * @param {number} z_m — height above virtual origin
 * @returns {number} m_p in kg/s
 * @ref SFPE Handbook · Heskestad plume eq
 */
export function plumeMassFlow(Qc_kW, z_m) { ... }

/**
 * Smoke layer interface height at time t (one-zone model).
 * dV_s/dt = m_p / ρ_s
 * @param {number} Q_kW — total heat release
 * @param {number} area_m2 — room floor area
 * @param {number} ceiling_height_m
 * @param {number} t_seconds
 * @returns {number} layer interface height from floor (m)
 */
export function smokeLayerHeight(Q_kW, area_m2, ceiling_height_m, t_seconds) { ... }
```

### Elevator

```js
/**
 * Piston pressure from car movement in shaft.
 * Δp = 0.5 × ρ × (v × A_car / A_shaft)²
 * @param {number} car_area_m2
 * @param {number} shaft_area_m2
 * @param {number} velocity_ms
 * @returns {number} Δp in Pa
 */
export function pistonPressure(car_area_m2, shaft_area_m2, velocity_ms) { ... }
```

### Fan / Supply sizing

```js
/**
 * Required supply flow = leakage + open door flow + safety.
 */
export function requiredSupplyFlow(leak_m3_s, openDoorFlow_m3_s, safety = 1.1) { ... }

/**
 * Fan pressure derating for hot smoke.
 * @param {number} temp_c — operating gas temp
 * @ref EN 12101-3 classes (200/300/400/600°C)
 */
export function fanTempDerate(flow_ambient, temp_c) { ... }
```

### Unit conversions

```js
export const U = {
  pa_to_inwc:  (pa) => pa * 0.00401463,
  inwc_to_pa:  (inwc) => inwc / 0.00401463,
  m_to_ft:     (m) => m * 3.28084,
  ft_to_m:     (ft) => ft / 3.28084,
  mm_to_in:    (mm) => mm * 0.0393701,
  in_to_mm:    (inch) => inch / 0.0393701,
  ms_to_fpm:   (ms) => ms * 196.85,
  fpm_to_ms:   (fpm) => fpm / 196.85,
  m3s_to_cfm:  (m3s) => m3s * 2118.88,
  cfm_to_m3s:  (cfm) => cfm / 2118.88,
  n_to_lbf:    (n) => n * 0.224809,
  lbf_to_n:    (lbf) => lbf / 0.224809,
  c_to_f:      (c) => c * 9/5 + 32,
  f_to_c:      (f) => (f - 32) × 5/9,
};
```

### Standards metadata

```js
/**
 * Structured standard data — classes, limits, references.
 * Consumed by simulators + rules page.
 */
export const STANDARDS = {
  'EN-12101-6': {
    id: 'EN-12101-6',
    title: 'Pressure differential systems',
    region: 'EU',
    classes: {
      A: { dp_min: 40, dp_max: 60, velocity_min: 0.75, force_max: 100, open_doors: 1, note: 'მხოლოდ ევაკუაცია' },
      B: { dp_min: 40, dp_max: 60, velocity_min: 2.0,  force_max: 100, open_doors: 2, note: '...' },
      /* ... F */
    }
  },
  'NFPA-92':     { /* ... */ },
  'SP-7.13130':  { /* ... */ },
  /* additional standards to extend later */
};
```

### References

```js
/**
 * Formula references — maps function name → standard + equation.
 * Consumed by rules page and per-formula tooltips.
 */
export const REFS = {
  leakageFlow:      { std: 'EN 12101-6:2005', sec: '§A.4', eq: '(A.7)' },
  doorOpeningForce: { std: 'NFPA 92:2021',   sec: '§A.4.4.4', eq: '(A.4.4.4a)' },
  coConcentration:  { std: 'ASHRAE Fund. Ch 16', sec: 'Mass balance', eq: 'simplified' },
  plumeMassFlow:    { std: 'SFPE Handbook',  sec: 'Heskestad plume', eq: 'standard' },
  smokeLayerHeight: { std: 'NFPA 92:2021',   sec: '§C.6', eq: 'one-zone' },
  pistonPressure:   { std: 'ASME A17.1',     sec: '§2.17', eq: 'derived' },
  /* ... */
};
```

## Acceptance Criteria

- [x] File created: `public/calc/_physics-engine.js`
- [x] All functions JSDoc-annotated with units, refs, return types
- [x] All functions pure (no DOM, no globals, no side effects)
- [x] Exports tested from another HTML import path (`stair-pressurization.html`, `elevator-shaft-press.html`)
- [x] Numeric smoke-test: each function called with realistic inputs returns expected-magnitude output:
  - `leakageFlow(0.02, 50)` → ~0.12 m³/s
  - `doorOpeningForce(0.9, 2.1, 50)` → ~81 N (close to EN practical limit band)
  - `coConcentration(0.005, 2000, 4, 0, 600)` → realistic ppm
- [x] No external dependencies (pure JS, math only)
- [x] Works in both `_base.css` context and standalone
- [x] Georgian + English in JSDoc descriptions where helpful

## File layout

```js
// public/calc/_physics-engine.js
// ========================================================================
// engineers.ge — Ventilation Physics Engine v1
// Shared library for all calculator simulations.
// Each function documents its ref in JSDoc + in exported REFS map.
// ========================================================================

// ---- Leakage ----
export function leakageFlow(...) { ... }
// ---- Doors ----
// ---- Airflow rates ----
// ---- Parking CO ----
// ---- Smoke (SFPE) ----
// ---- Elevator piston ----
// ---- Fan sizing ----
// ---- Unit conversions ----
export const U = { ... };
// ---- Standards metadata ----
export const STANDARDS = { ... };
// ---- Formula references ----
export const REFS = { ... };
```

## Open Questions

- [ ] სრული STANDARDS dataset-ი საჭიროა თუ minimal (EN + NFPA + СП)?
  → **Claude rec:** minimal ამ ტასკში, extensibility დავიტოვოთ (მაგ. BS 9999, GB 51251 მოგვიანებით)
- [ ] KaTeX rendering რესპონსა ამ ფაილში უნდა იყოს თუ ცალკე?
  → **Claude rec:** ცალკე — ეს ფაილი pure math-ია, rendering ცალკე layer

## Notes

- **Don't hardcode magic constants** — ΔP ranges, Cd values, ρ ყველა parameterize
- **Don't add server-side logic** — client-only, ES module
- **Test manually** in browser console: `import('./_physics-engine.js').then(m => console.log(m.leakageFlow(0.02, 50)))`
- **Commit after each section** — easier review

---

**Status:** implemented by Codex (2026-04-18)
**Verification:** Node ESM smoke-test + imported by static calculator HTML files
