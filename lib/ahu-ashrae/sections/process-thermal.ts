/**
 * Thermal sections — preheat, cooling coil, reheat, fan motor heat.
 * These transform tdb (and for cooling coils, also w via dehumidification).
 */

import { fromDbW, toTdb, type AirState } from '../air-state';
import { fmtT, fmtW, fmtRh, fmtKw, fmtPa, fmtState } from '../narrate';
import { satW, airDensity } from '../psychrometrics';
import type {
  SectionResult, SectionProcessor,
  PreheatParams, ReheatParams, CoolingCoilParams, FanParams,
} from './types';

// ─── Preheat (sensible only, w preserved) ─────────────────────────────────────

export const processPreheat: SectionProcessor<PreheatParams> = (inlet, p, id, label) => {
  // Only heat — never cool
  const target = Math.max(inlet.tdb, p.targetTdb);
  const outlet = toTdb(inlet, target);
  const cp = 1.006 + 1.86 * inlet.w;
  const energy = inlet.mDot * cp * (target - inlet.tdb); // kW (positive)
  return {
    outlet, deltaP: p.deltaP, energy, sensible: energy,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `წინა გათბობა: ${fmtT(inlet.tdb)} → ${fmtT(target)} (sensible ${fmtKw(energy)})`,
      details: [
        `წყარო: ${labelSource(p.source)}`,
        `W უცვლელია (${fmtW(inlet.w)})`,
        `Q = ṁ·cp·ΔT = ${inlet.mDot.toFixed(2)} kg/s · ${cp.toFixed(3)} · ${(target - inlet.tdb).toFixed(1)}K = ${fmtKw(energy)}`,
        `ΔP: ${fmtPa(p.deltaP)}`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.1 (sensible heating)',
    },
  };
};

// ─── Reheat (post-coil sensible, identical math to preheat) ──────────────────

export const processReheat: SectionProcessor<ReheatParams> = (inlet, p, id, label) => {
  const target = Math.max(inlet.tdb, p.targetTdb);
  const outlet = toTdb(inlet, target);
  const cp = 1.006 + 1.86 * inlet.w;
  const energy = inlet.mDot * cp * (target - inlet.tdb);
  return {
    outlet, deltaP: p.deltaP, energy, sensible: energy,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `უკან გათბობა (reheat): ${fmtT(inlet.tdb)} → ${fmtT(target)} (sensible ${fmtKw(energy)})`,
      details: [
        `წყარო: ${labelSource(p.source)}`,
        `W უცვლელია (${fmtW(inlet.w)})`,
        `ΔP: ${fmtPa(p.deltaP)}`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.1',
    },
  };
};

// ─── Cooling coil — bypass-factor model (sensible + latent) ──────────────────

export const processCoolingCoil: SectionProcessor<CoolingCoilParams> = (inlet, p, id, label) => {
  // Skip if inlet is already colder than target (no cooling needed)
  if (inlet.tdb <= p.targetTdb) {
    return {
      outlet: inlet, deltaP: p.deltaP, energy: 0,
      sensible: 0, latent: 0,
      narrative: {
        sectionId: id, sectionLabel: label,
        summary: `გამაგრილებელი ხვია: ჰაერი უკვე გაცივებულია (${fmtT(inlet.tdb)} ≤ target ${fmtT(p.targetTdb)})`,
        details: [`coil bypass — ΔP კვლავ გავლილია (${fmtPa(p.deltaP)})`],
      },
    };
  }
  const bf = Math.max(0, Math.min(0.5, p.bypassFactor));
  const adp = p.apparatusDewPoint;
  // Bypass-factor model: outlet = BF·inlet + (1-BF)·ADP_state
  // ADP state is saturated air at adp (rh=1, tdb=twb=adp)
  // We approximate ADP humidity from saturation at adp temperature.
  const adpWReal = satW(adp, inlet.p);
  const tOut = bf * inlet.tdb + (1 - bf) * adp;
  // If inlet w is below adp saturation w, no dehumid happens — just sensible cooling
  const wOut = inlet.w <= adpWReal
    ? inlet.w
    : bf * inlet.w + (1 - bf) * adpWReal;

  const outlet = fromDbW(tOut, wOut, inlet.mDot, inlet.p);
  // Energy = mdot · (h_out - h_in) — negative because removed from air
  const energy = inlet.mDot * (outlet.h - inlet.h); // kW (negative)
  // Sensible = mdot · cp · ΔT (constant cp at avg w)
  const cp = 1.006 + 1.86 * (inlet.w + outlet.w) / 2;
  const sensible = inlet.mDot * cp * (outlet.tdb - inlet.tdb);
  const latent = energy - sensible; // remainder is latent
  const shr = sensible / energy; // both negative → ratio positive

  return {
    outlet, deltaP: p.deltaP, energy, sensible, latent,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `გამაგრილებელი ხვია: ${fmtState(inlet.tdb, inlet.rh)} → ${fmtState(outlet.tdb, outlet.rh)}, Qt=${fmtKw(-energy)}, SHR=${(shr * 100).toFixed(0)}%`,
      details: [
        `წყარო: ${p.source === 'chw' ? 'ცივი წყალი (CHW)' : 'პირდაპირი გაფართოება (DX)'}`,
        `Apparatus Dew Point: ${fmtT(adp)} (BF = ${bf.toFixed(2)})`,
        `T_out = BF·T_in + (1-BF)·ADP = ${bf.toFixed(2)}·${inlet.tdb.toFixed(1)} + ${(1 - bf).toFixed(2)}·${adp.toFixed(1)} = ${tOut.toFixed(1)}°C`,
        `W_out = ${(wOut * 1000).toFixed(2)} g/kg ${inlet.w > adpWReal ? '(dehumidified)' : '(no condensation)'}`,
        `Sensible: ${fmtKw(-sensible)} | Latent: ${fmtKw(-latent)} | Total: ${fmtKw(-energy)}`,
        `ΔP: ${fmtPa(p.deltaP)}`,
      ],
      reference: 'ASHRAE HOF 2021 Ch.27 (cooling coils, BF model)',
    },
  };
};

