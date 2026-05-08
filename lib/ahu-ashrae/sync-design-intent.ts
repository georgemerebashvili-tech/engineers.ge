/**
 * Syncs SystemDesignIntent (Step 1) → section pipeline params.
 *
 * Called whenever systemDesign changes. Updates:
 *   - cooling_coil: source (chw/dx) + ADP from CHW supply temp
 *   - preheat / reheat: source (hot_water/electric/steam)
 *   - cooling_coil / preheat / reheat: disabled when system = 'none'
 *   - humidifier: disabled when humidifier = 'none', enabled otherwise
 *
 * Does NOT touch filter sections (managed in Step 2) or other sections.
 */

import type { SectionConfig } from './sections';
import type { SystemDesignIntent } from './types';

export function syncSectionsFromIntent(
  sections: SectionConfig[],
  intent: SystemDesignIntent,
): SectionConfig[] {
  return sections.map((s) => {
    const { spec } = s;

    // ── Cooling coil ───────────────────────────────────────────────────────────
    if (spec.type === 'cooling_coil') {
      if (intent.coolingSystem === 'none') return { ...s, enabled: false };
      const source = intent.coolingSystem === 'dx' ? ('dx' as const) : ('chw' as const);
      // ADP for CHW coil ≈ supply + 1.5 °C (typical 6-row coil at design flow)
      const adp =
        source === 'chw'
          ? intent.chwSupplyT + 1.5
          : spec.params.apparatusDewPoint;
      return {
        ...s,
        enabled: true,
        spec: { type: 'cooling_coil', params: { ...spec.params, source, apparatusDewPoint: adp } },
      };
    }

    // ── Preheat / reheat ───────────────────────────────────────────────────────
    if (spec.type === 'preheat' || spec.type === 'reheat') {
      if (intent.heatingSystem === 'none') return { ...s, enabled: false };
      const src: 'hot_water' | 'electric' | 'steam' =
        intent.heatingSystem === 'electric'
          ? 'electric'
          : intent.heatingSystem === 'steam'
          ? 'steam'
          : 'hot_water';
      return {
        ...s,
        enabled: true,
        spec: { type: spec.type, params: { ...spec.params, source: src } },
      };
    }

    // ── Humidifier ─────────────────────────────────────────────────────────────
    if (spec.type === 'humidifier') {
      return { ...s, enabled: intent.humidifier !== 'none' };
    }

    return s;
  });
}

/** Map FilterStageKey label to display string for StepSizing summary. */
export const FILTER_STAGE_LABELS: Record<string, { short: string; iso: string }> = {
  G2:  { short: 'G2',   iso: 'ISO Coarse 35%' },
  G4:  { short: 'G4',   iso: 'ISO Coarse 60%' },
  F7:  { short: 'F7',   iso: 'ISO ePM1 55%' },
  F9:  { short: 'F9',   iso: 'ISO ePM1 80%' },
  H14: { short: 'H14',  iso: 'EN 1822 99.995%' },
  UVC: { short: 'UV-C', iso: 'გერმიციდული' },
};
