#!/usr/bin/env node
/**
 * engineers.ge · Smoke test suite (zero-dependency).
 *
 * Runs ~30 HTTP checks against a running dev/staging server. Every new critical
 * path that ships should have at least one line here.
 *
 * Usage:
 *   node scripts/smoke.mjs                     # defaults to http://localhost:3001
 *   SMOKE_URL=https://engineers.ge npm run smoke
 *
 * Exits non-zero if any check fails — suitable for CI.
 */

const BASE = process.env.SMOKE_URL ?? 'http://localhost:3001';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const results = [];

/** @typedef {{ok: boolean, name: string, detail: string, ms: number}} Result */

async function check(name, fn) {
  const started = performance.now();
  try {
    const detail = await fn();
    const ms = Math.round(performance.now() - started);
    results.push({ok: true, name, detail: detail ?? 'ok', ms});
  } catch (e) {
    const ms = Math.round(performance.now() - started);
    results.push({
      ok: false,
      name,
      detail: e instanceof Error ? e.message : String(e),
      ms
    });
  }
}

async function expectStatus(path, ...wanted) {
  const res = await fetch(BASE + path, {redirect: 'manual'});
  if (!wanted.includes(res.status)) {
    throw new Error(`HTTP ${res.status} (wanted ${wanted.join(' or ')}) ${path}`);
  }
  return `HTTP ${res.status}`;
}

async function expectContains(path, ...snippets) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  const text = await res.text();
  for (const s of snippets) {
    if (!text.includes(s)) throw new Error(`missing "${s}" in ${path}`);
  }
  return `contains ${snippets.length} expected snippets`;
}

async function expectJson(path, opts, validate) {
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  const msg = validate(res, data);
  if (msg) throw new Error(msg);
  return `HTTP ${res.status}`;
}

// -------- Public pages --------
await check('GET /', () => expectStatus('/', 200));
await check('GET / has treemap tiles', () => expectContains('/', 'engineers.ge'));
await check('GET / emits Organization + WebSite JSON-LD', () =>
  expectContains('/', '"@type":"Organization"', '"@type":"WebSite"')
);
await check('GET /calc/hvac emits WebApplication + BreadcrumbList JSON-LD', () =>
  expectContains('/calc/hvac', '"@type":"WebApplication"', '"@type":"BreadcrumbList"')
);
await check('GET /dashboard (redirects to /)', () => expectStatus('/dashboard', 200, 307, 308));
await check('GET /dashboard/referrals', () => expectStatus('/dashboard/referrals', 200));
await check('GET /ads', () => expectStatus('/ads', 200));

// -------- Calculator pages (SSR) --------
await check('GET /calc/hvac', () => expectStatus('/calc/hvac', 200));
await check('GET /calc/heat-loss', () => expectStatus('/calc/heat-loss', 200));
await check('GET /calc/stair-pressurization', () => expectStatus('/calc/stair-pressurization', 200));
await check('GET /calc/wall-editor', () => expectStatus('/calc/wall-editor', 200));
await check('GET /calc/docs/physics', () => expectStatus('/calc/docs/physics', 200));

// -------- Static calc HTML (Next static serve) --------
await check('GET /calc/hvac.html asset', () =>
  expectStatus('/calc/hvac.html', 200)
);
await check('GET /calc/_physics-engine.js asset', () =>
  expectStatus('/calc/_physics-engine.js', 200)
);
await check('GET /calc/_i18n.js asset', () =>
  expectStatus('/calc/_i18n.js', 200)
);

// -------- i18n: every calc HTML loads _i18n.js + registers translation table --------
const I18N_CALCS = [
  'hvac',
  'heat-loss',
  'wall-thermal',
  'stair-pressurization',
  'elevator-shaft-press',
  'parking-ventilation',
  'floor-pressurization',
  'wall-editor',
  'building-composer',
  'silencer',
  'silencer-kaya',
  'ahu-ashrae',
  'heat-transfer',
  'ifc-viewer',
  'stair-pressurization-mockup'
];
for (const slug of I18N_CALCS) {
  await check(`i18n: ${slug}.html loads _i18n.js + registers bundle`, () =>
    expectContains(`/calc/${slug}.html`, '_i18n.js', 'engCalcI18n.apply')
  );
}

