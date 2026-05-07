/**
 * Chain runner — walks a sequence of SectionConfigs, transforming AirState
 * stage by stage. Returns per-stage states, totals, and the narrative journal.
 *
 * The runner does two passes over the chain:
 *   Pass 1: dry-run to compute cumulative ΔP up to each section (so the fan
 *           knows the system pressure it must overcome).
 *   Pass 2: real run with cumulative ΔP context fed into the fan section.
 *
 * Sections can read `returnState` (snapshot of room air) for mixing_box and HR.
 */

import type { AirState } from './air-state';
import type { NarrativeBullet } from './narrate';
import { runSection, type SectionConfig, type RunContext } from './sections';

export interface ChainStateLabel {
  /** Identifier — 's0' for outdoor, then sectionId after each enabled section */
  id: string;
  /** Human label for the chart point */
  label: string;
  /** AirState at this point in the chain */
  state: AirState;
  /** Pressure drop across the section that produced this state (Pa). Undefined for the initial outdoor state. */
  deltaP?: number;
  /** Net energy (kW): positive = heating, negative = cooling. Undefined for initial outdoor state. */
  energy?: number;
  /** Sensible component (kW). Set for heating/cooling coils. */
  sensible?: number;
  /** Latent component (kW). Set for humidification / dehumidification. */
  latent?: number;
  /** SectionType of the section that produced this state — used for chart coloring. */
  sectionType?: string;
}

export interface ChainResult {
  /** Ordered states: index 0 = inlet (outdoor), then one per enabled section */
  states: ChainStateLabel[];
  /** Total pressure drop across all sections (Pa) — what the fan must overcome */
  totalDeltaP: number;
  /** Total cooling energy removed (kW, positive number) */
  totalCooling: number;
  /** Total heating energy added (kW, positive number) */
  totalHeating: number;
  /** Total latent moisture removed (kg/s, positive = condensed/dehumidified) */
  totalCondensate: number;
  /** Total moisture added (kg/s, positive = humidified) */
  totalHumidified: number;
  /** Per-section narrative bullets */
  journal: NarrativeBullet[];
  /** Final outlet state — what gets supplied to the room */
  supplyState: AirState;
}

export interface ChainInputs {
  /** Outdoor air state at AHU intake */
  outdoor: AirState;
  /** Return / room air — used by mixing_box and HR sections */
  returnState: AirState;
  /** Ordered enabled sections */
  sections: SectionConfig[];
}

export function runChain({ outdoor, returnState, sections }: ChainInputs): ChainResult {
  const enabled = sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  // ─── Pass 1: cumulative ΔP up to each section (so fan can read it) ─────────
  const cumDeltaPBefore: number[] = [];
  {
    let cur = outdoor;
    let cum = 0;
    for (const s of enabled) {
      cumDeltaPBefore.push(cum);
      // Stub run with cumulative ΔP not yet applied
      const r = runSection(cur, s, { returnState, cumulativeDeltaP: cum });
      cum += r.deltaP;
      cur = r.outlet;
    }
  }

  // ─── Pass 2: real run, feeding fan its cumulative ΔP ───────────────────────
  const states: ChainStateLabel[] = [
    { id: 's0', label: 'გარე ჰაერი', state: outdoor },
  ];
  const journal: NarrativeBullet[] = [];
  let totalDeltaP = 0;
  let totalCooling = 0;
  let totalHeating = 0;
  let totalCondensate = 0;
  let totalHumidified = 0;
  let cur = outdoor;

  enabled.forEach((s, i) => {
    const ctx: RunContext = {
      returnState,
      cumulativeDeltaP: cumDeltaPBefore[i],
    };
    const r = runSection(cur, s, ctx);
    cur = r.outlet;
    totalDeltaP += r.deltaP;
    if (r.energy < 0) totalCooling += -r.energy;
    else if (r.energy > 0) totalHeating += r.energy;
    // Latent direction: cooling coil removes moisture (w decreases); humidifier adds.
    const dW = r.outlet.w - states[states.length - 1].state.w;
    if (dW < 0) totalCondensate += -dW * cur.mDot; // kg/s of water condensed
    else if (dW > 0) totalHumidified += dW * cur.mDot;

    states.push({
      id: `s${i + 1}-${s.id}`,
      label: s.label,
      state: r.outlet,
      deltaP: r.deltaP,
      energy: r.energy,
      sensible: r.sensible,
      latent: r.latent,
      sectionType: s.spec.type,
    });
    journal.push(r.narrative);
  });

  return {
    states,
    totalDeltaP,
    totalCooling,
    totalHeating,
    totalCondensate,
    totalHumidified,
    journal,
    supplyState: cur,
  };
}
