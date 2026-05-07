/**
 * Comfort overlay polygons for the psychrometric chart.
 *
 * Coordinates: tdb [°C] on X axis, W [g/kg dry air] on Y axis.
 * Polygons are vertex-ordered; chart renders as filled SVG <polygon>.
 *
 * Multi-zone overlays (heat index, EN 15251) use `zones[]`: each zone is
 * rendered in order (first = back, last = front) so narrower zones overlay
 * wider ones. The main `vertices` field is the widest/outer zone.
 *
 * Sources:
 *  - Givoni (1992) — simplified bioclimatic chart zones
 *  - ASHRAE 55-2017 §5.3.1: PMV-based comfort polygon in tdb-W space
 *  - EN 15251:2007 / EN 16798-1: 3-category PMV zones
 *  - ISO 7730:2005: PMV ±0.5 comfort polygon
 *  - NOAA Heat Index: 4-level outdoor heat stress zones
 */

export type OverlayId =
  | 'none'
  | 'givoni'
  | 'ashrae55_summer'
  | 'ashrae55_winter'
  | 'en15251'
  | 'iso7730'
  | 'outdoor_heat_index';

export interface ComfortZone {
  label?: string;
  fill: string;
  border: string;
  vertices: { tdb: number; w: number }[];
}

export interface ComfortOverlay {
  id: OverlayId;
  label: string;
  description: string;
  /** Primary (widest/outer) zone fill */
  fill: string;
  border: string;
  /** Primary zone vertices */
  vertices: { tdb: number; w: number }[];
  /** Additional zones rendered on top (front-to-back = first-to-last) */
  zones?: ComfortZone[];
  reference: string;
}

