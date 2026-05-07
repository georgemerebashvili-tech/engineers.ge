// Fan curve math — polynomial evaluation, working-point solver,
// density correction, affinity laws.
//
// Convention from AFL data:
//   - Volume V is in m³/h.
//   - Pressure curve is at standard density ρ₀ = 1.204 kg/m³ (20 °C, sea level).
//     Static pressure scales linearly with density: ΔP(ρ) = ΔP(ρ₀) · ρ / ρ₀.
//   - Dynamic pressure at the impeller calculating diameter:
//       v = (V/3600) / A     where A = π·D²/4  (D in m)
//       ΔPdyn = ½·ρ·v²
//
// All polynomials are 3rd degree: y(V) = c0 + c1·V + c2·V² + c3·V³.

import type {
  Coefficients,
  FanCurveStep,
  FanModel,
  MediumState,
  OperatingPoint,
} from './types';

export const RHO_STD = 1.204; // kg/m³ at 20 °C, 101.325 kPa

export function evalPoly(coef: Coefficients, V: number): number {
  let y = 0;
  for (let i = 0; i < coef.length; i++) y += coef[i] * Math.pow(V, i);
  return y;
}

// Air density from temperature (°C) and pressure (kPa) — ideal-gas approximation
// for dry air (R = 287.058 J/(kg·K)).
export function airDensity(tempC: number, pressureKPa = 101.325): number {
  const T = tempC + 273.15;
  const P = pressureKPa * 1000;
  return P / (287.058 * T);
}

// Dynamic pressure at fan outlet using calculating diameter (mm).
export function dynamicPressure(volumeM3h: number, diameterMm: number, density: number) {
  const D = diameterMm / 1000;                 // m
  const A = Math.PI * D * D / 4;               // m²
  const v = (volumeM3h / 3600) / A;            // m/s
  const dp = 0.5 * density * v * v;            // Pa
  return { velocity: v, pressureDynamic: dp };
}

// Solve fan curve ↔ system curve intersection.
// System curve: ΔPsys(V) = k · V²,  k = ΔP_design / V_design²
// Fan curve (corrected to operating density):
//   ΔPfan(V) = polyEval(coef, V) · ρ/ρ₀
// Returns the volume where the two curves meet inside [graphMin, graphMax].
export function solveSystemIntersection(params: {
  curve: FanCurveStep;
  density: number;
  designVolume: number;
  designPressure: number;
  resolution?: number;
}): number | null {
  const { curve, density, designVolume, designPressure, resolution = 2000 } = params;
  if (designVolume <= 0 || designPressure <= 0) return null;
  const k = designPressure / (designVolume * designVolume);
  const ratio = density / RHO_STD;

  const f = (V: number) =>
    evalPoly(curve.coefficients.pressureStatic, V) * ratio - k * V * V;

  const lo = Math.max(curve.graphMin, 1e-3);
  const hi = curve.graphMax;
  const step = (hi - lo) / resolution;

  let prevV = lo;
  let prevF = f(prevV);
  for (let i = 1; i <= resolution; i++) {
    const v = lo + step * i;
    const fv = f(v);
    if (prevF === 0) return prevV;
    if (prevF * fv < 0) {
      // linear interpolate
      return prevV + (-prevF) * (v - prevV) / (fv - prevF);
    }
    prevV = v;
    prevF = fv;
  }
  return null;
}

// Pick the curve step that delivers the design (V, ΔPst) — i.e. the lowest
// step where the curve's static pressure at V_design is ≥ ΔPst_design.
// Density-corrected. Falls back to the main (max) curve if none qualifies.
export function pickOptimalStep(
  model: FanModel,
  volume: number,
  pressureStatic: number,
  density: number = RHO_STD,
): FanCurveStep {
  const ratio = density / RHO_STD;
  const candidates = model.curves
    .filter((c) => volume >= c.graphMin && volume <= c.graphMax)
    .map((c) => ({
      step: c,
      dp: evalPoly(c.coefficients.pressureStatic, volume) * ratio,
    }))
    .filter((x) => x.dp >= pressureStatic)
    .sort((a, b) => a.dp - b.dp);

  if (candidates.length) return candidates[0].step;
  return model.curves.find((c) => c.main) ?? model.curves[0];
}

