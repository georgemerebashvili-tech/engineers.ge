/**
 * Comfort overlay polygons for the psychrometric chart.
 *
 * Coordinates: tdb [°C] on X axis, W [g/kg dry air] on Y axis.
 * Polygons are vertex-ordered (clockwise); chart renders as filled SVG <polygon>.
 *
 * Sources:
 *  - Givoni: simplified bioclimatic chart core comfort zone.
 *  - ASHRAE 55-2017: PMV-based comfort, sedentary office (met=1.1, clo as noted)
 *    with operative-temp ≈ T_db assumption (no asymmetric radiant).
 *  - EN 15251 Cat II: typical office, similar to ASHRAE 55 but slightly looser.
 *  - ISO 7730 PMV ±0.5: identical envelope to ASHRAE 55 in core conditions.
 *  - Outdoor Heat Index: NIOSH/OSHA caution zone start.
 *
 * These are approximations — the real envelopes depend on operative temp,
 * clothing, met rate. Good enough as visual guides; flag in tooltip.
 */

export type OverlayId =
  | 'none'
  | 'givoni'
  | 'ashrae55_summer'
  | 'ashrae55_winter'
  | 'en15251'
  | 'iso7730'
  | 'outdoor_heat_index';

export interface ComfortOverlay {
  id: OverlayId;
  label: string;
  description: string;
  /** 8-digit hex with alpha for fill */
  fill: string;
  /** opaque border color */
  border: string;
  /** Polygon vertices (clockwise, last connects to first) */
  vertices: { tdb: number; w: number }[];
  reference: string;
}

export const COMFORT_OVERLAYS: ComfortOverlay[] = [
  {
    id: 'givoni',
    label: 'Givoni Bioclimatic',
    description: 'პასიური დიზაინის კომფორტის ბირთვი (Givoni)',
    fill: 'rgba(15, 110, 58, 0.10)',
    border: 'rgba(15, 110, 58, 0.7)',
    vertices: [
      { tdb: 20, w: 4 },
      { tdb: 26, w: 4 },
      { tdb: 26, w: 12 },
      { tdb: 20, w: 12 },
    ],
    reference: 'Givoni (1992) — Bioclimatic chart',
  },
  {
    id: 'ashrae55_summer',
    label: 'ASHRAE 55 — ზაფხული (0.5 clo)',
    description: 'PMV-based comfort, sedentary, summer clothing',
    fill: 'rgba(31, 111, 212, 0.10)',
    border: 'rgba(31, 111, 212, 0.7)',
    vertices: [
      { tdb: 23.5, w: 4 },
      { tdb: 28.0, w: 4 },
      { tdb: 27.0, w: 12 },
      { tdb: 24.5, w: 12 },
    ],
    reference: 'ASHRAE 55-2017 §5.3.1 (PMV ±0.5)',
  },
  {
    id: 'ashrae55_winter',
    label: 'ASHRAE 55 — ზამთარი (1.0 clo)',
    description: 'PMV-based comfort, sedentary, winter clothing',
    fill: 'rgba(192, 80, 16, 0.10)',
    border: 'rgba(192, 80, 16, 0.7)',
    vertices: [
      { tdb: 19.0, w: 2 },
      { tdb: 24.0, w: 2 },
      { tdb: 23.5, w: 10 },
      { tdb: 20.0, w: 10 },
    ],
    reference: 'ASHRAE 55-2017 §5.3.1 (PMV ±0.5)',
  },
  {
    id: 'en15251',
    label: 'EN 15251 Cat II',
    description: 'Typical office — slightly looser than ASHRAE 55',
    fill: 'rgba(124, 78, 192, 0.10)',
    border: 'rgba(124, 78, 192, 0.7)',
    vertices: [
      { tdb: 20, w: 3 },
      { tdb: 28, w: 3 },
      { tdb: 27, w: 12 },
      { tdb: 21, w: 12 },
    ],
    reference: 'EN 15251:2007 / EN 16798-1',
  },
  {
    id: 'iso7730',
    label: 'ISO 7730 PMV ±0.5',
    description: 'Predicted Mean Vote, comparable to ASHRAE 55',
    fill: 'rgba(202, 130, 64, 0.08)',
    border: 'rgba(202, 130, 64, 0.6)',
    vertices: [
      { tdb: 21, w: 3 },
      { tdb: 27, w: 3 },
      { tdb: 26, w: 11 },
      { tdb: 22, w: 11 },
    ],
    reference: 'ISO 7730:2005',
  },
  {
    id: 'outdoor_heat_index',
    label: 'Outdoor Heat — caution',
    description: 'NIOSH/OSHA caution-zone start (heat stress risk)',
    fill: 'rgba(220, 60, 30, 0.08)',
    border: 'rgba(220, 60, 30, 0.5)',
    vertices: [
      { tdb: 27, w: 8 },
      { tdb: 40, w: 8 },
      { tdb: 38, w: 25 },
      { tdb: 27, w: 25 },
    ],
    reference: 'NIOSH/OSHA Heat Stress Index',
  },
];

