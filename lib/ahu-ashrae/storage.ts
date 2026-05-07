// LocalStorage persistence for AHU projects + units
import type { AhuProject, AhuUnit, AhuWizardState } from './types';
import { buildPreset } from './section-presets';

const PROJECTS_KEY = 'ahu_projects_v2';
const WIZARD_KEY_PREFIX = 'ahu_wizard_';  // suffix: <projectId>_<unitId>

// ─── Projects ─────────────────────────────────────────────────────────────────

export function listProjects(): AhuProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AhuProject[];
    // Defensive: ensure units array exists
    return parsed.map((p) => ({ ...p, units: Array.isArray(p.units) ? p.units : [] }));
  } catch {
    return [];
  }
}

function persistProjects(projects: AhuProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function saveProject(p: AhuProject): void {
  if (typeof window === 'undefined') return;
  const all = listProjects();
  const idx = all.findIndex((x) => x.id === p.id);
  const updated = { ...p, modified: today() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  persistProjects(all);
}

export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  const proj = getProject(id);
  if (proj) {
    // Cascade: delete all unit wizard states
    proj.units.forEach((u) => {
      localStorage.removeItem(WIZARD_KEY_PREFIX + id + '_' + u.id);
    });
  }
  persistProjects(listProjects().filter((p) => p.id !== id));
}

export function getProject(id: string): AhuProject | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

// ─── AHU Units ────────────────────────────────────────────────────────────────

export function addUnit(projectId: string, unit: AhuUnit): void {
  const proj = getProject(projectId);
  if (!proj) return;
  proj.units = [...proj.units, unit];
  saveProject(proj);
}

export function updateUnit(projectId: string, unit: AhuUnit): void {
  const proj = getProject(projectId);
  if (!proj) return;
  const idx = proj.units.findIndex((u) => u.id === unit.id);
  if (idx < 0) return;
  proj.units[idx] = { ...unit, modified: today() };
  saveProject(proj);
}

export function deleteUnit(projectId: string, unitId: string): void {
  if (typeof window === 'undefined') return;
  const proj = getProject(projectId);
  if (!proj) return;
  proj.units = proj.units.filter((u) => u.id !== unitId);
  saveProject(proj);
  localStorage.removeItem(WIZARD_KEY_PREFIX + projectId + '_' + unitId);
}

export function getUnit(projectId: string, unitId: string): AhuUnit | null {
  const proj = getProject(projectId);
  return proj?.units.find((u) => u.id === unitId) ?? null;
}

// ─── Wizard State per AHU Unit ────────────────────────────────────────────────

export function loadWizardState(projectId: string, unitId: string): AhuWizardState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIZARD_KEY_PREFIX + projectId + '_' + unitId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const d = parsed?.design as Record<string, number | string | undefined> | undefined;
    if (d) {
      const city = parsed.selectedCity;
      // Pull legacy fields once, then strip them
      const legacyOutdoorDB = d.outdoorDB as number | undefined;
      const legacyOutdoorWB = d.outdoorWB as number | undefined;
      const legacyOutdoorRH = d.outdoorRH as number | undefined;
      const legacyIndoorDB = d.indoorDB as number | undefined;
      const legacyIndoorRH = d.indoorRH as number | undefined;
      const legacyMode = d.mode as 'cooling' | 'heating' | undefined;
      const legacySummerDB = d.summerDB as number | undefined;
      const legacySummerWB = d.summerWB as number | undefined;
      const legacyWinterDB = d.winterDB as number | undefined;
      const legacyWinterRH = d.winterRH as number | undefined;

      d.summerOutdoorDB = (d.summerOutdoorDB as number | undefined)
        ?? legacySummerDB
        ?? (legacyMode === 'cooling' ? legacyOutdoorDB : undefined)
        ?? city?.summerDB ?? 32;
      d.summerOutdoorWB = (d.summerOutdoorWB as number | undefined)
        ?? legacySummerWB
        ?? (legacyMode === 'cooling' ? legacyOutdoorWB : undefined)
        ?? city?.summerMCWB ?? 22;
      d.summerIndoorDB = (d.summerIndoorDB as number | undefined) ?? legacyIndoorDB ?? 24;
      d.summerIndoorRH = (d.summerIndoorRH as number | undefined) ?? legacyIndoorRH ?? 50;

      d.winterOutdoorDB = (d.winterOutdoorDB as number | undefined)
        ?? legacyWinterDB
        ?? (legacyMode === 'heating' ? legacyOutdoorDB : undefined)
        ?? city?.winterDB99 ?? -10;
      d.winterOutdoorRH = (d.winterOutdoorRH as number | undefined)
        ?? legacyWinterRH
        ?? (legacyMode === 'heating' ? legacyOutdoorRH : undefined)
        ?? 80;
      d.winterIndoorDB = (d.winterIndoorDB as number | undefined) ?? legacyIndoorDB ?? 22;
      d.winterIndoorRH = (d.winterIndoorRH as number | undefined) ?? legacyIndoorRH ?? 40;

      delete d.mode;
      delete d.outdoorDB; delete d.outdoorWB; delete d.outdoorRH;
      delete d.indoorDB; delete d.indoorRH;
      delete d.summerDB; delete d.summerWB;
      delete d.winterDB; delete d.winterRH;
    }
    // Migrate deprecated WizardStep ids → new structure (2026-05-07)
    const legacyStep = parsed?.currentStep as string | undefined;
    if (legacyStep === 'cool_coil' || legacyStep === 'heat_coil' || legacyStep === 'filter') {
      parsed.currentStep = 'sizing';
    }
    // Backfill section pipeline if missing — gives existing AHUs a default chain
    // so the new section-based UI/calc has something to display immediately.
    if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      const oaF = (parsed.airflow as { oaFraction?: number } | undefined)?.oaFraction ?? 0.3;
      parsed.sectionPresetId = parsed.sectionPresetId ?? 'mixing_with_hr';
      parsed.sections = buildPreset(parsed.sectionPresetId, { oaFraction: oaF });
    }
    // Backfill furthestReachedStep — old state predates sequential gating.
    // Default to currentStep so the user can stay where they were and not be
    // re-locked out of progress they had made.
    if (!parsed.furthestReachedStep) {
      parsed.furthestReachedStep = parsed.currentStep ?? 'ahu_type';
    }
    return parsed as AhuWizardState;
  } catch {
    return null;
  }
}

export function saveWizardState(projectId: string, unitId: string, state: AhuWizardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIZARD_KEY_PREFIX + projectId + '_' + unitId, JSON.stringify(state));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeProjectId(): string {
  return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeUnitId(): string {
  return `ahu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function suggestNextAhuName(project: AhuProject): string {
  // Find max AHU-NN in project
  const numbers = project.units
    .map((u) => /AHU-?(\d+)/i.exec(u.name)?.[1])
    .filter((x): x is string => Boolean(x))
    .map(Number);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `AHU-${String(next).padStart(2, '0')}`;
}
