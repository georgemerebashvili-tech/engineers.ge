/**
 * Sequential wizard flow control — gating, validation, and dirty-cascade.
 *
 * Rules (set 2026-05-07):
 *   - Forward jump allowed only if all prior steps are valid (and the user has
 *     either reached that step before, or is moving by exactly +1).
 *   - Going back is always allowed.
 *   - Editing a setting in step N marks all steps > N as "dirty" → user must
 *     re-walk them so journal/state regenerates and visual badge resets.
 *
 * The chain runner already recomputes downstream states on every `state.sections`
 * change, so the actual numeric outputs are always fresh. The "dirty" flag is
 * about *user awareness* — pushing them to re-confirm the change downstream.
 */

import type { AhuWizardState, AhuUnit, WizardStep } from './types';
import type { ChainResult } from './chain';

export const STEP_ORDER: WizardStep[] = [
  'ahu_type',
  'inputs',
  'components',
  'psychro',
  'sizing',
  'fan',
  'summary',
  'report',
];

export function stepIndex(id: WizardStep): number {
  return STEP_ORDER.indexOf(id);
}

export type StepStatus = 'locked' | 'current' | 'completed' | 'dirty' | 'available';

/**
 * Per-step validation: does this step have everything it needs to be considered
 * "done"? Used both for forward-gating and for sidebar status display.
 */
export function isStepValid(
  id: WizardStep,
  state: AhuWizardState,
  unit: AhuUnit,
  chain?: ChainResult,
): boolean {
  switch (id) {
    case 'ahu_type':
      return Boolean(unit.ahuType);
    case 'inputs':
      return state.airflow.supplyAirflow > 0
        && state.design.summerOutdoorDB > -50
        && state.design.summerIndoorDB > -50;
    case 'components':
      return Array.isArray(state.sections) && state.sections.filter((s) => s.enabled).length > 0;
    case 'psychro':
      return Boolean(chain && chain.states.length >= 2);
    case 'sizing':
      return Boolean(chain && chain.totalDeltaP > 0);
    case 'fan':
      // Fan section in chain produces non-zero motor energy
      return Boolean(chain && chain.journal.some((j) => j.sectionLabel.toLowerCase().includes('ვენტილატორი')));
    case 'summary':
      return Boolean(chain && chain.states.length >= 3);
    case 'report':
      // Report is always reachable once everything else is done
      return Boolean(chain && chain.states.length >= 3);
  }
}

/**
 * Compute display status for every step at once.
 * Returns a Map<WizardStep, StepStatus>.
 */
export function computeStepStatuses(
  state: AhuWizardState,
  unit: AhuUnit,
  chain?: ChainResult,
): Map<WizardStep, StepStatus> {
  const out = new Map<WizardStep, StepStatus>();
  const cur = state.currentStep;
  const curIdx = stepIndex(cur);
  const furthest = state.furthestReachedStep ?? cur;
  const furthestIdx = stepIndex(furthest);
  const dirtyIdx = state.dirtyFromStep ? stepIndex(state.dirtyFromStep) : -1;

  STEP_ORDER.forEach((id, i) => {
    if (id === cur) {
      out.set(id, 'current');
      return;
    }
    if (i > furthestIdx) {
      out.set(id, 'locked');
      return;
    }
    if (dirtyIdx >= 0 && i >= dirtyIdx) {
      out.set(id, 'dirty');
      return;
    }
    if (isStepValid(id, state, unit, chain)) {
      out.set(id, 'completed');
      return;
    }
    out.set(id, 'available');
  });
  return out;
}

/**
 * Gate: can the user navigate to this step right now?
 *   - back-jumps always OK
 *   - forward to current+1 OK if current is valid
 *   - jump to any step ≤ furthestReachedStep OK (re-visiting)
 *   - jump beyond furthest blocked
 */
export function canNavigate(
  target: WizardStep,
  state: AhuWizardState,
  unit: AhuUnit,
  chain?: ChainResult,
): boolean {
  const targetIdx = stepIndex(target);
  const curIdx = stepIndex(state.currentStep);
  const furthestIdx = stepIndex(state.furthestReachedStep ?? state.currentStep);

  // Always allow re-visit ≤ furthest
  if (targetIdx <= furthestIdx) return true;
  // Forward by exactly 1 if current is valid
  if (targetIdx === curIdx + 1) {
    return isStepValid(state.currentStep, state, unit, chain);
  }
  return false;
}

/**
 * After a navigation, return the patch to apply: bump furthest if we moved
 * forward; clear dirty flag if we passed through it.
 */
export function navigationPatch(
  target: WizardStep,
  state: AhuWizardState,
): Partial<AhuWizardState> {
  const targetIdx = stepIndex(target);
  const furthestIdx = stepIndex(state.furthestReachedStep ?? state.currentStep);
  const dirtyIdx = state.dirtyFromStep ? stepIndex(state.dirtyFromStep) : -1;

  const patch: Partial<AhuWizardState> = { currentStep: target };
  if (targetIdx > furthestIdx) {
    patch.furthestReachedStep = target;
  }
  // If we navigate to or past the dirty step, clear dirty
  // (user is acknowledging the recompute by stepping through)
  if (dirtyIdx >= 0 && targetIdx >= dirtyIdx) {
    patch.dirtyFromStep = undefined;
  }
  return patch;
}

/**
 * When state in step N is edited, mark step N+1 as dirty so the user re-walks.
 * Idempotent: if dirty is already earlier, keep the earlier one.
 */
export function dirtyAfterEdit(
  editedStep: WizardStep,
  state: AhuWizardState,
): Partial<AhuWizardState> {
  const editedIdx = stepIndex(editedStep);
  const nextIdx = editedIdx + 1;
  if (nextIdx >= STEP_ORDER.length) return {}; // no downstream
  const nextStep = STEP_ORDER[nextIdx];
  const currentDirtyIdx = state.dirtyFromStep ? stepIndex(state.dirtyFromStep) : Infinity;
  if (nextIdx >= currentDirtyIdx) return {}; // already dirty earlier
  return { dirtyFromStep: nextStep };
}
