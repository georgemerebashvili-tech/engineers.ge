/**
 * Process Overlay — directional hint arrows that show "in which way each
 * common HVAC process moves a state on the psychrometric chart". Used as an
 * educational layer when reviewing AHU section behaviour.
 *
 * Each arrow is anchored at a centre point (chosen near typical comfort
 * range) and rendered as a small SVG line with chevron head. Coordinates are
 * (tdb °C, W g/kg).
 */

export type ProcessOverlayId =
  | 'none'
  | 'sensible'           // Sensible heating + cooling (W = const)
  | 'dehum'              // Pure dehumidification (T = const, W ↓)
  | 'adiabatic'          // Adiabatic humidification (Twb = const)
  | 'heatCoolDehum'      // Combined heat/cool + de/humidification
  | 'all';               // Show every arrow

export interface ProcessArrow {
  /** Stable id for React keys */
  id: string;
  /** Human label drawn next to the arrow */
  label: string;
  /** Tail point (tdb, W g/kg) */
  from: { tdb: number; w: number };
  /** Head point */
  to: { tdb: number; w: number };
  /** Stroke colour (hex / css var); fill of arrowhead matches stroke */
  color: string;
}

const ANCHOR = { tdb: 24, w: 9 };  // chart centre — inside typical comfort

// ── Individual arrows ────────────────────────────────────────────────────────

const sensibleHeating: ProcessArrow = {
  id: 'sensible-heat',
  label: 'Sensible heating',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb + 6, w: ANCHOR.w },
  color: '#c05010',
};

const sensibleCooling: ProcessArrow = {
  id: 'sensible-cool',
  label: 'Sensible cooling',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb - 6, w: ANCHOR.w },
  color: '#1f6fd4',
};

const humidification: ProcessArrow = {
  id: 'humid',
  label: 'Humidification',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb, w: ANCHOR.w + 4 },
  color: '#0f6e3a',
};

const dehumidification: ProcessArrow = {
  id: 'dehum',
  label: 'Dehumidification',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb, w: ANCHOR.w - 4 },
  color: '#7c4ec0',
};

const adiabaticCool: ProcessArrow = {
  id: 'adiab-cool',
  label: 'Adiabatic cooling',
  from: ANCHOR,
  // Twb-constant (slope ≈ −0.6 g/kg per °C in this range)
  to: { tdb: ANCHOR.tdb - 6, w: ANCHOR.w + 3.5 },
  color: '#1a3a6b',
};

const heatPlusHumid: ProcessArrow = {
  id: 'heat-humid',
  label: 'Heat + humidify',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb + 5, w: ANCHOR.w + 3 },
  color: '#a04020',
};

const coolPlusDehum: ProcessArrow = {
  id: 'cool-dehum',
  label: 'Cool + dehumidify',
  from: ANCHOR,
  to: { tdb: ANCHOR.tdb - 5, w: ANCHOR.w - 3 },
  color: '#1f4a8a',
};

// ── Overlays grouped by selector option ──────────────────────────────────────

export const PROCESS_OVERLAYS: Record<
  ProcessOverlayId,
  { label: string; description: string; arrows: ProcessArrow[] }
> = {
  none: {
    label: 'No Process Overlay',
    description: '',
    arrows: [],
  },
  sensible: {
    label: 'Sensible Heating/Cooling',
    description: 'მუდმივი ტენიანობა — მხოლოდ T იცვლება',
    arrows: [sensibleHeating, sensibleCooling],
  },
  dehum: {
    label: 'De/Humidification Only',
    description: 'მუდმივი T — მხოლოდ W იცვლება',
    arrows: [humidification, dehumidification],
  },
  adiabatic: {
    label: 'Adiabatic De/Humidification',
    description: 'Twb = const (evap. cooler / გადახეხვა)',
    arrows: [adiabaticCool],
  },
  heatCoolDehum: {
    label: 'Heat/Cool De/Humidification',
    description: 'კომბინირებული პროცესები (coil/heater/humidifier)',
    arrows: [heatPlusHumid, coolPlusDehum],
  },
  all: {
    label: 'All Processes',
    description: 'ყველა მიმართულება ერთად',
    arrows: [
      sensibleHeating, sensibleCooling,
      humidification, dehumidification,
      adiabaticCool,
      heatPlusHumid, coolPlusDehum,
    ],
  },
};

export function getProcessOverlay(id: ProcessOverlayId) {
  return PROCESS_OVERLAYS[id];
}
