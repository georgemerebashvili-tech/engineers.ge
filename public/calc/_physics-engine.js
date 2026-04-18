// ========================================================================
// engineers.ge - Ventilation Physics Engine v1
// Shared library for calculator simulations and rules references.
// Pure functions only: no DOM, no globals, no side effects.
// ========================================================================

const SECONDS_PER_HOUR = 3600;
const PPM_SCALE = 1e6;
const DEFAULT_AIR_DENSITY_KG_M3 = 1.2;
const DEFAULT_CO_DENSITY_KG_M3 = 1.145;

const FAN_TEMP_POINTS = [
  { temp_c: 20, factor: 1.0 },
  { temp_c: 200, factor: 0.98 },
  { temp_c: 300, factor: 0.95 },
  { temp_c: 400, factor: 0.9 },
  { temp_c: 600, factor: 0.78 },
  { temp_c: 800, factor: 0.62 },
];

/**
 * @param {number} value
 * @param {number} fallback
 * @returns {number}
 */
function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * @param {number} value
 * @returns {number}
 */
function positive(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {Array<{ temp_c: number, factor: number }>} points
 * @param {number} x
 * @returns {number}
 */
function interpolatePiecewise(points, x) {
  if (!points.length) return 1;
  if (x <= points[0].temp_c) return points[0].factor;
  if (x >= points[points.length - 1].temp_c) return points[points.length - 1].factor;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (x > current.temp_c) continue;
    const span = current.temp_c - previous.temp_c;
    const t = span > 0 ? (x - previous.temp_c) / span : 0;
    return previous.factor + (current.factor - previous.factor) * t;
  }

  return points[points.length - 1].factor;
}

/**
 * Effective handle arm from hinge to handle centerline.
 * Georgian note: handleOffset_m ითვლება latch-side clearance-ად.
 * @param {number} width_m
 * @param {number} handleOffset_m
 * @returns {number}
 */
function effectiveHandleArm(width_m, handleOffset_m) {
  const width = positive(width_m);
  const offset = clamp(finiteOr(handleOffset_m, 0.07), 0, width * 0.95);
  return Math.max(width - offset, 0);
}

/**
 * Orifice flow through a crack or opening.
 * Q = Cd * A * sqrt(2 * dp / rho)
 * @param {number} area_m2 Opening area in m^2.
 * @param {number} dp_pa Pressure differential in Pa.
 * @param {number} [cd=0.65] Discharge coefficient.
 * @param {number} [rho=1.2] Air density in kg/m^3.
 * @returns {number} Flow rate in m^3/s.
 * @ref EN 12101-6:2005 Annex A.4 eq (A.7)
 */
export function leakageFlow(area_m2, dp_pa, cd = 0.65, rho = DEFAULT_AIR_DENSITY_KG_M3) {
  const area = positive(area_m2);
  const dp = positive(dp_pa);
  const discharge = positive(cd);
  const density = positive(rho);

  if (!area || !dp || !discharge || !density) return 0;
  return discharge * area * Math.sqrt((2 * dp) / density);
}

/**
 * Sum leakage through multiple parallel openings at the same pressure.
 * @param {Array<{ area: number, cd?: number }>} openings Parallel openings.
 * @param {number} dp_pa Pressure differential in Pa.
 * @returns {number} Total flow in m^3/s.
 * @ref EN 12101-6:2005 Annex A.4 eq (A.7), parallel openings
 */
export function totalLeakage(openings, dp_pa) {
  if (!Array.isArray(openings) || !openings.length) return 0;

  return openings.reduce((sum, opening) => {
    const area = positive(opening?.area);
    const cd = opening?.cd === undefined ? 0.65 : opening.cd;
    return sum + leakageFlow(area, dp_pa, cd);
  }, 0);
}

/**
 * Door opening force under pressure differential.
 * Uses door pressure force (A * dp) and hinge moment balance.
 * @param {number} width_m Door leaf width in m.
 * @param {number} height_m Door leaf height in m.
 * @param {number} dp_pa Pressure differential in Pa.
 * @param {number} [doorcloserForce_N=30] Door closer force in N.
 * @param {number} [handleOffset_m=0.07] Handle offset from latch edge in m.
 * @returns {number} Opening force at handle in N.
 * @ref NFPA 92:2021 Annex A.4.4.4 eq (A.4.4.4a), moment-balance form
 */
