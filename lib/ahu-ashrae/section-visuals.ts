/**
 * UI metadata for section types — colors, icons, default widths for the 3D box.
 * Pure / serializable; no React imports.
 */

import type { SectionType, SectionConfig, SlotPosition } from './sections';

export interface SectionVisual {
  /** Hex color used for the 3D box face and chart marker */
  color: string;
  /** 3D box width along the air path (m) */
  width3D: number;
  /** Short Georgian label shown when no user label set */
  defaultLabel: string;
  /** lucide-react icon name (string — UI resolves) */
  iconName: string;
  /** Approximate component weight (kg) — typical AHU section internals only;
   *  casing/frame is added separately from total length. */
  weightKg: number;
}

export const SECTION_VISUALS: Record<SectionType, SectionVisual> = {
  damper:        { color: '#9aaccc', width3D: 0.30, defaultLabel: 'დემპერი',         iconName: 'PanelTopOpen',   weightKg: 12 },
  filter:        { color: '#a8c6e8', width3D: 0.40, defaultLabel: 'ფილტრი',          iconName: 'Filter',         weightKg: 14 },
  mixing_box:    { color: '#b8b0d0', width3D: 0.50, defaultLabel: 'შერევის ყუთი',    iconName: 'Shuffle',        weightKg: 28 },
  heat_recovery: { color: '#5a8fc4', width3D: 0.80, defaultLabel: 'რეკუპერატორი',    iconName: 'ArrowLeftRight', weightKg: 90 },
  preheat:       { color: '#e89060', width3D: 0.35, defaultLabel: 'წინა გათბობა',    iconName: 'Flame',          weightKg: 22 },
  cooling_coil:  { color: '#5fa8d8', width3D: 0.50, defaultLabel: 'გამაგრილებელი',  iconName: 'Snowflake',      weightKg: 38 },
  reheat:        { color: '#e07050', width3D: 0.40, defaultLabel: 'უკანა გათბობა',  iconName: 'Flame',          weightKg: 22 },
  humidifier:    { color: '#7cc4d8', width3D: 0.40, defaultLabel: 'გამატენიანებელი', iconName: 'Droplet',        weightKg: 20 },
  fan:           { color: '#8a99b8', width3D: 0.60, defaultLabel: 'ვენტილატორი',    iconName: 'Fan',            weightKg: 55 },
  silencer:      { color: '#c0c8d4', width3D: 0.35, defaultLabel: 'ხმოვანი დამცავი', iconName: 'Volume2',        weightKg: 18 },
};

/** Galvanized double-skin AHU casing/frame weight per linear metre (typical
 *  1.2 m × 1.2 m cross-section AHU). */
export const CASING_KG_PER_M = 80;

// ─── Slot position rules ───────────────────────────────────────────────────────

export interface SlotRule {
  /** Default position when no explicit slotPosition is set */
  default: SlotPosition;
  /** Which positions are physically valid for this component type */
  allowed: SlotPosition[];
  /** Override default by filter form (for filter type only) */
  formOverrides?: Partial<Record<string, SlotPosition>>;
}

export const SLOT_RULES: Record<SectionType, SlotRule> = {
  // Damper: a flat blade array — sits at inlet face (left) or outlet face (right)
  damper:        { default: 'left',   allowed: ['left', 'right'] },
  // Filter: depends on form. Bag/pocket faces upstream (left); panel spans full face (center)
  filter:        { default: 'center', allowed: ['left', 'center', 'right'],
                   formOverrides: { bag: 'left', pleated: 'left' } },
  // Mixing box / coils / HR: full cross-section contact required → center only
  mixing_box:    { default: 'center', allowed: ['center'] },
  heat_recovery: { default: 'center', allowed: ['center'] },
  preheat:       { default: 'center', allowed: ['center'] },
  cooling_coil:  { default: 'center', allowed: ['center'] },
  reheat:        { default: 'center', allowed: ['center'] },
  // Humidifier: spray nozzle header typically at right (downstream side)
  humidifier:    { default: 'right',  allowed: ['center', 'right'] },
  // Fan: always centered in casing
  fan:           { default: 'center', allowed: ['center'] },
  // Silencer: baffle pack usually at inlet side of section
  silencer:      { default: 'left',   allowed: ['left', 'center'] },
};

/** Compute the effective slot for a section, accounting for filter form overrides. */
export function getDefaultSlot(section: SectionConfig): SlotPosition {
  const rule = SLOT_RULES[section.spec.type];
  if (section.spec.type === 'filter') {
    const form = (section.spec.params as { form?: string }).form ?? 'panel';
    return rule.formOverrides?.[form] ?? rule.default;
  }
  return rule.default;
}

/** Default params factory for adding a new section of a given type. */
export function makeDefaultParams(type: SectionType): unknown {
  switch (type) {
    case 'damper':        return { openFraction: 1, baseDeltaP: 20 };
    case 'filter':        return { filterClass: 'G4', form: 'panel', useAverageDeltaP: true };
    case 'mixing_box':    return { outsideAirFraction: 0.3 };
    case 'heat_recovery': return { hrType: 'crossflow_plate', sensibleEff: 0.65, latentEff: 0, deltaP: 100 };
    case 'preheat':       return { source: 'hot_water', targetTdb: 5, deltaP: 50 };
    case 'cooling_coil':  return { source: 'chw', targetTdb: 14, bypassFactor: 0.10, apparatusDewPoint: 10, deltaP: 150 };
    case 'reheat':        return { source: 'hot_water', targetTdb: 18, deltaP: 60 };
    case 'humidifier':    return { humType: 'steam', targetRh: 0.45, deltaP: 25 };
    case 'fan':           return { position: 'supply', externalDeltaP: 200, motorHeatFraction: 0.85, fanEff: 0.65, motorEff: 0.92 };
    case 'silencer':      return { deltaP: 30 };
  }
}
