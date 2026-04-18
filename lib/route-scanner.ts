import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type RouteKind = 'page' | 'api' | 'layout' | 'static';

export type RouteNode = {
  name: string;           // segment label (folder name)
  path: string;           // URL path (e.g. /admin/users)
  file: string | null;    // absolute path of the page.tsx / route.ts (or null for group)
  kind: RouteKind | 'group';
  dynamic: boolean;       // [slug] segments
  isRouteGroup: boolean;  // (withSidebar) — folder-only
  children: RouteNode[];
};

const APP_DIR = path.resolve(process.cwd(), 'app');
const PUBLIC_CALC_DIR = path.resolve(process.cwd(), 'public/calc');

function isHidden(name: string) {
  return name.startsWith('_') || name.startsWith('.');
}

function toUrlSegment(folder: string): {segment: string; group: boolean} {
  // (withSidebar) — Next.js route group: folder exists but not in URL
  if (folder.startsWith('(') && folder.endsWith(')')) {
    return {segment: '', group: true};
  }
  return {segment: folder, group: false};
}

function findEntry(dir: string): {file: string; kind: RouteKind} | null {
  const candidates: Array<{name: string; kind: RouteKind}> = [
    {name: 'page.tsx', kind: 'page'},
    {name: 'page.ts', kind: 'page'},
    {name: 'page.jsx', kind: 'page'},
    {name: 'page.js', kind: 'page'},
    {name: 'route.ts', kind: 'api'},
    {name: 'route.js', kind: 'api'}
  ];
  for (const c of candidates) {
    const p = path.join(dir, c.name);
    if (fs.existsSync(p)) return {file: p, kind: c.kind};
  }
  return null;
}

function walk(dir: string, urlPrefix: string): RouteNode[] {
  const out: RouteNode[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return out;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (isHidden(e.name)) continue;

    const {segment, group} = toUrlSegment(e.name);
    const childDir = path.join(dir, e.name);
    const childUrl = group
      ? urlPrefix
      : path.posix.join(urlPrefix || '/', segment);

    const entry = findEntry(childDir);
    const children = walk(childDir, childUrl);

    const node: RouteNode = {
      name: e.name,
      path: childUrl || '/',
      file: entry?.file ?? null,
      kind: entry?.kind ?? 'group',
      dynamic: segment.startsWith('['),
      isRouteGroup: group,
      children
    };

    out.push(node);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function scanAppRoutes(): RouteNode {
  const rootEntry = findEntry(APP_DIR);
  return {
    name: 'app',
    path: '/',
    file: rootEntry?.file ?? null,
    kind: rootEntry?.kind ?? 'group',
    dynamic: false,
    isRouteGroup: false,
    children: walk(APP_DIR, '')
  };
}

export function scanStaticCalcPages(): RouteNode[] {
  const out: RouteNode[] = [];
  let files: string[] = [];
  try {
    files = fs.readdirSync(PUBLIC_CALC_DIR);
  } catch {
    return out;
  }
  for (const f of files) {
    if (!f.endsWith('.html')) continue;
    if (f.startsWith('_')) continue;
    const abs = path.join(PUBLIC_CALC_DIR, f);
    out.push({
      name: f,
      path: '/calc/' + f,
      file: abs,
      kind: 'static',
      dynamic: false,
      isRouteGroup: false,
      children: []
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function flattenUrls(node: RouteNode): string[] {
  const urls: string[] = [];
  if (node.kind === 'page' && !node.dynamic) urls.push(node.path);
  for (const c of node.children) urls.push(...flattenUrls(c));
  return urls;
}

export function countRoutes(node: RouteNode) {
  let pages = 0;
  let api = 0;
  const visit = (n: RouteNode) => {
    if (n.kind === 'page') pages++;
    if (n.kind === 'api') api++;
    n.children.forEach(visit);
  };
  visit(node);
  return {pages, api};
}