export function getOverlay(id: OverlayId): ComfortOverlay | null {
  if (id === 'none') return null;
  return COMFORT_OVERLAYS.find((o) => o.id === id) ?? null;
}

// ─── PMV parameters → dynamic polygon adjustment ─────────────────────────────

/**
 * User-tuneable comfort parameters (Fanger / ISO 7730 inputs).
 */
export interface ComfortParams {
  /** Air velocity [m/s] — 0.0–1.5 typical indoor range */
  airVelocity: number;
  /** Clothing level [clo] — 0.5 (summer t-shirt) … 1.5 (heavy suit) */
  clo: number;
  /** Metabolic rate [met] — 1.0 (sedentary) … 2.0 (walking) */
  met: number;
  /** Mean Radiant Temperature [°C] — equal to T_db when no asymmetric radiation */
  mrt: number;
}

export const DEFAULT_COMFORT_PARAMS: ComfortParams = {
  airVelocity: 0.20,
  clo: 1.00,
  met: 1.00,
  mrt: 20.0,
};

/** Air velocity descriptor (matches Daikin viewer hints) */
export function describeAirVelocity(v: number): string {
  if (v < 0.10) return 'Unnoticeably still';
  if (v < 0.25) return 'Unnoticeably still';
  if (v < 0.50) return 'Lightly perceptible';
  if (v < 0.80) return 'Pleasantly noticeable';
  if (v < 1.20) return 'Noticeable breeze';
  return 'Strong breeze';
}

export function describeClo(clo: number): string {
  if (clo < 0.40) return 'Underwear / very light';
  if (clo < 0.60) return 'Light summer (t-shirt + shorts)';
  if (clo < 0.85) return 'Typical office (trousers + shirt)';
  if (clo < 1.10) return 'Business suit or casual with sweater';
  if (clo < 1.40) return 'Heavy business suit';
  return 'Heavy winter clothing';
}

export function describeMet(met: number): string {
  if (met < 0.90) return 'Sleeping / reclining';
  if (met < 1.10) return 'Seated with sedentary activity';
  if (met < 1.40) return 'Standing / light office';
  if (met < 1.80) return 'Walking slowly / light work';
  if (met < 2.30) return 'Walking briskly / moderate work';
  return 'Heavy physical work';
}

export function describeMrt(mrt: number): string {
  if (mrt < 16) return 'Cold surfaces (poor insulation)';
  if (mrt < 19) return 'Slightly cool surroundings';
  if (mrt < 23) return 'Normal room temperature';
  if (mrt < 27) return 'Warm surroundings';
  return 'Hot radiant load (sun / equipment)';
}

/**
 * Adjust a base comfort polygon (ASHRAE/ISO/EN-style rectangle in tdb–W
 * space) using PMV parameters. The shifts come from Fanger's equation
 * sensitivities — increased clo / mrt → cooler comfort range, increased
 * met / air velocity → warmer-end tolerance.
 *
 * Not a rigorous Fanger solve — a linearised approximation valid for
 * small deviations from the ISO 7730 base case (clo=1.0, met=1.0,
 * v=0.10 m/s, MRT=20°C).
 */
export function adjustOverlayForPmv(
  base: ComfortOverlay,
  params: ComfortParams,
): ComfortOverlay {
  const { airVelocity, clo, met, mrt } = params;
  // Reference case used for the static polygons in COMFORT_OVERLAYS
  const refClo = 1.00;
  const refMet = 1.00;
  const refV = 0.10;
  const refMrt = 20.0;

  // Approximate sensitivities (ISO 7730 Annex B / Fanger 1970, °C per unit):
  //   ΔTcomfort ≈ −3.0 × Δclo  − 0.7 × ΔMRT/MRTref ... simplified:
  //   −3 °C per +1 clo, −0.5 °C per +1°C MRT, +1.5 °C per +1 met,
  //   +2.5 °C per +1 m/s air velocity (only on warm side).
  const dtClo = (clo - refClo) * -3.0;
  const dtMrt = (mrt - refMrt) * -0.5;
  const dtMet = (met - refMet) * 1.5;
  const dtVelLow = 0;
  const dtVelHigh = (airVelocity - refV) * 2.5; // expands warm boundary only

  const adjusted = base.vertices.map((v, idx) => {
    // Vertices are ordered: 0 cool-low W, 1 warm-low W, 2 warm-high W, 3 cool-high W
    const isWarmEdge = idx === 1 || idx === 2;
    const isCoolEdge = idx === 0 || idx === 3;
    const shift =
      dtClo + dtMrt + dtMet +
      (isWarmEdge ? dtVelHigh : 0) +
      (isCoolEdge ? dtVelLow : 0);
    return { tdb: v.tdb + shift, w: v.w };
  });

  return { ...base, vertices: adjusted };
}