// ─── Fan — adds motor heat as small sensible bump ─────────────────────────────

export const processFan: SectionProcessor<FanParams> = (inlet, p, id, label) => {
  // Fan power at this airflow & total ΔP
  // The chain runner sets externalDeltaP to sum of ΔP up to this fan
  const dpTotal = p.externalDeltaP;
  // Volumetric flow at inlet conditions
  const rho = airDensity(inlet.tdb, inlet.w, inlet.p);
  const vDot = inlet.mDot / rho; // m³/s
  // Fluid power → divide by efficiencies for shaft, then motor electric
  const fanShaftKw = (vDot * dpTotal) / (Math.max(0.1, p.fanEff) * 1000);
  const motorElecKw = fanShaftKw / Math.max(0.1, p.motorEff);
  // Heat added to air (motorHeatFraction of motor input, default ~0.85 for ducted)
  const heatKw = motorElecKw * Math.max(0, Math.min(1, p.motorHeatFraction));
  const cp = 1.006 + 1.86 * inlet.w;
  const dT = heatKw / (inlet.mDot * cp);
  const outlet = fromDbW(inlet.tdb + dT, inlet.w, inlet.mDot, inlet.p);
  return {
    outlet,
    // Fan generates pressure rather than dropping it — record as 0 for chain ΔP totalization
    deltaP: 0,
    energy: heatKw,
    sensible: heatKw,
    narrative: {
      sectionId: id, sectionLabel: label,
      summary: `${p.position === 'supply' ? 'მიმწოდი' : 'უკუ'} ვენტილატორი: ΔP_total ${fmtPa(dpTotal)}, P_motor ${fmtKw(motorElecKw)}, T+${dT.toFixed(2)}K`,
      details: [
        `V̇ = ${(vDot * 3600).toFixed(0)} m³/h, ρ = ${rho.toFixed(3)} kg/m³`,
        `P_shaft = V̇·ΔP/η_fan = ${vDot.toFixed(2)}·${dpTotal}/${p.fanEff.toFixed(2)} = ${fmtKw(fanShaftKw)}`,
        `P_motor = P_shaft/η_motor = ${fmtKw(motorElecKw)}`,
        `Q_air = P_motor·heatFraction = ${fmtKw(heatKw)} → ΔT = ${dT.toFixed(2)} K`,
        `SFP = ${(motorElecKw * 1000 / vDot).toFixed(0)} W/(m³/s)`,
      ],
      reference: 'EN 13779:2007 (SFP), ASHRAE 90.1 §6.5.3',
    },
  };
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function labelSource(s: 'hot_water' | 'electric' | 'steam'): string {
  if (s === 'hot_water') return 'ცხელი წყალი';
  if (s === 'electric') return 'ელექტრო';
  return 'ორთქლი';
}
