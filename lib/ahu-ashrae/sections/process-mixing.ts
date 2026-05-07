/**
 * Mixing box — combines outside air with return air at given OA fraction.
 * Resulting state lies on the straight line between OA and RA on the i-d chart.
 */

import { fromDbW, type AirState } from '../air-state';
import { fmtState, fmtKw } from '../narrate';
import type { SectionResult, SectionProcessor, MixingBoxParams } from './types';

export const processMixingBox: SectionProcessor<MixingBoxParams> = (inlet, p, id, label) => {
  if (!p.returnState) {
    // No return reference — pass through untouched but still log
    return {
      outlet: inlet, deltaP: 0, energy: 0,
      narrative: {
        sectionId: id, sectionLabel: label,
        summary: 'შერევის ყუთი — return state არ მითითებული, ჰაერი უცვლელია',
        details: ['chain runner-ს უნდა მიეცეს room-ის state'],
      },
    };
  }
  const oaF = Math.max(0, Math.min(1, p.outsideAirFraction));
  const ra = p.returnState;
  const oa = inlet;

  // Mass-weighted W and h are linear; tdb derived from mixed h, w
  const wMix = oaF * oa.w + (1 - oaF) * ra.w;
  const hMix = oaF * oa.h + (1 - oaF) * ra.h;
  // Recover tdb from h and w: h = 1.006*T + W*(2501 + 1.86*T)
  // → T*(1.006 + 1.86*W) = h - 2501*W
  const tMix = (hMix - 2501 * wMix) / (1.006 + 1.86 * wMix);
  // Total mass flow is sum (chain runner already set OA mDot; use full flow here)
  const mDotMix = oa.mDot / Math.max(0.01, oaF);
  const outlet = fromDbW(tMix, wMix, mDotMix, oa.p);

  return {
    outlet,
    deltaP: 0,
    energy: 0, // mixing is energy-neutral (no work added)
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `შერევა: გარე ${fmtState(oa.tdb, oa.rh)} (${(oaF * 100).toFixed(0)}%) + უკუ ${fmtState(ra.tdb, ra.rh)} (${((1 - oaF) * 100).toFixed(0)}%) → ნარევი ${fmtState(outlet.tdb, outlet.rh)}`,
      details: [
        `OA fraction: ${(oaF * 100).toFixed(0)}% (mass basis)`,
        `W (mixed) = ${(oaF * 100).toFixed(0)}%·${(oa.w * 1000).toFixed(2)} + ${((1 - oaF) * 100).toFixed(0)}%·${(ra.w * 1000).toFixed(2)} = ${(wMix * 1000).toFixed(2)} g/kg`,
        `h (mixed) = ${fmtKw(oaF * oa.h)} + ${fmtKw((1 - oaF) * ra.h)} = ${hMix.toFixed(1)} kJ/kg`,
        `T (mixed) — h, W → ${outlet.tdb.toFixed(1)}°C (ASHRAE HOF Eq.30)`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.1 (mixing process)',
    },
  };
};
