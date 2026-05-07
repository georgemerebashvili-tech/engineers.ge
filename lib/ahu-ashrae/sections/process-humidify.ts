/**
 * Humidifier — adds moisture to the air. Two physical types differ:
 *  - steam: isothermal (tdb roughly preserved, latent heat from steam)
 *  - adiabatic (spray / pad): isenthalpic (h preserved, tdb drops as water evaporates)
 */

import { fromDbW, type AirState } from '../air-state';
import { fmtT, fmtRh, fmtKw, fmtPa, fmtState } from '../narrate';
import { wFromDbRh, satW } from '../psychrometrics';
import type { SectionResult, SectionProcessor, HumidifierParams } from './types';

export const processHumidifier: SectionProcessor<HumidifierParams> = (inlet, p, id, label) => {
  // Target RH at the humidifier exit
  const targetRh = Math.max(0.05, Math.min(0.95, p.targetRh));
  // Target W at inlet temperature for isothermal humidification target
  const wTargetAtInletT = wFromDbRh(inlet.tdb, targetRh * 100, inlet.p);

  if (wTargetAtInletT <= inlet.w) {
    // Already wetter than target — humidifier idles
    return {
      outlet: inlet, deltaP: p.deltaP, energy: 0,
      narrative: {
        sectionId: id, sectionLabel: label,
        summary: `გამატენიანებელი idle: ჰაერი უკვე ${fmtRh(inlet.rh)} (target ${fmtRh(targetRh)})`,
        details: [`ΔP კვლავ ${fmtPa(p.deltaP)}`],
      },
    };
  }

  let outlet: AirState;
  let processNote: string;
  if (p.humType === 'steam') {
    // Isothermal: T stays, W rises to target
    outlet = fromDbW(inlet.tdb, wTargetAtInletT, inlet.mDot, inlet.p);
    processNote = 'isothermal (steam)';
  } else {
    // Adiabatic: enthalpy preserved, water evaporation cools the air.
    // Find tdb such that h(tdb, w_new) ≈ h_in. Approximate by saturation efficiency:
    //   w_actual = w_in + sat_eff·(w_sat_in - w_in)
    // Then derive tdb from h_in, w_actual.
    const eff = Math.max(0.5, Math.min(0.98, p.saturationEff ?? 0.9));
    const wSat = satW(inlet.twb, inlet.p); // saturation w at WBT (adiabatic line ≈ const WBT)
    const wOut = inlet.w + eff * (wSat - inlet.w);
    // Recover T from h = const, w = wOut
    const tOut = (inlet.h - 2501 * wOut) / (1.006 + 1.86 * wOut);
    outlet = fromDbW(tOut, wOut, inlet.mDot, inlet.p);
    processNote = `adiabatic (η_sat ${(eff * 100).toFixed(0)}%)`;
  }

  // Moisture added (kg_water / s)
  const dmDot = inlet.mDot * (outlet.w - inlet.w);
  // Water enthalpy of vaporization ~ 2500 kJ/kg
  const latent = dmDot * 2500;
  const cpAvg = 1.006 + 1.86 * (inlet.w + outlet.w) / 2;
  const sensible = inlet.mDot * cpAvg * (outlet.tdb - inlet.tdb);
  const energy = sensible + latent;

  return {
    outlet, deltaP: p.deltaP, energy, sensible, latent,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `გამატენიანება (${processNote}): ${fmtState(inlet.tdb, inlet.rh)} → ${fmtState(outlet.tdb, outlet.rh)}`,
      details: [
        `ΔW = ${((outlet.w - inlet.w) * 1000).toFixed(2)} g/kg → წყლის ხარჯი ${(dmDot * 3600).toFixed(2)} kg/h`,
        `Latent (water vapor): ${fmtKw(latent)}`,
        p.humType === 'steam'
          ? `Steam: T უცვლელი (${fmtT(inlet.tdb)})`
          : `Adiabatic: T დაეცა ${fmtT(inlet.tdb)} → ${fmtT(outlet.tdb)} (h ≈ const)`,
        `ΔP: ${fmtPa(p.deltaP)}`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.22 (humidifiers)',
    },
  };
};