export function doorOpeningForce(
  width_m,
  height_m,
  dp_pa,
  doorcloserForce_N = 30,
  handleOffset_m = 0.07,
) {
  const width = positive(width_m);
  const height = positive(height_m);
  const dp = positive(dp_pa);
  const closerForce = Math.max(0, finiteOr(doorcloserForce_N, 30));
  const arm = effectiveHandleArm(width, handleOffset_m);

  if (!width || !height || !arm) return closerForce;

  const area = width * height;
  const pressureComponent = area * dp * width / (2 * arm);
  return closerForce + pressureComponent;
}

/**
 * Max pressure differential for a given door force limit.
 * Inverse of doorOpeningForce().
 * @param {number} width_m Door leaf width in m.
 * @param {number} height_m Door leaf height in m.
 * @param {number} maxForce_N Allowed handle force in N.
 * @param {number} [doorcloserForce_N=30] Door closer force in N.
 * @param {number} [handleOffset_m=0.07] Handle offset from latch edge in m.
 * @returns {number} Maximum pressure differential in Pa.
 * @ref NFPA 92:2021 Annex A.4.4.4 eq (A.4.4.4a), inverted
 */
export function maxDpForDoor(
  width_m,
  height_m,
  maxForce_N,
  doorcloserForce_N = 30,
  handleOffset_m = 0.07,
) {
  const width = positive(width_m);
  const height = positive(height_m);
  const forceLimit = positive(maxForce_N);
  const closerForce = Math.max(0, finiteOr(doorcloserForce_N, 30));
  const arm = effectiveHandleArm(width, handleOffset_m);

  if (!width || !height || !forceLimit || !arm || forceLimit <= closerForce) return 0;

  const area = width * height;
  return ((forceLimit - closerForce) * 2 * arm) / (area * width);
}

/**
 * Air changes per hour from flow and space volume.
 * ACH = Q * 3600 / V
 * @param {number} flow_m3_s Supply or extract flow in m^3/s.
 * @param {number} volume_m3 Zone volume in m^3.
 * @returns {number} Air changes per hour.
 * @ref ASHRAE Fundamentals, ventilation mass-balance conventions
 */
export function airChangeRate(flow_m3_s, volume_m3) {
  const flow = positive(flow_m3_s);
  const volume = positive(volume_m3);
  if (!flow || !volume) return 0;
  return flow * SECONDS_PER_HOUR / volume;
}

/**
 * Required flow rate for a target ACH.
 * Q = ACH * V / 3600
 * @param {number} ach Target air changes per hour.
 * @param {number} volume_m3 Zone volume in m^3.
 * @returns {number} Required flow in m^3/s.
 * @ref ASHRAE Fundamentals, ventilation mass-balance conventions
 */
export function flowFromACH(ach, volume_m3) {
  const airChanges = positive(ach);
  const volume = positive(volume_m3);
  if (!airChanges || !volume) return 0;
  return airChanges * volume / SECONDS_PER_HOUR;
}

/**
 * CO concentration at time t using a first-order mass balance.
 * C(t) = C_eq + (C0 - C_eq) * exp(-Q_vent * t / V)
 * Q_gen is treated as contaminant volume flow in m^3/s.
 * @param {number} co_emission_m3_s CO generation rate in m^3/s.
 * @param {number} volume_m3 Space volume in m^3.
 * @param {number} vent_flow_m3_s Ventilation flow in m^3/s.
 * @param {number} c_initial_ppm Initial concentration in ppm.
 * @param {number} t_seconds Elapsed time in seconds.
 * @returns {number} CO concentration in ppm.
 * @ref ASHRAE Fundamentals Ch. 16, simplified contaminant mass balance
 */
export function coConcentration(
  co_emission_m3_s,
  volume_m3,
  vent_flow_m3_s,
  c_initial_ppm,
  t_seconds,
) {
  const emission = Math.max(0, finiteOr(co_emission_m3_s, 0));
  const volume = positive(volume_m3);
  const ventFlow = Math.max(0, finiteOr(vent_flow_m3_s, 0));
  const initial = Math.max(0, finiteOr(c_initial_ppm, 0)) / PPM_SCALE;
  const time = Math.max(0, finiteOr(t_seconds, 0));

  if (!volume) return 0;

  if (!ventFlow) {
    return (initial + (emission / volume) * time) * PPM_SCALE;
  }

  const equilibrium = emission / ventFlow;
  const concentration = equilibrium + (initial - equilibrium) * Math.exp(-(ventFlow * time) / volume);
  return concentration * PPM_SCALE;
}

