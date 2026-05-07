/**
 * UI metadata for section types — colors, icons, default widths for the 3D box.
 * Pure / serializable; no React imports.
 */

import type { SectionType } from './sections';

export interface SectionVisual {
  /** Hex color used for the 3D box face and chart marker */
  color: string;
  /** 3D box width along the air path (m) */
  width3D: number;
  /** Short Georgian label shown when no user label set */
  defaultLabel: string;
  /** lucide-react icon name (string — UI resolves) */
  iconName: string;
}

export const SECTION_VISUALS: Record<SectionType, SectionVisual> = {
  damper:        { color: '#9aaccc', width3D: 0.30, defaultLabel: 'დემპერი',         iconName: 'PanelTopOpen' },
  filter:        { color: '#a8c6e8', width3D: 0.40, defaultLabel: 'ფილტრი',          iconName: 'Filter' },
  mixing_box:    { color: '#b8b0d0', width3D: 0.50, defaultLabel: 'შერევის ყუთი',    iconName: 'Shuffle' },
  heat_recovery: { color: '#5a8fc4', width3D: 0.80, defaultLabel: 'რეკუპერატორი',    iconName: 'ArrowLeftRight' },
  preheat:       { color: '#e89060', width3D: 0.35, defaultLabel: 'წინა გათბობა',    iconName: 'Flame' },
  cooling_coil:  { color: '#5fa8d8', width3D: 0.50, defaultLabel: 'გამაგრილებელი',  iconName: 'Snowflake' },
  reheat:        { color: '#e07050', width3D: 0.40, defaultLabel: 'უკანა გათბობა',  iconName: 'Flame' },
  humidifier:    { color: '#7cc4d8', width3D: 0.40, defaultLabel: 'გამატენიანებელი', iconName: 'Droplet' },
  fan:           { color: '#8a99b8', width3D: 0.60, defaultLabel: 'ვენტილატორი',    iconName: 'Fan' },
  silencer:      { color: '#c0c8d4', width3D: 0.35, defaultLabel: 'ხმოვანი დამცავი', iconName: 'Volume2' },
};

/** Default params factory for adding a new section of a given type. */
export function makeDefaultParams(type: SectionType): unknown {
  switch (type) {
    case 'damper':        return { openFraction: 1, baseDeltaP: 20 };
    case 'filter':        return { filterClass: 'G4', useAverageDeltaP: true };
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
