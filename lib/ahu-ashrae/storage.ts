// LocalStorage persistence for AHU projects
import type { AhuProject, AhuWizardState } from './types';

const PROJECTS_KEY = 'ahu_projects_v1';
const WIZARD_KEY_PREFIX = 'ahu_wizard_';

// ─── Project list ─────────────────────────────────────────────────────────────

export function listProjects(): AhuProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AhuProject[];
  } catch {
    return [];
  }
}

export function saveProject(p: AhuProject): void {
  if (typeof window === 'undefined') return;
  const all = listProjects();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx >= 0) all[idx] = { ...p, modified: today() };
  else all.unshift({ ...p, modified: today() });
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  const all = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
  // Also remove the wizard state
  localStorage.removeItem(WIZARD_KEY_PREFIX + id);
}

export function getProject(id: string): AhuProject | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

// ─── Wizard state per project ─────────────────────────────────────────────────

export function loadWizardState(projectId: string): AhuWizardState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIZARD_KEY_PREFIX + projectId);
    return raw ? (JSON.parse(raw) as AhuWizardState) : null;
  } catch {
    return null;
  }
}

export function saveWizardState(projectId: string, state: AhuWizardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIZARD_KEY_PREFIX + projectId, JSON.stringify(state));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeProjectId(): string {
  return `ahu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