/**
 * CO emission rate from vehicle cycles.
 * Typical approximation: grams per cycle -> contaminant volume flow.
 * @param {number} cars_per_hour Vehicle cycles per hour.
 * @param {number} [grams_per_cycle=20] CO emitted per cycle in grams.
 * @param {number} [co_density_kg_m3=1.145] CO density in kg/m^3.
 * @returns {number} CO generation rate in m^3/s.
 * @ref ASHRAE Fundamentals, parking ventilation simplified emission model
 */
export function coEmissionRate(
  cars_per_hour,
  grams_per_cycle = 20,
  co_density_kg_m3 = DEFAULT_CO_DENSITY_KG_M3,
) {
  const cars = Math.max(0, finiteOr(cars_per_hour, 0));
  const grams = Math.max(0, finiteOr(grams_per_cycle, 20));
  const density = positive(co_density_kg_m3);

  if (!cars || !grams || !density) return 0;

  const kgPerSecond = (cars * grams) / 1000 / SECONDS_PER_HOUR;
  return kgPerSecond / density;
}

/**
 * Plume mass flow at height z above fire.
 * m_p = 0.071 * Q_c^(1/3) * z^(5/3) + 0.0018 * Q_c
 * @param {number} Qc_kW Convective heat release in kW.
 * @param {number} z_m Height above virtual origin in m.
 * @returns {number} Plume mass flow in kg/s.
 * @ref SFPE Handbook, Heskestad plume correlation
 */
export function plumeMassFlow(Qc_kW, z_m) {
  const heat = positive(Qc_kW);
  const height = positive(z_m);
  if (!heat || !height) return 0;
  return 0.071 * Math.cbrt(heat) * Math.pow(height, 5 / 3) + 0.0018 * heat;
}

/**
 * Smoke layer interface height from floor using a simple one-zone approach.
 * Georgian note: quick engineering estimate, not CFD.
 * @param {number} Q_kW Total heat release rate in kW.
 * @param {number} area_m2 Room floor area in m^2.
 * @param {number} ceiling_height_m Ceiling height in m.
 * @param {number} t_seconds Elapsed time in seconds.
 * @param {number} [convectiveFraction=0.7] Convective portion of HRR.
 * @param {number} [smoke_density_kg_m3=1] Smoke layer density in kg/m^3.
 * @returns {number} Smoke layer interface height from floor in m.
 * @ref NFPA 92:2021 Annex C.6, one-zone engineering estimate
 */
export function smokeLayerHeight(
  Q_kW,
  area_m2,
  ceiling_height_m,
  t_seconds,
  convectiveFraction = 0.7,
  smoke_density_kg_m3 = 1,
) {
  const heat = positive(Q_kW);
  const area = positive(area_m2);
  const ceilingHeight = positive(ceiling_height_m);
  const time = Math.max(0, finiteOr(t_seconds, 0));
  const convective = clamp(finiteOr(convectiveFraction, 0.7), 0, 1);
  const smokeDensity = positive(smoke_density_kg_m3);

  if (!area || !ceilingHeight || !smokeDensity) return 0;
  if (!heat || !time || !convective) return ceilingHeight;

  const plume = plumeMassFlow(heat * convective, ceilingHeight);
  const smokeVolume = plume * time / smokeDensity;
  const layerDepth = smokeVolume / area;
  return clamp(ceilingHeight - layerDepth, 0, ceilingHeight);
}

/**
 * Elevator piston pressure from car movement inside a shaft.
 * dp = 0.5 * rho * (v * A_car / A_shaft)^2
 * @param {number} car_area_m2 Elevator car frontal area in m^2.
 * @param {number} shaft_area_m2 Shaft cross-section area in m^2.
 * @param {number} velocity_ms Elevator car speed in m/s.
 * @param {number} [rho=1.2] Air density in kg/m^3.
 * @returns {number} Pressure differential in Pa.
 * @ref ASME A17.1 / piston-effect engineering approximation
 */
