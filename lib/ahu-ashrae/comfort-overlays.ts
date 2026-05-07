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