export const COMFORT_OVERLAYS: ComfortOverlay[] = [
  // ─── Givoni Bioclimatic ────────────────────────────────────────────────────
  {
    id: 'givoni',
    label: 'Givoni Bioclimatic',
    description: 'პასიური დიზაინის კომფორტის ზონები (Givoni 1992)',
    fill: 'rgba(15,110,58,0.15)',
    border: 'rgba(15,110,58,0.85)',
    // Core comfort zone: tdb 17–26°C, W 4–16 g/kg (rhombus shape)
    vertices: [
      { tdb: 17, w: 4 },
      { tdb: 26, w: 4 },
      { tdb: 28, w: 12 },
      { tdb: 22, w: 16 },
      { tdb: 17, w: 14 },
    ],
    zones: [
      {
        // Natural ventilation strategy (extends comfort upward)
        label: 'Natural Ventilation',
        fill: 'rgba(34,197,94,0.10)',
        border: 'rgba(15,110,58,0.55)',
        vertices: [
          { tdb: 26, w: 4 },
          { tdb: 34, w: 4 },
          { tdb: 34, w: 14 },
          { tdb: 28, w: 18 },
          { tdb: 22, w: 16 },
          { tdb: 28, w: 12 },
        ],
      },
      {
        // Evaporative cooling zone (extends toward dry-hot)
        label: 'Evaporative Cooling',
        fill: 'rgba(56,189,248,0.12)',
        border: 'rgba(14,165,233,0.5)',
        vertices: [
          { tdb: 26, w: 4 },
          { tdb: 40, w: 4 },
          { tdb: 40, w: 8 },
          { tdb: 34, w: 14 },
          { tdb: 34, w: 4 },
        ],
      },
      {
        // Thermal mass / passive cooling (high T, moderate W)
        label: 'Mass Cooling',
        fill: 'rgba(251,191,36,0.12)',
        border: 'rgba(217,119,6,0.5)',
        vertices: [
          { tdb: 28, w: 12 },
          { tdb: 34, w: 14 },
          { tdb: 38, w: 14 },
          { tdb: 38, w: 20 },
          { tdb: 30, w: 20 },
        ],
      },
      {
        // Passive solar / heating zone (cool temperatures)
        label: 'Passive Solar',
        fill: 'rgba(249,115,22,0.10)',
        border: 'rgba(234,88,12,0.5)',
        vertices: [
          { tdb: 5,  w: 2 },
          { tdb: 17, w: 2 },
          { tdb: 17, w: 4 },
          { tdb: 17, w: 14 },
          { tdb: 10, w: 8 },
          { tdb: 5,  w: 6 },
        ],
      },
    ],
    reference: 'Givoni (1992) — Bioclimatic chart',
  },

  // ─── ASHRAE 55-2017 Summer ────────────────────────────────────────────────
  {
    id: 'ashrae55_summer',
    label: 'ASHRAE 55 — ზაფხული (0.5 clo)',
    description: 'PMV-based comfort, sedentary, summer clothing. Max W = 12 g/kg.',
    fill: 'rgba(31,111,212,0.20)',
    border: 'rgba(31,111,212,0.9)',
    // Parallelogram following PMV ±0.5 iso-lines; slant ≈ −0.17 °C per g/kg.
    // At W=0: T_op 23.5–28.5 °C (0.5 clo, met=1, va=0.2 m/s, MRT≈T_db)
    // At W=12: shifts left ~2 °C → 21.5–26.5 °C
    vertices: [
      { tdb: 23.5, w: 0 },
      { tdb: 28.5, w: 0 },
      { tdb: 26.5, w: 12 },
      { tdb: 21.5, w: 12 },
    ],
    reference: 'ASHRAE 55-2017 §5.3.1 (PMV ±0.5)',
  },

  // ─── ASHRAE 55-2017 Winter ────────────────────────────────────────────────
  {
    id: 'ashrae55_winter',
    label: 'ASHRAE 55 — ზამთარი (1.0 clo)',
    description: 'PMV-based comfort, sedentary, winter clothing. Max W = 12 g/kg.',
    fill: 'rgba(192,80,16,0.20)',
    border: 'rgba(192,80,16,0.9)',
    // 1.0 clo shifts zone ~3 °C cooler vs summer.
    // At W=0: 20.5–25.5 °C; at W=12: 18.5–23.5 °C
    vertices: [
      { tdb: 20.5, w: 0 },
      { tdb: 25.5, w: 0 },
      { tdb: 23.5, w: 12 },
      { tdb: 18.5, w: 12 },
    ],
    reference: 'ASHRAE 55-2017 §5.3.1 (PMV ±0.5)',
  },

  // ─── EN 15251 / EN 16798-1 — 3 categories ────────────────────────────────
  {
    id: 'en15251',
    label: 'EN 15251 — Cat I/II/III',
    description: '3 კატეგორია — Cat III (PMV ±0.7) → Cat II (±0.5) → Cat I (±0.2)',
    fill: 'rgba(34,197,94,0.12)',
    border: 'rgba(21,128,61,0.60)',
    // Cat III (widest, outermost): PMV ±0.7 — at W=0: T 17–26 °C
    vertices: [
      { tdb: 17.0, w: 0 },
      { tdb: 26.0, w: 0 },
      { tdb: 24.0, w: 12 },
      { tdb: 15.0, w: 12 },
    ],
    zones: [
      {
        // Cat II: PMV ±0.5 — standard office
        label: 'Cat II (PMV ±0.5)',
        fill: 'rgba(34,197,94,0.22)',
        border: 'rgba(21,128,61,0.70)',
        vertices: [
          { tdb: 19.0, w: 0 },
          { tdb: 25.0, w: 0 },
          { tdb: 23.0, w: 12 },
          { tdb: 17.0, w: 12 },
        ],
      },
      {
        // Cat I: PMV ±0.2 — high-standard
        label: 'Cat I (PMV ±0.2)',
        fill: 'rgba(34,197,94,0.42)',
        border: 'rgba(21,128,61,0.90)',
        vertices: [
          { tdb: 21.0, w: 0 },
          { tdb: 23.0, w: 0 },
          { tdb: 21.5, w: 12 },
          { tdb: 19.5, w: 12 },
        ],
      },
    ],
    reference: 'EN 15251:2007 / EN 16798-1',
  },

  // ─── ISO 7730:2005 PMV ±0.5 ───────────────────────────────────────────────
  {
    id: 'iso7730',
    label: 'ISO 7730 PMV ±0.5',
    description: 'Predicted Mean Vote ±0.5 (sedentary, 1.0 clo, met=1.0)',
    fill: 'rgba(202,130,64,0.22)',
    border: 'rgba(202,130,64,0.95)',
    // Base case: 1.0 clo, 1.0 met, va=0.10 m/s, MRT=20 °C
    // At W=0: T 20–25 °C; at W=12: 18–23 °C (similar to ASHRAE 55 winter)
    vertices: [
      { tdb: 20.0, w: 0 },
      { tdb: 25.0, w: 0 },
      { tdb: 23.0, w: 12 },
      { tdb: 18.0, w: 12 },
    ],
    reference: 'ISO 7730:2005',
  },

  // ─── Outdoor Work Heat Index — 4 NOAA zones ───────────────────────────────
  {
    id: 'outdoor_heat_index',
    label: 'Outdoor Heat Index',
    description: 'NOAA/NIOSH: Caution → Extreme Caution → Danger → Extreme Danger',
    // Zone 1 (back-most): Caution — HI ≥ 27 °C; everything T ≥ 27
    fill: 'rgba(255,240,80,0.38)',
    border: 'rgba(0,0,0,0)',
    vertices: [
      { tdb: 27, w: 0  },
      { tdb: 45, w: 0  },
      { tdb: 45, w: 28 },
      { tdb: 27, w: 28 },
    ],
    zones: [
      {
        // Extreme Caution — HI ≥ 32 °C
        // Boundary: at low W it starts ~T=32; shifts left at high W (~T=28 at W=20)
        label: 'Extreme Caution (HI ≥ 32°C)',
        fill: 'rgba(255,165,0,0.48)',
        border: 'rgba(0,0,0,0)',
        vertices: [
          { tdb: 32, w: 0  },
          { tdb: 45, w: 0  },
          { tdb: 45, w: 28 },
          { tdb: 28, w: 28 },
          { tdb: 29, w: 20 },
          { tdb: 30, w: 14 },
          { tdb: 31, w: 8  },
          { tdb: 32, w: 4  },
        ],
      },
      {
        // Danger — HI ≥ 41 °C
        // At low W: ~T=36; at high W: ~T=32-33
        label: 'Danger (HI ≥ 41°C)',
        fill: 'rgba(220,80,20,0.55)',
        border: 'rgba(0,0,0,0)',
        vertices: [
          { tdb: 36, w: 0  },
          { tdb: 45, w: 0  },
          { tdb: 45, w: 28 },
          { tdb: 32, w: 28 },
          { tdb: 33, w: 22 },
          { tdb: 35, w: 14 },
          { tdb: 36, w: 6  },
        ],
      },
      {
        // Extreme Danger — HI ≥ 54 °C
        // At low W: ~T=42; at high W: ~T=37-38
        label: 'Extreme Danger (HI ≥ 54°C)',
        fill: 'rgba(200,20,20,0.68)',
        border: 'rgba(0,0,0,0)',
        vertices: [
          { tdb: 42, w: 0  },
          { tdb: 45, w: 0  },
          { tdb: 45, w: 28 },
          { tdb: 37, w: 28 },
          { tdb: 38, w: 22 },
          { tdb: 40, w: 14 },
          { tdb: 42, w: 6  },
        ],
      },
    ],
    reference: 'NOAA/NIOSH Heat Stress Index',
  },
];

