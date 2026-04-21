// engineers.ge — project snapshot encoder
// Encodes a Building + its linked Projects into a URL-safe base64 payload
// so that the public /shared/project#<payload> view can render a read-only copy
// without server persistence (localStorage MVP).

import type {Building} from '@/lib/buildings';
import type {Project} from '@/lib/projects';

export const SNAPSHOT_VERSION = 1;

export interface ProjectSnapshot {
  v: number;
  b: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  p: Array<{
    id: string;
    slug: string;
    name: string;
    version: string;
    createdAt: string;
    updatedAt: string;
    state?: unknown;
    meta?: Project['meta'];
  }>;
}

export interface EncodeOptions {
  /** Include full per-calc state (can make URLs very long). Defaults to true. */
  includeState?: boolean;
  /** Include thumbnails (data URLs). Defaults to false. */
  includeThumbnails?: boolean;
}

export function buildSnapshot(
  building: Building,
  projects: Project[],
  opts: EncodeOptions = {}
): ProjectSnapshot {
  const includeState = opts.includeState !== false;
  return {
    v: SNAPSHOT_VERSION,
    b: {
      id: building.id,
      name: building.name,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt
    },
    p: projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      name: project.name,
      version: project.version,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      state: includeState ? project.state : undefined,
      meta: project.meta
    }))
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary =
    typeof atob !== 'undefined'
      ? atob(b64 + pad)
      : Buffer.from(b64 + pad, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeSnapshot(snapshot: ProjectSnapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

export function decodeSnapshot(payload: string): ProjectSnapshot | null {
  try {
    const bytes = fromBase64Url(payload.trim());
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.v !== 'number') return null;
    if (!parsed.b || typeof parsed.b !== 'object') return null;
    if (!Array.isArray(parsed.p)) return null;
    return parsed as ProjectSnapshot;
  } catch {
    return null;
  }
}

export function estimateUrlLength(origin: string, payload: string): number {
  return `${origin}/shared/project#${payload}`.length;
}
