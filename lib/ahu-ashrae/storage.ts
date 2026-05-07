// LocalStorage persistence for AHU projects + units
import type { AhuProject, AhuUnit, AhuWizardState } from './types';

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
    const parsed = JSON.parse(raw) as AhuWizardState & {
      design?: { outdoorDB?: number; outdoorWB?: number; outdoorRH?: number };
    };
    // Migrate legacy outdoorDB/WB/RH → summerDB/WB + winterDB/RH
    const d = parsed.design as AhuWizardState['design'] & { outdoorDB?: number; outdoorWB?: number; outdoorRH?: number };
    if (d && (d.summerDB === undefined || d.winterDB === undefined)) {
      const city = parsed.selectedCity;
      d.summerDB = d.summerDB ?? (d.mode === 'cooling' ? d.outdoorDB : undefined) ?? city?.summerDB ?? 32;
      d.summerWB = d.summerWB ?? (d.mode === 'cooling' ? d.outdoorWB : undefined) ?? city?.summerMCWB ?? 22;
      d.winterDB = d.winterDB ?? (d.mode === 'heating' ? d.outdoorDB : undefined) ?? city?.winterDB99 ?? -10;
      d.winterRH = d.winterRH ?? (d.mode === 'heating' ? d.outdoorRH : undefined) ?? 80;
      delete d.outdoorDB; delete d.outdoorWB; delete d.outdoorRH;
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
