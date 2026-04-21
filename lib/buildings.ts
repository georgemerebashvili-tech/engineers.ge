// engineers.ge — buildings store (localStorage MVP)
// Unified "ჩემი პროექტები" hub — one Building (სპორტდარბაზი, სუპერმარკეტი …)
// groups N calculator projects (wall-thermal, heat-loss, hvac …) via Project.buildingId.

export interface Building {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const KEY = 'eng_buildings_v1';

function readAll(): Building[] {
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

function writeAll(list: Building[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('buildings: localStorage write failed', e);
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'b-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function listBuildings(): Building[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getBuilding(id: string): Building | null {
  return readAll().find((b) => b.id === id) || null;
}

export function createBuilding(name: string): Building {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('სახელი სავალდებულოა');
  const now = new Date().toISOString();
  const b: Building = {
    id: uuid(),
    name: trimmed,
    createdAt: now,
    updatedAt: now
  };
  const all = readAll();
  all.push(b);
  writeAll(all);
  return b;
}

export function updateBuilding(id: string, patch: Partial<Pick<Building, 'name'>>): Building | null {
  const all = readAll();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const next: Building = {
    ...all[idx],
    ...(patch.name !== undefined ? {name: patch.name.trim()} : {}),
    updatedAt: new Date().toISOString()
  };
  all[idx] = next;
  writeAll(all);
  return next;
}

export function deleteBuilding(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id));
}