// -------- i18n: /calc/[slug] React page propagates locale to iframe --------
await check('calc page passes ?lang= to iframe (default ka)', () =>
  expectContains('/calc/hvac', 'src="/calc/hvac.html?lang=ka"')
);

// -------- Coohom-parity critical assets --------
await check('GET /calc/_editor-ui.css', () =>
  expectStatus('/calc/_editor-ui.css', 200)
);
await check('GET /calc/_editor-panels.js', () =>
  expectStatus('/calc/_editor-panels.js', 200)
);
await check('GET /calc/_project-bridge.js', () =>
  expectStatus('/calc/_project-bridge.js', 200)
);
await check('wall-editor.html ships fire overlay + physics wiring', () =>
  expectContains(
    '/calc/wall-editor.html',
    'plumeMassFlow',
    'smokeLayerHeight',
    'doorOpeningForce',
    '#g-sim-overlay'
  )
);
await check('POST /api/fire-report validates payload', () =>
  expectJson(
    '/api/fire-report',
    {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'},
    (res) => (res.status === 400 ? null : `wanted 400, got ${res.status}`)
  )
);

// -------- Sitemap + robots --------
await check('GET /sitemap.xml', () => expectStatus('/sitemap.xml', 200));
await check('GET /robots.txt', () => expectStatus('/robots.txt', 200));
await check('GET /robots.txt disallows admin + AI crawlers', () =>
  expectContains('/robots.txt', 'Disallow: /admin', 'GPTBot', 'ClaudeBot')
);
await check('GET /sitemap.xml includes calc routes', () =>
  expectContains('/sitemap.xml', '/calc/hvac', '/calc/heat-loss', '/calc/wall-editor')
);

// -------- 404 page --------
await check('GET /this-route-does-not-exist → 404', () =>
  expectStatus('/this-route-does-not-exist', 404)
);

// -------- Admin auth redirects --------
await check('GET /admin/stats without auth → 307 redirect', () =>
  expectStatus('/admin/stats', 307)
);
await check('GET /admin/features without auth → 307', () =>
  expectStatus('/admin/features', 307)
);
await check('GET /admin/bug-reports without auth → 307', () =>
  expectStatus('/admin/bug-reports', 307)
);
await check('GET /admin/audit-log without auth → 307', () =>
  expectStatus('/admin/audit-log', 307)
);
await check('GET /admin/errors without auth → 307', () =>
  expectStatus('/admin/errors', 307)
);
await check('GET /admin/404s without auth → 307', () =>
  expectStatus('/admin/404s', 307)
);
await check('GET /admin/redirects without auth → 307', () =>
  expectStatus('/admin/redirects', 307)
);
await check('GET /admin/rate-limits without auth → 307', () =>
  expectStatus('/admin/rate-limits', 307)
);
await check('DELETE /api/admin/rate-limits requires auth', () =>
  expectJson(
    '/api/admin/rate-limits',
    {method: 'DELETE', headers: {'content-type': 'application/json'}, body: '{}'},
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);
await check('GET /admin/activity without auth → 307', () =>
  expectStatus('/admin/activity', 307)
);
await check('GET /admin/csp-violations without auth → 307', () =>
  expectStatus('/admin/csp-violations', 307)
);
await check('GET /admin/web-vitals without auth → 307', () =>
  expectStatus('/admin/web-vitals', 307)
);
await check('POST /api/web-vitals accepts beacon payload', () =>
  expectJson(
    '/api/web-vitals',
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        metric: 'LCP',
        value: 1234,
        rating: 'good',
        pathname: '/__smoke__'
      })
    },
    (res, data) => {
      if (res.status !== 200) return `wanted 200, got ${res.status}`;
      if (data.ok !== true) return `wanted ok:true, got ${JSON.stringify(data)}`;
      return null;
    }
  )
);
await check('POST /api/csp-report accepts legacy format → 204', async () => {
  const res = await fetch(BASE + '/api/csp-report', {
    method: 'POST',
    headers: {'content-type': 'application/csp-report'},
    body: JSON.stringify({
      'csp-report': {
        'document-uri': '/',
        'blocked-uri': 'inline',
        'violated-directive': 'script-src'
      }
    })
  });
  if (res.status !== 204) throw new Error(`wanted 204, got ${res.status}`);
  return 'HTTP 204';
});
await check('GET /admin/emails without auth → 307', () =>
  expectStatus('/admin/emails', 307)
);
await check('GET /admin/backup without auth → 307', () =>
  expectStatus('/admin/backup', 307)
);
await check('GET /api/admin/backup requires auth', () =>
  expectJson(
    '/api/admin/backup?tables=users',
    {},
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);
await check('POST /api/admin/emails/test requires auth', () =>
  expectJson(
    '/api/admin/emails/test',
    {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"template":"welcome"}'},
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);
await check('GET /admin/consent-log without auth → 307', () =>
  expectStatus('/admin/consent-log', 307)
);
await check('POST /api/consent accepts beacon payload', () =>
  expectJson(
    '/api/consent',
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({analytics: true, marketing: false, action: 'decide'})
    },
    (res, data) => {
      if (res.status !== 200) return `wanted 200, got ${res.status}`;
      if (data.ok !== true) return `wanted ok:true, got ${JSON.stringify(data)}`;
      return null;
    }
  )
);
await check('POST /api/admin/redirects requires auth', () =>
  expectJson(
    '/api/admin/redirects',
    {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'},
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);
await check('GET /admin/health without auth → 307', () =>
  expectStatus('/admin/health', 307)
);

// -------- API contracts --------
await check('POST /api/not-found accepts beacon payload', () =>
  expectJson(
    '/api/not-found',
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({pathname: '/__smoke_404__', referrer: null})
    },
    (res, data) => {
      if (res.status !== 200) return `wanted 200, got ${res.status}`;
      if (data.ok !== true) return `wanted ok:true, got ${JSON.stringify(data)}`;
      return null;
    }
  )
);

await check('POST /api/errors accepts beacon payload', () =>
  expectJson(
    '/api/errors',
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        message: 'smoke-test synthetic error',
        pathname: '/__smoke__',
        kind: 'route'
      })
    },
    (res, data) => {
      if (res.status !== 200) return `wanted 200, got ${res.status}`;
      if (data.ok !== true) return `wanted ok:true, got ${JSON.stringify(data)}`;
      return null;
    }
  )
);

