/**
 * Passive sections — damper, filter, silencer.
 * They contribute ΔP only; air state passes through unchanged.
 */

import type { AirState } from '../air-state';
import { fmtPa } from '../narrate';
import type {
  SectionResult, SectionProcessor,
  DamperParams, FilterParams, SilencerParams, FilterClass,
} from './types';

// ─── Filter ΔP table (clean, mid-life avg, dirty) ─────────────────────────────

const FILTER_DP: Record<FilterClass, { clean: number; avg: number; dirty: number; label: string }> = {
  G4:       { clean: 35,  avg: 75,  dirty: 150, label: 'G4 (uxeshi mtveri)' },
  M5:       { clean: 50,  avg: 100, dirty: 200, label: 'M5' },
  F7:       { clean: 80,  avg: 150, dirty: 250, label: 'F7 (PM2.5)' },
  F9:       { clean: 110, avg: 180, dirty: 300, label: 'F9 (PM1)' },
  H13:      { clean: 200, avg: 350, dirty: 600, label: 'H13 (HEPA)' },
  H14:      { clean: 280, avg: 500, dirty: 900, label: 'H14 (HEPA+)' },
  carbon:   { clean: 60,  avg: 120, dirty: 220, label: 'Carbon (smell removal)' },
  electric: { clean: 25,  avg: 40,  dirty: 60,  label: 'Electrostatic' },
};

// ─── Damper ───────────────────────────────────────────────────────────────────

export const processDamper: SectionProcessor<DamperParams> = (inlet, p, id, label) => {
  // ΔP scales with (1/openFraction)² for orifice-like behavior, clamped
  const open = Math.max(0.05, Math.min(1, p.openFraction));
  const deltaP = p.baseDeltaP / (open * open);
  return {
    outlet: inlet, // air state unchanged
    deltaP,
    energy: 0,
    narrative: {
      sectionId: id,
      sectionLabel: label,
      summary: `დემპერი ${(open * 100).toFixed(0)}% ღია → წნევის ვარდნა ${fmtPa(deltaP)}`,
      details: [
        `ღია ფრაქცია: ${(open * 100).toFixed(0)}%`,
        `ბაზური ΔP (სრულად ღია): ${fmtPa(p.baseDeltaP)}`,
        `T/W უცვლელი (passive component)`,
      ],
      reference: 'EN 1751:2014 (damper leakage classes)',
    },
  };
};

// ─── Filter ───────────────────────────────────────────────────────────────────

export const processFilter: SectionProcessor<FilterParams> = (inlet, p, id, label) => {
  const spec = FILTER_DP[p.filterClass];
  const deltaP = p.useAverageDeltaP ? spec.avg : spec.clean;
  return {
    outlet: inlet,
    deltaP,
    energy: 0,
    narrative: {
      sectionId: id,
      sectionLabel: label,
      summary: `${spec.label} ფილტრი → ${fmtPa(deltaP)} ${p.useAverageDeltaP ? '(mid-life avg)' : '(clean)'}`,
      details: [
        `კლასი: ${p.filterClass}`,
        `ΔP clean: ${fmtPa(spec.clean)} | avg: ${fmtPa(spec.avg)} | dirty: ${fmtPa(spec.dirty)}`,
        `T/W უცვლელი`,
      ],
      reference: 'ISO 16890:2016',
    },
  };
};

// ─── Silencer ─────────────────────────────────────────────────────────────────

export const processSilencer: SectionProcessor<SilencerParams> = (inlet, p, id, label) => ({
  outlet: inlet,
  deltaP: p.deltaP,
  energy: 0,
  narrative: {
    sectionId: id,
    sectionLabel: label,
    summary: `ხმოვანი დამცავი → ΔP ${fmtPa(p.deltaP)}`,
    details: [`T/W უცვლელი`],
    reference: 'EN ISO 7235:2009 (acoustic attenuators)',
  },
});

// Util re-exports
export { FILTER_DP };

// Helper to satisfy TS that result type is enforceable
export type _PassiveResult = SectionResult;
