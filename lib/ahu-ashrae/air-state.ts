/**
 * Lean runtime air state — the value that flows through the section chain.
 * One AirState per stage. Convert to PsychoPoint (label + extra fields) only
 * for chart rendering.
 *
 * All thermodynamic invariants are kept consistent by the helper makers.
 * Pressure stays roughly constant within an AHU (small ΔP relative to atm),
 * so we carry `p` so altitude / building pressurization can be modeled later.
 */

import {
  satW, wFromDbWb, wFromDbRh, rhFromDbW,
  enthalpy, wetBulb, dewPoint, airDensity,
} from './psychrometrics';

export interface AirState {
  tdb: number;   // °C dry bulb
  twb: number;   // °C wet bulb
  w: number;     // kg/kg humidity ratio (mass water / mass dry air)
  h: number;     // kJ/kg dry air enthalpy
  rh: number;    // 0..1 relative humidity
  p: number;     // kPa atmospheric pressure
  mDot: number;  // kg/s dry air mass flow rate
}

// ─── Constructors ─────────────────────────────────────────────────────────────

/** Build AirState from DB + WB. */
export function fromDbWb(
  tdb: number, twb: number, mDot: number, p = 101.325,
): AirState {
  const w = wFromDbWb(tdb, twb, p);
  return finalize(tdb, w, mDot, p);
}

/** Build AirState from DB + RH (RH expressed as 0..1). */
export function fromDbRh(
  tdb: number, rh: number, mDot: number, p = 101.325,
): AirState {
  const w = wFromDbRh(tdb, rh * 100, p); // psychrometrics uses % internally
  return finalize(tdb, w, mDot, p);
}

/** Build AirState from DB + W (humidity ratio). */
export function fromDbW(
  tdb: number, w: number, mDot: number, p = 101.325,
): AirState {
  return finalize(tdb, w, mDot, p);
}

/**
 * Common finalizer: derives twb, h, rh from canonical (tdb, w, p) triple.
 * If w exceeds saturation it's clamped to saturation (foggy/saturated air).
 */
function finalize(tdb: number, w: number, mDot: number, p: number): AirState {
  const wSat = satW(tdb, p);
  const wClamped = Math.max(0, Math.min(w, wSat));
  return {
    tdb,
    twb: wetBulb(tdb, wClamped, p),
    w: wClamped,
    h: enthalpy(tdb, wClamped),
    rh: rhFromDbW(tdb, wClamped, p) / 100, // convert % → 0..1
    p,
    mDot,
  };
}

// ─── Derived properties ───────────────────────────────────────────────────────

/** Dew point in °C. */
export function dewPointOf(state: AirState): number {
  return dewPoint(state.w, state.p);
}

/** Volumetric flow at this state's specific volume, in m³/s. */
export function volumetricFlow(state: AirState): number {
  return state.mDot / airDensity(state.tdb, state.w, state.p);
}

/** Volumetric flow in m³/h (more readable for AHU spec sheets). */
export function volumetricFlowM3h(state: AirState): number {
  return volumetricFlow(state) * 3600;
}

// ─── Update operations (used by section processors) ───────────────────────────

/** Add sensible heat (kW) → new dry-bulb temperature, w preserved. */
export function addSensible(state: AirState, qSensible_kW: number): AirState {
  const cp = 1.006 + 1.86 * state.w; // kJ/(kg·K), ASHRAE moist-air specific heat
  const dT = qSensible_kW / (state.mDot * cp);
  return fromDbW(state.tdb + dT, state.w, state.mDot, state.p);
}

/** Add latent heat / moisture (kg_water/s) → new w, tdb preserved. */
export function addMoisture(state: AirState, dmDot_kg_per_s: number): AirState {
  const newW = state.w + dmDot_kg_per_s / state.mDot;
  return fromDbW(state.tdb, newW, state.mDot, state.p);
}

/** Move along constant-W to a target tdb (pure sensible, e.g. heating coil). */
export function toTdb(state: AirState, newTdb: number): AirState {
  return fromDbW(newTdb, state.w, state.mDot, state.p);
}

/** Energy required to move from a → b (kW), positive = added to air. */
export function energyDelta(a: AirState, b: AirState): number {
  // Use the smaller mass flow as a sanity (they should match in a chain)
  const m = Math.min(a.mDot, b.mDot);
  return m * (b.h - a.h);
}