// Compute full operating point at (V, ΔPst_required) on a given curve step,
// corrected for medium density.
export function computeOperatingPoint(params: {
  model: FanModel;
  curve: FanCurveStep;
  volume: number;
  density: number;
  isTotalPressure?: boolean;       // true = user provides ΔPtotal, false = ΔPstatic
  pressureTarget?: number;          // Pa (only needed for SFP / display)
}): OperatingPoint {
  const { model, curve, volume, density, isTotalPressure = false } = params;
  const ratio = density / RHO_STD;
  const D = model.spec.diameterCalculating ?? model.spec.diameter ?? 190;

  const pStaticFan = evalPoly(curve.coefficients.pressureStatic, volume) * ratio;
  const power      = evalPoly(curve.coefficients.power,          volume);
  const speed      = evalPoly(curve.coefficients.speed,          volume);
  const current    = evalPoly(curve.coefficients.current,        volume);

  const { velocity, pressureDynamic } = dynamicPressure(volume, D, density);

  // If the caller provided ΔPtotal as the design constraint, the fan curve
  // already produces ΔPstatic = ΔPtotal − ΔPdyn at the duty point.
  const pStatic = isTotalPressure ? pStaticFan - pressureDynamic : pStaticFan;
  const pTotal  = pStatic + pressureDynamic;

  const Q = volume / 3600; // m³/s
  const efficiencyStatic = power > 0 ? (Q * pStatic / power) * 100 : 0;
  const efficiencyTotal  = power > 0 ? (Q * pTotal  / power) * 100 : 0;
  const sfp = Q > 0 ? power / Q : 0; // W/(m³/s)

  return {
    volume,
    pressureStatic: pStatic,
    pressureTotal: pTotal,
    pressureDynamic,
    velocity,
    speed,
    power,
    current,
    efficiencyStatic,
    efficiencyTotal,
    sfp,
    curveLabel: curve.label,
  };
}

// Find the volume on a curve where static efficiency is maximum.
// Uses sampling — sufficient for visualization (1000 points across range).
export function findMaxEfficiencyPoint(params: {
  model: FanModel;
  curve: FanCurveStep;
  density: number;
}): OperatingPoint | null {
  const { model, curve, density } = params;
  const lo = Math.max(curve.graphMin, 1);
  const hi = curve.graphMax;
  if (hi <= lo) return null;

  let bestV = lo;
  let bestEta = -Infinity;
  const N = 1000;
  for (let i = 0; i <= N; i++) {
    const v = lo + ((hi - lo) * i) / N;
    const op = computeOperatingPoint({ model, curve, volume: v, density });
    if (op.efficiencyStatic > bestEta) {
      bestEta = op.efficiencyStatic;
      bestV = v;
    }
  }
  return computeOperatingPoint({ model, curve, volume: bestV, density });
}

// Sample a curve as N points — for chart rendering.
export function sampleCurve(params: {
  curve: FanCurveStep;
  density: number;
  field: 'pressureStatic' | 'power' | 'speed' | 'current';
  points?: number;
}): { volume: number; value: number }[] {
  const { curve, density, field, points = 60 } = params;
  const ratio = field === 'pressureStatic' ? density / RHO_STD : 1;
  const lo = curve.graphMin;
  const hi = curve.graphMax;
  const out: { volume: number; value: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const v = lo + ((hi - lo) * i) / points;
    const value = evalPoly(curve.coefficients[field], v) * ratio;
    out.push({ volume: v, value });
  }
  return out;
}

// Sample static efficiency along a curve.
export function sampleEfficiency(params: {
  model: FanModel;
  curve: FanCurveStep;
  density: number;
  points?: number;
}): { volume: number; value: number }[] {
  const { model, curve, density, points = 60 } = params;
  const lo = Math.max(curve.graphMin, 1);
  const hi = curve.graphMax;
  const out: { volume: number; value: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const v = lo + ((hi - lo) * i) / points;
    const op = computeOperatingPoint({ model, curve, volume: v, density });
    out.push({ volume: v, value: Math.max(0, op.efficiencyStatic) });
  }
  return out;
}