export function pistonPressure(
  car_area_m2,
  shaft_area_m2,
  velocity_ms,
  rho = DEFAULT_AIR_DENSITY_KG_M3,
) {
  const carArea = positive(car_area_m2);
  const shaftArea = positive(shaft_area_m2);
  const velocity = positive(velocity_ms);
  const density = positive(rho);

  if (!carArea || !shaftArea || !velocity || !density) return 0;

  const velocityRatio = velocity * (carArea / shaftArea);
  return 0.5 * density * velocityRatio * velocityRatio;
}

/**
 * Required supply flow from leakage, open-door flow and safety factor.
 * @param {number} leak_m3_s Leakage flow in m^3/s.
 * @param {number} openDoorFlow_m3_s Open door flow in m^3/s.
 * @param {number} [safety=1.1] Safety multiplier.
 * @returns {number} Required fan flow in m^3/s.
 * @ref EN 12101-6 Annex A, practical fan sizing workflow
 */
export function requiredSupplyFlow(leak_m3_s, openDoorFlow_m3_s, safety = 1.1) {
  const leak = Math.max(0, finiteOr(leak_m3_s, 0));
  const door = Math.max(0, finiteOr(openDoorFlow_m3_s, 0));
  const safetyFactor = positive(safety) || 1;
  return (leak + door) * safetyFactor;
}

/**
 * Fan flow derating at elevated smoke temperature.
 * Piecewise-linear approximation around EN 12101-3 class thresholds.
 * @param {number} flow_ambient Fan flow at ambient conditions in m^3/s.
 * @param {number} temp_c Gas temperature in degC.
 * @returns {number} Available flow in m^3/s.
 * @ref EN 12101-3 temperature classes 200/300/400/600 degC
 */
export function fanTempDerate(flow_ambient, temp_c) {
  const flow = Math.max(0, finiteOr(flow_ambient, 0));
  const temperature = Math.max(0, finiteOr(temp_c, 20));
  if (!flow) return 0;
  return flow * interpolatePiecewise(FAN_TEMP_POINTS, temperature);
}

/**
 * Unit conversion helpers shared by simulators.
 */
export const U = {
  pa_to_inwc: (pa) => finiteOr(pa, 0) * 0.00401463,
  inwc_to_pa: (inwc) => finiteOr(inwc, 0) / 0.00401463,
  m_to_ft: (m) => finiteOr(m, 0) * 3.28084,
  ft_to_m: (ft) => finiteOr(ft, 0) / 3.28084,
  mm_to_in: (mm) => finiteOr(mm, 0) * 0.0393701,
  in_to_mm: (inch) => finiteOr(inch, 0) / 0.0393701,
  ms_to_fpm: (ms) => finiteOr(ms, 0) * 196.85,
  fpm_to_ms: (fpm) => finiteOr(fpm, 0) / 196.85,
  m3s_to_cfm: (m3s) => finiteOr(m3s, 0) * 2118.88,
  cfm_to_m3s: (cfm) => finiteOr(cfm, 0) / 2118.88,
  n_to_lbf: (n) => finiteOr(n, 0) * 0.224809,
  lbf_to_n: (lbf) => finiteOr(lbf, 0) / 0.224809,
  c_to_f: (c) => finiteOr(c, 0) * 9 / 5 + 32,
  f_to_c: (f) => (finiteOr(f, 32) - 32) * 5 / 9,
};

/**
 * Structured standards dataset for simulator UIs and rules pages.
 * Minimal v1 set: EN + NFPA + SP.
 */
