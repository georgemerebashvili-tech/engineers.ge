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
const LAST_KEY = 'eng_projects_last';
const GATE_PREF_KEY = 'eng_projects_gate_pref';

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

function readStringMap(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'
      )
    );
  } catch {
    return {};
  }
}

function writeStringMap(key: string, value: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('projects: localStorage write failed', e);
  }
}

function readBooleanMap(key: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[0] === 'string' && typeof entry[1] === 'boolean'
      )
    );
  } catch {
    return {};
  }
}

function writeBooleanMap(key: string, value: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  const project = getProject(id);
  writeAll(readAll().filter(p => p.id !== id));
  if (project && getLastProjectId(project.slug) === id) {
    setLastProjectId(project.slug, null);
  }
}

export function saveThumbnail(id: string, dataURL: string): void {
  updateProject(id, { thumbnail: dataURL });
}

export function exportProject(id: string): string {
  const p = getProject(id);
  if (!p) throw new Error('project not found');
  return JSON.stringify(p, null, 2);
}

export function exportProjects(slug?: string): string {
  return JSON.stringify(listProjects(slug), null, 2);
}

export function importProject(json: string): Project {
  const parsed = JSON.parse(json);
  const imported = importParsedProjects(parsed);
  const [p] = imported;
  if (!p) throw new Error('invalid project JSON');
  return p;
}

export function importProjects(json: string): Project[] {
  const parsed = JSON.parse(json);
  return importParsedProjects(parsed);
}

export function clearProjects(slug?: string): number {
  const all = readAll();
  const next = slug ? all.filter((project) => project.slug !== slug) : [];
  const removed = all.length - next.length;
  writeAll(next);
  if (slug) setLastProjectId(slug, null);
  return removed;
}

export function getLastProjectId(slug: string): string | null {
  const map = readStringMap(LAST_KEY);
  return map[slug] || null;
}

export function setLastProjectId(slug: string, projectId: string | null): void {
  const map = readStringMap(LAST_KEY);
  if (projectId) map[slug] = projectId;
  else delete map[slug];
  writeStringMap(LAST_KEY, map);
}

export function getAlwaysShowGateOnEntry(slug: string): boolean {
  const map = readBooleanMap(GATE_PREF_KEY);
  return map[slug] === true;
}

export function setAlwaysShowGateOnEntry(slug: string, value: boolean): void {
  const map = readBooleanMap(GATE_PREF_KEY);
  map[slug] = value;
  writeBooleanMap(GATE_PREF_KEY, map);
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

function normalizeImportedProject(raw: unknown, usedIds: Set<string>): Project {
  if (!raw || typeof raw !== 'object') {
    throw new Error('invalid project JSON');
  }
  const parsed = raw as Partial<Project> & {slug?: unknown};
  if (typeof parsed.slug !== 'string' || !parsed.slug) {
    throw new Error('invalid project JSON');
  }
  const slug = parsed.slug;
  const createdAt =
    typeof parsed.createdAt === 'string' && parsed.createdAt
      ? parsed.createdAt
      : new Date().toISOString();
  const candidateId = typeof parsed.id === 'string' && parsed.id ? parsed.id : uuid();
  const id = usedIds.has(candidateId) ? uuid() : candidateId;
  usedIds.add(id);
  return {
    id,
    slug,
    name:
      typeof parsed.name === 'string' && parsed.name.trim()
        ? parsed.name.trim()
        : defaultName(slug),
    version:
      typeof parsed.version === 'string' && parsed.version
        ? parsed.version
        : 'v1.0',
    createdAt,
    updatedAt: new Date().toISOString(),
    thumbnail: typeof parsed.thumbnail === 'string' ? parsed.thumbnail : undefined,
    state: parsed.state ?? {},
    meta:
      parsed.meta && typeof parsed.meta === 'object'
        ? parsed.meta
        : {}
  };
}

function importParsedProjects(parsed: unknown): Project[] {
  const source = Array.isArray(parsed) ? parsed : [parsed];
  const all = readAll();
  const usedIds = new Set(all.map((project) => project.id));
  const imported = source.map((entry) => normalizeImportedProject(entry, usedIds));
  all.push(...imported);
  writeAll(all);
  return imported;
}
