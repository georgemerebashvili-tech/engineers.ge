// Psychrometric Calculations — ASHRAE Fundamentals 2021, Chapter 1
// All temperatures in °C, pressure in kPa, humidity ratio in kg/kg dry air

import type { PsychoPoint } from './types';

// ─── Saturation Pressure ──────────────────────────────────────────────────────

/**
 * Saturation pressure of water vapor [kPa]
 * ASHRAE 2021 Ch.1 Eq. 5 (ice, T < 0°C) and Eq. 6 (water, T ≥ 0°C)
 * Valid: −100 to 200°C
 */
export function satPressure(tC: number): number {
  const T = tC + 273.15;
  if (tC < 0) {
    // Over ice
    const lnP =
      -5.6745359e3 / T +
      6.3925247 +
      -9.677843e-3 * T +
      6.2215701e-7 * T ** 2 +
      2.0747825e-9 * T ** 3 +
      -9.484024e-13 * T ** 4 +
      4.1635019 * Math.log(T);
    return Math.exp(lnP) / 1000;
  } else {
    // Over liquid water
    const lnP =
      -5.8002206e3 / T +
      1.3914993 +
      -4.8640239e-2 * T +
      4.1764768e-5 * T ** 2 +
      -1.4452093e-8 * T ** 3 +
      6.5459673 * Math.log(T);
    return Math.exp(lnP) / 1000;
  }
}

// ─── Humidity Ratio ───────────────────────────────────────────────────────────

/** W at saturation [kg/kg] */
export function satW(tC: number, p = 101.325): number {
  const pws = satPressure(tC);
  return 0.621945 * pws / (p - pws);
}

/** W from dry-bulb + wet-bulb [kg/kg] — ASHRAE Eq. 35/37 (Sprung) */
export function wFromDbWb(tdb: number, twb: number, p = 101.325): number {
  const ws = satW(twb, p);
  if (twb >= 0) {
    return ((2501 - 2.381 * twb) * ws - 1.006 * (tdb - twb)) /
           (2501 + 1.805 * tdb - 4.186 * twb);
  } else {
    return ((2830 - 0.24 * twb) * ws - 1.006 * (tdb - twb)) /
           (2830 + 1.86 * tdb - 2.1 * twb);
  }
}

/** W from dry-bulb + relative humidity */
export function wFromDbRh(tdb: number, rh: number, p = 101.325): number {
  const pws = satPressure(tdb);
  const pw = (rh / 100) * pws;
  if (p - pw <= 0) return satW(tdb, p);
  return 0.621945 * pw / (p - pw);
}

/** W from partial vapor pressure */
export function wFromPw(pw: number, p = 101.325): number {
  return 0.621945 * pw / (p - pw);
}

// ─── Derived Properties ───────────────────────────────────────────────────────

/** Relative humidity [%] from dry-bulb + W */
export function rhFromDbW(tdb: number, w: number, p = 101.325): number {
  const pws = satPressure(tdb);
  const pw = w * p / (0.621945 + w);
  return Math.min(100, Math.max(0, (pw / pws) * 100));
}

/** Enthalpy [kJ/kg dry air] — ASHRAE Ch.1 Eq. 30 */
export function enthalpy(tdb: number, w: number): number {
  return 1.006 * tdb + w * (2501 + 1.86 * tdb);
}

/** Specific volume [m³/kg dry air] — ASHRAE Ch.1 Eq. 28 */
export function specVolume(tdb: number, w: number, p = 101.325): number {
  const pw = w * p / (0.621945 + w);
  const pa = p - pw; // partial pressure of dry air
  return (287.055 * (tdb + 273.15)) / (pa * 1000);
}

/** Density of moist air [kg/m³] */
export function airDensity(tdb: number, w: number, p = 101.325): number {
  return (1 + w) / specVolume(tdb, w, p);
}

/**
 * Dew point [°C] from W and p (Newton–Raphson)
 */
export function dewPoint(w: number, p = 101.325): number {
  const pw = w * p / (0.621945 + w);
  // Initial guess: Magnus approximation
  const a = 17.368, b = 238.88;
  const lnRH = Math.log(pw / 0.6113);
  let T = (b * lnRH) / (a - lnRH);
  for (let i = 0; i < 40; i++) {
    const f = satPressure(T) - pw;
    const df = (satPressure(T + 0.001) - satPressure(T - 0.001)) / 0.002;
    const dT = f / df;
    T -= dT;
    if (Math.abs(dT) < 1e-5) break;
  }
  return T;
}

/**
 * Wet bulb [°C] from dry-bulb + W (Newton–Raphson inverse of Sprung)
 */
export function wetBulb(tdb: number, w: number, p = 101.325): number {
  let twb = tdb - (tdb - dewPoint(w, p)) * 0.35; // better initial guess
  for (let i = 0; i < 60; i++) {
    const wc = wFromDbWb(tdb, twb, p);
    const dw = (wFromDbWb(tdb, twb + 0.001, p) - wFromDbWb(tdb, twb - 0.001, p)) / 0.002;
    if (Math.abs(dw) < 1e-12) break;
    const dtwb = (w - wc) / dw;
    twb += dtwb;
    if (Math.abs(dtwb) < 1e-5) break;
  }
  return twb;
}

// ─── Full State Point ─────────────────────────────────────────────────────────

/** Build a complete PsychoPoint from dry-bulb + humidity ratio */
export function statePoint(
  tdb: number,
  w: number,
  label: string,
  description: string,
  p = 101.325,
): PsychoPoint {
  const clampedW = Math.max(0, Math.min(w, satW(tdb, p)));
  return {
    label,
    description,
    tdb,
    twb: wetBulb(tdb, clampedW, p),
    tdp: dewPoint(clampedW, p),
    w: clampedW,
    h: enthalpy(tdb, clampedW),
    rh: rhFromDbW(tdb, clampedW, p),
    v: specVolume(tdb, clampedW, p),
  };
}