export const STANDARDS = {
  'EN-12101-6': {
    id: 'EN-12101-6',
    title: 'Pressure differential systems',
    region: 'EU',
    classes: {
      A: { dp_min: 40, dp_max: 60, dp_default: 50, velocity_min: 0.75, force_max: 100, open_doors: 1, note: 'მხოლოდ ევაკუაცია' },
      B: { dp_min: 40, dp_max: 60, dp_default: 50, velocity_min: 2.0, force_max: 100, open_doors: 2, note: 'ხანძრობრივი სცენარი' },
      C: { dp_min: 40, dp_max: 60, dp_default: 50, velocity_min: 0.75, force_max: 100, open_doors: 1, note: 'სრული ევაკუაცია' },
      D: { dp_min: 10, dp_max: 50, dp_default: 30, velocity_min: 0.75, force_max: 100, open_doors: 1, note: 'საავადმყოფო / საწოლიანი ევაკუაცია' },
      E: { dp_min: 40, dp_max: 60, dp_default: 50, velocity_min: 0.75, force_max: 100, open_doors: 1, note: 'ფაზური ევაკუაცია' },
      F: { dp_min: 40, dp_max: 60, dp_default: 50, velocity_min: 2.0, force_max: 100, open_doors: 1, note: 'სახანძრო გუნდების მუშაობა' },
    },
  },
  'NFPA-92': {
    id: 'NFPA-92',
    title: 'Smoke Control Systems',
    region: 'US',
    classes: {
      'stair-min': { dp_min: 12, dp_max: 50, dp_default: 12, velocity_min: 1.02, force_max: 133, open_doors: 1, note: 'Stairwell minimum pressure' },
      'stair-std': { dp_min: 25, dp_max: 50, dp_default: 37, velocity_min: 1.02, force_max: 133, open_doors: 1, note: 'Typical stairwell design' },
      'stair-max': { dp_min: 50, dp_max: 87, dp_default: 60, velocity_min: 1.02, force_max: 133, open_doors: 1, note: 'Upper practical stairwell range' },
      elevator: { dp_min: 25, dp_max: 62, dp_default: 37, velocity_min: 1.02, force_max: 133, open_doors: 0, note: 'Elevator shaft pressurization' },
      refuge: { dp_min: 12, dp_max: 50, dp_default: 25, velocity_min: 1.02, force_max: 133, open_doors: 0, note: 'Area of refuge pressurization' },
    },
  },
  'SP-7.13130': {
    id: 'SP-7.13130',
    title: 'Supply smoke control ventilation',
    region: 'RU',
    classes: {
      tip1: { dp_min: 20, dp_max: 150, dp_default: 50, velocity_min: 1.3, force_max: 150, open_doors: 1, note: 'Тип 1 / Н1' },
      tip2: { dp_min: 20, dp_max: 150, dp_default: 50, velocity_min: 1.3, force_max: 150, open_doors: 1, note: 'Тип 2 / Н2' },
      tip3: { dp_min: 20, dp_max: 150, dp_default: 50, velocity_min: 1.3, force_max: 150, open_doors: 1, note: 'Тип 3 / Н3' },
      lift: { dp_min: 20, dp_max: 150, dp_default: 50, velocity_min: 1.3, force_max: 150, open_doors: 0, note: 'Лифт шахта' },
      tambur: { dp_min: 20, dp_max: 150, dp_default: 50, velocity_min: 1.3, force_max: 150, open_doors: 1, note: 'Тамбур-шлюз' },
    },
  },
};

/**
 * Formula reference metadata for tooltips and rules documentation.
 */
export const REFS = {
  leakageFlow: { std: 'EN 12101-6:2005', sec: 'Annex A.4', eq: '(A.7)' },
  totalLeakage: { std: 'EN 12101-6:2005', sec: 'Annex A.4', eq: '(A.7)' },
  doorOpeningForce: { std: 'NFPA 92:2021', sec: 'Annex A.4.4.4', eq: '(A.4.4.4a)' },
  maxDpForDoor: { std: 'NFPA 92:2021', sec: 'Annex A.4.4.4', eq: '(A.4.4.4a)' },
  airChangeRate: { std: 'ASHRAE Fundamentals', sec: 'Ventilation mass balance', eq: 'ACH identity' },
  flowFromACH: { std: 'ASHRAE Fundamentals', sec: 'Ventilation mass balance', eq: 'ACH identity' },
  coConcentration: { std: 'ASHRAE Fundamentals Ch. 16', sec: 'Contaminant balance', eq: 'analytic solution' },
  coEmissionRate: { std: 'ASHRAE parking ventilation practice', sec: 'Vehicle emission estimate', eq: 'derived' },
  plumeMassFlow: { std: 'SFPE Handbook', sec: 'Heskestad plume', eq: 'standard correlation' },
  smokeLayerHeight: { std: 'NFPA 92:2021', sec: 'Annex C.6', eq: 'one-zone estimate' },
  pistonPressure: { std: 'ASME A17.1', sec: 'Piston-effect approximation', eq: 'derived' },
  requiredSupplyFlow: { std: 'EN 12101-6', sec: 'Fan sizing workflow', eq: 'engineering sum' },
  fanTempDerate: { std: 'EN 12101-3', sec: 'Temperature classes', eq: 'piecewise approximation' },
};
