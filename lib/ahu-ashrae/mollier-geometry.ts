/**
 * Mollier i-d coordinate geometry helpers.
 * All functions return points in i-d space: { d [g/kg], h [kJ/kg dry air] }
 * Uses psychrometrics.ts for all thermodynamic calculations (no duplicate formulas).
 */

import { satW, enthalpy, wFromDbRh } from './psychrometrics';

export interface IdPt {
  d: number; // humidity ratio [g/kg]
  h: number; // specific enthalpy [kJ/kg dry air]
}

const D_MAX = 30; // g/kg chart upper bound

/** Saturation curve (100% RH): T from −15 to 62°C */
export function satCurvePoints(P: number, steps = 150): IdPt[] {
  const pts: IdPt[] = [];
  for (let i = 0; i <= steps; i++) {
    const T = -15 + (77 * i) / steps;
    const w = satW(T, P);
    const d = w * 1000;
    if (d > D_MAX + 0.5) continue;
    pts.push({ d, h: enthalpy(T, w) });
  }
  return pts;
}

/** Constant-RH curve */
export function rhCurvePoints(
  rh: number,
  P: number,
  tMin = -15,
  tMax = 60,
  steps = 80,
): IdPt[] {
  const pts: IdPt[] = [];
  for (let i = 0; i <= steps; i++) {
    const T = tMin + ((tMax - tMin) * i) / steps;
    const w = wFromDbRh(T, rh, P);
    const d = w * 1000;
    if (d < 0 || d > D_MAX + 0.5) continue;
    pts.push({ d, h: enthalpy(T, w) });
  }
  return pts;
}

/**
 * Isotherm (T = const) — straight line in i-d space.
 * Returns two endpoints: [d=0, d=dSat(T)].
 */
export function isothermSegment(T: number, P: number): [IdPt, IdPt] {
  const dEnd = Math.min(satW(T, P) * 1000, D_MAX);
  const dClamped = Math.max(0, dEnd);
  return [
    { d: 0,        h: enthalpy(T, 0) },
    { d: dClamped, h: enthalpy(T, dClamped / 1000) },
  ];
}

/**
 * Wet-bulb line (Twb = const) — near-straight in i-d space.
 * slope ≈ 4.186·Twb/1000 kJ/kg per g/kg.
 * Returns two endpoints: [d=0, d=dSat(Twb)].
 */
export function wetBulbSegment(Twb: number, P: number): IdPt[] {
  const wSat = satW(Twb, P);
  const dSat = Math.min(wSat * 1000, D_MAX);
  if (dSat <= 0) return [];
  const hSat = enthalpy(Twb, wSat);
  const slope = (4.186 * Twb) / 1000; // kJ/kg per g/kg
  return [
    { d: 0,    h: hSat - slope * dSat },
    { d: dSat, h: hSat },
  ];
}

/** Constant specific-volume line */
export function specVolPts(
  v: number,
  P: number,
  tMin = -15,
  tMax = 55,
  steps = 60,
): IdPt[] {
  const pts: IdPt[] = [];
  for (let i = 0; i <= steps; i++) {
    const T = tMin + ((tMax - tMin) * i) / steps;
    // v = 287.055·(T+273.15) / ((P−pw)·1000)  →  pa = 287.055·(T+273.15)/(v·1000)
    const pa = (287.055 * (T + 273.15)) / (v * 1000);
    const pw = P - pa;
    if (pw <= 0 || pw >= P) continue;
    const wKg = (0.621945 * pw) / pa;
    const d = wKg * 1000;
    if (d < 0 || d > D_MAX + 0.5) continue;
    pts.push({ d, h: enthalpy(T, wKg) });
  }
  return pts;
}
