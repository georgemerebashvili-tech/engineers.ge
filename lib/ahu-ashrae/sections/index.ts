/**
 * Section processor registry — maps SectionType → processor function.
 * Type-safety is preserved via runProcessor() which discriminates on
 * SectionConfig.spec.type before dispatch.
 */

import type { AirState } from '../air-state';
import type { NarrativeBullet } from '../narrate';
import type { SectionConfig, SectionResult } from './types';
import { processDamper, processFilter, processSilencer } from './process-passive';
import { processMixingBox } from './process-mixing';
import { processPreheat, processReheat, processCoolingCoil, processFan } from './process-thermal';
import { processHeatRecovery } from './process-recovery';
import { processHumidifier } from './process-humidify';

export * from './types';

/**
 * Run a single section's processor on an inlet state.
 * Auto-fills cross-section context (return state, exhaust state, accumulated ΔP)
 * via the optional `context` parameter.
 */
export interface RunContext {
  /** Snapshot of return / room air, for mixing_box and HR sections */
  returnState?: AirState;
  /** Cumulative ΔP up to this point — fan reads this as externalDeltaP */
  cumulativeDeltaP?: number;
}

export function runSection(
  inlet: AirState,
  section: SectionConfig,
  ctx: RunContext = {},
): SectionResult {
  const { spec } = section;
  switch (spec.type) {
    case 'damper':
      return processDamper(inlet, spec.params, section.id, section.label);
    case 'filter':
      return processFilter(inlet, spec.params, section.id, section.label);
    case 'silencer':
      return processSilencer(inlet, spec.params, section.id, section.label);
    case 'mixing_box': {
      const params = { ...spec.params, returnState: spec.params.returnState ?? ctx.returnState };
      return processMixingBox(inlet, params, section.id, section.label);
    }
    case 'heat_recovery': {
      // Use the room/return state as the exhaust reference if not explicitly set
      const params = { ...spec.params, exhaustState: spec.params.exhaustState ?? ctx.returnState };
      return processHeatRecovery(inlet, params, section.id, section.label);
    }
    case 'preheat':
      return processPreheat(inlet, spec.params, section.id, section.label);
    case 'cooling_coil':
      return processCoolingCoil(inlet, spec.params, section.id, section.label);
    case 'reheat':
      return processReheat(inlet, spec.params, section.id, section.label);
    case 'humidifier':
      return processHumidifier(inlet, spec.params, section.id, section.label);
    case 'fan': {
      const params = {
        ...spec.params,
        externalDeltaP: ctx.cumulativeDeltaP ?? spec.params.externalDeltaP,
      };
      return processFan(inlet, params, section.id, section.label);
    }
  }
}
