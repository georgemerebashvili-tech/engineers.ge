/**
 * Heat recovery — sensible-only (plate, run-around) or sensible+latent (enthalpy wheel).
 * Uses ε-NTU effectiveness model (ASHRAE HOF Ch.26).
 *
 * Effectiveness ε = (T_supply_out - T_supply_in) / (T_exhaust_in - T_supply_in)
 * For latent: ε_lat = (W_supply_out - W_supply_in) / (W_exhaust_in - W_supply_in)
 */

import { fromDbW, type AirState } from '../air-state';
import { fmtT, fmtKw, fmtPa, fmtState } from '../narrate';
import type { SectionResult, SectionProcessor, HeatRecoveryParams } from './types';

export const processHeatRecovery: SectionProcessor<HeatRecoveryParams> = (inlet, p, id, label) => {
  if (!p.exhaustState) {
    return {
      outlet: inlet, deltaP: p.deltaP, energy: 0,
      narrative: {
        sectionId: id, sectionLabel: label,
        summary: 'რეკუპერატორი — exhaust state არ მითითებული, ჰაერი უცვლელია',
        details: ['chain runner-ს უნდა მიეცეს room exhaust-ის state'],
      },
    };
  }
  const ex = p.exhaustState;
  const eS = Math.max(0, Math.min(0.95, p.sensibleEff));
  const eL = Math.max(0, Math.min(0.95, p.latentEff));

  // Sensible: shift inlet T toward exhaust T by effectiveness fraction
  const dT = eS * (ex.tdb - inlet.tdb);
  const tOut = inlet.tdb + dT;

  // Latent: shift W toward exhaust W (only enthalpy wheels / membrane HRVs)
  const dW = eL * (ex.w - inlet.w);
  const wOut = Math.max(0, inlet.w + dW);

  const outlet = fromDbW(tOut, wOut, inlet.mDot, inlet.p);
  const energy = inlet.mDot * (outlet.h - inlet.h); // kW (positive in winter, negative in summer)
  const cpAvg = 1.006 + 1.86 * (inlet.w + outlet.w) / 2;
  const sensible = inlet.mDot * cpAvg * (outlet.tdb - inlet.tdb);
  const latent = energy - sensible;

  return {
    outlet, deltaP: p.deltaP, energy, sensible, latent,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `რეკუპერატორი (${typeLabel(p.hrType)}): ${fmtState(inlet.tdb, inlet.rh)} → ${fmtState(outlet.tdb, outlet.rh)} (ε_s ${(eS * 100).toFixed(0)}% / ε_l ${(eL * 100).toFixed(0)}%)`,
      details: [
        `Exhaust ref: ${fmtState(ex.tdb, ex.rh)}`,
        `ΔT = ε_s · (T_ex - T_in) = ${eS.toFixed(2)} · (${ex.tdb.toFixed(1)} - ${inlet.tdb.toFixed(1)}) = ${dT.toFixed(1)} K`,
        eL > 0 ? `ΔW = ε_l · (W_ex - W_in) = ${eL.toFixed(2)} · ${((ex.w - inlet.w) * 1000).toFixed(2)} = ${(dW * 1000).toFixed(2)} g/kg` : 'ε_l = 0 → W უცვლელი (sensible-only HR)',
        `Recovery: sensible ${fmtKw(Math.abs(sensible))} | latent ${fmtKw(Math.abs(latent))} | total ${fmtKw(Math.abs(energy))}`,
        `ΔP: ${fmtPa(p.deltaP)}`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.26 (energy recovery, ε-NTU)',
    },
  };
};

function typeLabel(t: HeatRecoveryParams['hrType']): string {
  switch (t) {
    case 'crossflow_plate': return 'cross-flow plate';
    case 'counterflow_plate': return 'counter-flow plate';
    case 'rotary_sensible': return 'rotary wheel (sensible)';
    case 'run_around_coil': return 'run-around (glycol)';
  }
}
