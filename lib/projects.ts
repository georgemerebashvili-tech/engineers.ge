// engineers.ge — projects store (localStorage MVP)
// Phase 1: client-only. Supabase sync added in Task 022.

export interface Project {
  id: string;
  slug: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  state: unknown;
  meta?: { author?: string; tags?: string[]; description?: string };
}

const KEY = 'eng_projects_v1';

function readAll(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('projects: localStorage write failed', e);
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'p-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function listProjects(slug?: string): Project[] {
  const all = readAll();
  const filtered = slug ? all.filter(p => p.slug === slug) : all;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): Project | null {
  return readAll().find(p => p.id === id) || null;
}

export function createProject(
  slug: string,
  initialState: unknown = {},
  name?: string
): Project {
  const now = new Date().toISOString();
  const p: Project = {
    id: uuid(),
    slug,
    name: name || defaultName(slug),
    version: 'v1.0',
    createdAt: now,
    updatedAt: now,
    state: initialState,
    meta: {}
  };
  const all = readAll();
  all.push(p);
  writeAll(all);
  return p;
}

export function updateProject(id: string, patch: Partial<Project>): Project | null {
  const all = readAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const next: Project = {
    ...all[idx],
    ...patch,
    id: all[idx].id,
    slug: all[idx].slug,
    updatedAt: new Date().toISOString()
  };
  all[idx] = next;
  writeAll(all);
  return next;
}

export function duplicateProject(id: string, newName?: string): Project | null {
  const src = getProject(id);
  if (!src) return null;
  return createProject(src.slug, src.state, newName || `${src.name} (ასლი)`);
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter(p => p.id !== id));
}

export function saveThumbnail(id: string, dataURL: string): void {
  updateProject(id, { thumbnail: dataURL });
}

export function exportProject(id: string): string {
  const p = getProject(id);
  if (!p) throw new Error('project not found');
  return JSON.stringify(p, null, 2);
}

export function importProject(json: string): Project {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.slug) {
    throw new Error('invalid project JSON');
  }
  const all = readAll();
  const p: Project = {
    ...parsed,
    id: parsed.id && !all.some(x => x.id === parsed.id) ? parsed.id : uuid(),
    updatedAt: new Date().toISOString()
  };
  all.push(p);
  writeAll(all);
  return p;
}

function defaultName(slug: string): string {
  const now = new Date();
  const datestr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${slug} · ${datestr}`;
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const ms = Date.now() - date.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} წამი ადრე`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} წთ ადრე`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} სთ ადრე`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} დღე ადრე`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} თვე ადრე`;
  return `${Math.floor(mo / 12)} წელი ადრე`;
}