export function getOverlay(id: OverlayId): ComfortOverlay | null {
  if (id === 'none') return null;
  return COMFORT_OVERLAYS.find((o) => o.id === id) ?? null;
}

// ─── PMV parameters → dynamic polygon adjustment ─────────────────────────────

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
 * Adjust comfort polygon vertices using PMV parameter sensitivities.
 * Applies only to the primary `vertices`; `zones` are not adjusted
 * (heat index and multi-category overlays are physically fixed).
 */
export function adjustOverlayForPmv(
  base: ComfortOverlay,
  params: ComfortParams,
): ComfortOverlay {
  const { airVelocity, clo, met, mrt } = params;
  const refClo = 1.00, refMet = 1.00, refV = 0.10, refMrt = 20.0;

  const dtClo = (clo  - refClo) * -3.0;
  const dtMrt = (mrt  - refMrt) * -0.5;
  const dtMet = (met  - refMet) *  1.5;
  const dtVelHigh = (airVelocity - refV) * 2.5;

  const adjusted = base.vertices.map((v, idx) => {
    const isWarmEdge = idx === 1 || idx === 2;
    const shift = dtClo + dtMrt + dtMet + (isWarmEdge ? dtVelHigh : 0);
    return { tdb: v.tdb + shift, w: v.w };
  });

  return { ...base, vertices: adjusted };
}