/** Build state point from dry-bulb + relative humidity */
export function statePointFromRh(
  tdb: number,
  rh: number,
  label: string,
  description: string,
  p = 101.325,
): PsychoPoint {
  const w = wFromDbRh(tdb, rh, p);
  return statePoint(tdb, w, label, description, p);
}

/** Build state point from dry-bulb + wet-bulb */
export function statePointFromWb(
  tdb: number,
  twb: number,
  label: string,
  description: string,
  p = 101.325,
): PsychoPoint {
  const w = wFromDbWb(tdb, twb, p);
  return statePoint(tdb, w, label, description, p);
}

// ─── Mixing ───────────────────────────────────────────────────────────────────

/**
 * Mix two air streams by mass (m1 kg/s OA + m2 kg/s RA)
 * Returns mixed state point
 */
export function mixAir(
  p1: PsychoPoint, flow1: number,
  p2: PsychoPoint, flow2: number,
  label = 'M', description = 'Mixed Air',
  p = 101.325,
): PsychoPoint {
  const total = flow1 + flow2;
  if (total === 0) return p1;
  const wMix = (p1.w * flow1 + p2.w * flow2) / total;
  const tdbMix = (p1.tdb * flow1 + p2.tdb * flow2) / total;
  return statePoint(tdbMix, wMix, label, description, p);
}

// ─── Sensible Heat Ratio / ADP ────────────────────────────────────────────────

/**
 * Apparatus Dew Point (ADP) — intersection of coil saturation curve
 * and the straight line from entering to leaving air state (extended).
 * Iterative method along the saturation curve.
 */
export function apparatusDewPoint(
  entering: PsychoPoint,
  leaving: PsychoPoint,
  p = 101.325,
): PsychoPoint {
  // Slope of process line in (tdb, W) space
  const dtdb = entering.tdb - leaving.tdb;
  if (Math.abs(dtdb) < 0.01) {
    // Sensible only — ADP on sat curve at leaving DB
    const tAdp = leaving.tdb;
    return statePoint(tAdp, satW(tAdp, p), 'ADP', 'Apparatus Dew Point', p);
  }
  const slope = (entering.w - leaving.w) / dtdb;
  // Find T where satW(T) = entering.w - slope*(entering.tdb - T)
  // i.e. satW(T) = entering.w - slope*(entering.tdb) + slope*T
  let T = leaving.tdp; // start near leaving dew point
  for (let i = 0; i < 80; i++) {
    const wLine = entering.w - slope * (entering.tdb - T);
    const wSat = satW(T, p);
    const f = wSat - wLine;
    const df =
      (satW(T + 0.001, p) - satW(T - 0.001, p)) / 0.002 - slope;
    if (Math.abs(df) < 1e-12) break;
    const dT = f / df;
    T -= dT;
    if (Math.abs(dT) < 1e-5) break;
  }
  return statePoint(T, satW(T, p), 'ADP', 'Apparatus Dew Point', p);
}

/** Contact factor (= 1 − bypass factor) from entering, leaving, ADP */
export function contactFactor(
  entering: PsychoPoint,
  leaving: PsychoPoint,
  adp: PsychoPoint,
): number {
  if (Math.abs(entering.tdb - adp.tdb) < 0.01) return 1;
  return (entering.tdb - leaving.tdb) / (entering.tdb - adp.tdb);
}

// ─── Supply Air Temperature From Loads ───────────────────────────────────────

/**
 * Supply air dry-bulb from sensible cooling and airflow.
 * Q_s = ṁ × c_pa × (T_room − T_supply)
 * ṁ = (Q_supply_m3h / 3600) × density [kg/s]
 */
export function supplyTFromSensible(
  roomDB: number,
  sensibleKw: number,
  supplyM3h: number,
  density = 1.2,
): number {
  if (supplyM3h <= 0) return roomDB - 8;
  const massFlow = (supplyM3h / 3600) * density; // kg/s
  const deltaT = sensibleKw / (massFlow * 1.006);
  return roomDB - deltaT;
}

/**
 * Supply air humidity ratio from room + latent load + airflow.
 * Q_l = ṁ × λ × (W_room − W_supply)  where λ ≈ 2501 kJ/kg
 */
export function supplyWFromLatent(
  roomW: number,
  latentKw: number,
  supplyM3h: number,
  density = 1.2,
): number {
  if (supplyM3h <= 0) return roomW - 0.002;
  const massFlow = (supplyM3h / 3600) * density;
  const deltaW = latentKw / (massFlow * 2501);
  return Math.max(0.002, roomW - deltaW);
}

// ─── Atmospheric Pressure from Elevation ─────────────────────────────────────

/** Standard atmosphere kPa from elevation [m] — ASHRAE Eq. 3 */
export function pressureFromElevation(elevM: number): number {
  return 101.325 * (1 - 2.25577e-5 * elevM) ** 5.2559;
}

// ─── Psychrometric Chart Data ─────────────────────────────────────────────────

/** Generate constant-RH line data for psychrometric chart */
export function rhCurveLine(
  rh: number,
  tMin = -5,
  tMax = 50,
  steps = 60,
  p = 101.325,
): Array<{ tdb: number; w: number }> {
  const pts: Array<{ tdb: number; w: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const tdb = tMin + (i / steps) * (tMax - tMin);
    const w = wFromDbRh(tdb, rh, p) * 1000; // g/kg for display
    if (w >= 0 && w <= 35) pts.push({ tdb, w });
  }
  return pts;
}