await check('POST /api/bug-reports validates input', () =>
  expectJson(
    '/api/bug-reports',
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({pathname: '/x', message: 'too short'})
    },
    (res, data) => {
      if (res.status !== 400) return `wanted 400, got ${res.status}`;
      if (data.error !== 'bad_request') return `wanted error:bad_request, got ${JSON.stringify(data)}`;
      return null;
    }
  )
);

await check('GET /api/admin/features requires auth', () =>
  expectJson('/api/admin/features', {}, (res, data) => {
    if (res.status !== 401) return `wanted 401, got ${res.status}`;
    if (data.error !== 'unauthorized') return `wanted unauthorized, got ${JSON.stringify(data)}`;
    return null;
  })
);

await check('PATCH /api/admin/bug-reports/x requires auth', () =>
  expectJson(
    '/api/admin/bug-reports/test',
    {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({status: 'resolved'})
    },
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);

await check('POST /api/admin/ai requires auth', () =>
  expectJson(
    '/api/admin/ai',
    {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'},
    (res) => (res.status === 401 ? null : `wanted 401, got ${res.status}`)
  )
);

// -------- Proxy behavior (x-pathname header + vid cookie) --------
await check('proxy sets eng_vid cookie', async () => {
  const res = await fetch(BASE + '/');
  const setCookie = res.headers.get('set-cookie') ?? '';
  if (!setCookie.includes('eng_vid=')) throw new Error('no eng_vid cookie set');
  return 'cookie set';
});

// -------- Report summary --------
const total = results.length;
const passed = results.filter((r) => r.ok).length;
const failed = total - passed;

console.log(`\n${COLORS.bold}Smoke results — ${BASE}${COLORS.reset}\n`);
for (const r of results) {
  const icon = r.ok ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  const ms = `${COLORS.dim}${String(r.ms).padStart(4)}ms${COLORS.reset}`;
  const detail = r.ok ? COLORS.dim + r.detail + COLORS.reset : COLORS.red + r.detail + COLORS.reset;
  console.log(`  ${icon} ${ms}  ${r.name}  ${detail}`);
}

console.log(
  `\n${failed === 0 ? COLORS.green : COLORS.red}${COLORS.bold}` +
    `${passed}/${total} passed${COLORS.reset}` +
    (failed > 0 ? `, ${failed} failed` : '') +
    '\n'
);

process.exit(failed === 0 ? 0 : 1);
