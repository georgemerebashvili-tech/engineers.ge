import http from 'node:http';
import {webcrypto} from 'node:crypto';
import {expect, test, request as pwRequest, type APIRequestContext} from '@playwright/test';
import {SignJWT} from 'jose';

/**
 * Admin authentication · engineers.ge
 *
 * Run against a dev server (PLAYWRIGHT_BASE_URL, default http://localhost:3001
 * per playwright.config.ts) whose env matches the TEST_* values below:
 *
 *   TEST_AUTH_SECRET            = the server's AUTH_SECRET (default: the local dev value)
 *   TEST_ADMIN_USER             = the server's ADMIN_USER (default: local-admin)
 *   TEST_ADMIN_RECOVERY_EMAIL   = the server's ADMIN_RECOVERY_EMAIL (default: owner@example.test)
 *   TEST_ADMIN_PASSWORD         = optional: the admin password, enables the real-login test
 *   MAGIC_E2E_RESEND_URL        = optional: enables the magic-link end-to-end block. The block
 *                                 starts a mock Resend on that host:port, so the dev server must
 *                                 run with RESEND_API_URL set to the SAME url
 *                                 (e.g. RESEND_API_URL=http://127.0.0.1:4010).
 *
 * Tokens are minted here with jose + the same HKDF derivation the app uses
 * (lib/admin-session-token.ts), so nothing secret lives in the app code.
 *
 * Magic-link note: the server hands out at most 6 mails per clock hour, and the
 * block below always uses all of them (its last test is the burst that spends
 * the rest, then checks the honest 429). Rerunning it inside the same hour
 * needs a fresh dev server (the dev claim store is per process).
 */

const AUTH_SECRET =
  process.env.TEST_AUTH_SECRET ?? 'local-dev-only-secret-0123456789abcdef0123456789abcdef';
const ADMIN_USER = process.env.TEST_ADMIN_USER ?? 'local-admin';
const RECOVERY_EMAIL = process.env.TEST_ADMIN_RECOVERY_EMAIL ?? 'owner@example.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const MOCK_RESEND_URL = process.env.MAGIC_E2E_RESEND_URL;

const encoder = new TextEncoder();

async function derive(info: string): Promise<Uint8Array> {
  const ikm = await webcrypto.subtle.importKey('raw', encoder.encode(AUTH_SECRET), 'HKDF', false, [
    'deriveBits'
  ]);
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('engineers.ge'),
      info: encoder.encode(info)
    },
    ikm,
    256
  );
  return new Uint8Array(bits);
}

const now = () => Math.floor(Date.now() / 1000);

/** A token exactly as the app signs a session (override any field to make a bad one). */
async function adminToken(
  o: {
    sub?: string;
    scope?: string;
    aud?: string;
    exp?: number;
    raw?: boolean;
    noExp?: boolean;
  } = {}
): Promise<string> {
  const key = o.raw ? encoder.encode(AUTH_SECRET) : await derive('admin-session/v1');
  const jwt = new SignJWT({scope: o.scope ?? 'admin'})
    .setProtectedHeader({alg: 'HS256'})
    .setSubject(o.sub ?? ADMIN_USER)
    .setAudience(o.aud ?? 'engineers.ge/admin')
    .setIssuedAt(now() - 10);
  if (!o.noExp) jwt.setExpirationTime(o.exp ?? now() + 3600);
  return jwt.sign(key);
}

/** A DMT session as lib/dmt/auth.ts signs it: raw AUTH_SECRET, no audience. */
function dmtToken(): Promise<string> {
  return new SignJWT({
    sub: '7d6f1c2e-0000-4000-8000-000000000001',
    email: 'staff@example.test',
    role: 'owner',
    scope: 'dmt'
  })
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encoder.encode(AUTH_SECRET));
}

/** The admin session as it was signed BEFORE the hardening: raw secret, `{sub}` only. */
function oldFormatAdminToken(): Promise<string> {
  return new SignJWT({sub: ADMIN_USER})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(AUTH_SECRET));
}

async function magicToken(o: {exp?: number; jti?: string} = {}): Promise<string> {
  return new SignJWT({scope: 'admin-magic'})
    .setProtectedHeader({alg: 'HS256'})
    .setJti(o.jti ?? 'e2e-minted-jti-0123456789')
    .setAudience('engineers.ge/admin-magic')
    .setIssuedAt(now() - 10)
    .setExpirationTime(o.exp ?? now() + 900)
    .sign(await derive('admin-magic-link/v1'));
}

type GetOpts = {cookie?: string; rsc?: boolean};

function get(request: APIRequestContext, path: string, {cookie, rsc}: GetOpts = {}) {
  return request.get(path, {
    maxRedirects: 0,
    headers: {
      ...(cookie ? {cookie: `admin_jwt=${cookie}`} : {}),
      ...(rsc ? {RSC: '1'} : {})
    }
  });
}

function expectRedirectToLogin(res: {status(): number; headers(): Record<string, string>}) {
  expect([307, 308]).toContain(res.status());
  expect(new URL(res.headers()['location'], 'http://x.test').pathname).toBe('/admin');
}

/**
 * Each gated page and a string that only appears in ITS server payload. In a
 * dev build the client-module path of the page's own component is such a
 * string. The authenticated control below proves the marker is really present
 * when the page does render — if the bundler's format ever changes, the
 * control fails loudly instead of the leak test passing on a marker that
 * could never match.
 */
const GATED_PAGES: {path: string; marker: string}[] = [
  {path: '/admin/launch-checklist', marker: 'AUTH_SECRET (admin JWT signing)'},
  {path: '/admin/users', marker: 'users/workspace'},
  {path: '/sazeo', marker: 'sazeo/dashboard'},
  {path: '/tag-console', marker: 'tag-console/page'}
];

test.describe('admin gate · anonymous', () => {
  test.setTimeout(90_000);

  for (const {path, marker} of GATED_PAGES) {
    test(`RSC request to ${path} redirects and leaks nothing`, async ({request}) => {
      const res = await get(request, path, {rsc: true});
      expectRedirectToLogin(res);
      const body = await res.text();
      expect(body).not.toContain(marker);
      expect(body).not.toContain('NEXT_REDIRECT');
    });

    test(`control: ${path} really contains its marker for a signed-in admin`, async ({request}) => {
      const res = await get(request, path, {cookie: await adminToken(), rsc: true});
      expect(res.status()).toBe(200);
      expect(await res.text()).toContain(marker);
    });
  }

  test('plain (non-RSC) request redirects too', async ({request}) => {
    expectRedirectToLogin(await get(request, '/admin/launch-checklist'));
  });

  // Next serves the same page under dotted variants (`/sazeo.rsc`, and
  // `/sazeo.segments/...` once segment prefetch is on). Each must be gated
  // exactly like the page itself, not only the `/root/` form.
  for (const path of [
    '/sazeo.rsc',
    '/sazeo.segments/_tree.segment.rsc',
    '/tag-console.segments/_tree.segment.rsc',
    '/audit.sazeo.rsc'
  ]) {
    test(`dotted variant ${path} is gated`, async ({request}) => {
      expectRedirectToLogin(await get(request, path, {rsc: true}));
    });
  }

  // /audit.sazeo is the owner's internal blueprint workspace (docs/TODO.md says
  // "Auth-gated"); its HTML lives in public/audit.sazeo and must not be world-readable.
  for (const path of [
    '/audit.sazeo',
    '/audit.sazeo/iot-bms-blueprint.html',
    '/audit.sazeo/decisions/routing-architecture.html'
  ]) {
    test(`${path} redirects an anonymous visitor`, async ({request}) => {
      expectRedirectToLogin(await get(request, path));
    });
    test(`control: ${path} opens for a signed-in admin`, async ({request}) => {
      const res = await get(request, path, {cookie: await adminToken()});
      expect(res.status()).toBe(200);
    });
  }

  test('the public admin pages stay public', async ({request}) => {
    for (const path of ['/admin', '/admin/forgot', '/admin/magic']) {
      const res = await get(request, path);
      expect(res.status(), path).toBe(200);
    }
  });

  test('sazeo machine endpoints are not behind the session gate', async ({request}) => {
    // events: developer bearer token; github-webhook: HMAC. Both answer for themselves.
    const events = await request.post('/sazeo/api/events', {data: {}, maxRedirects: 0});
    expect(events.status()).toBe(401);
    expect(await events.json()).toEqual({error: 'missing bearer token'});
  });
});

test.describe('admin session · what counts as an admin', () => {
  test.setTimeout(90_000);

  test('a DMT session token pasted as admin_jwt opens nothing', async ({request}) => {
    const cookie = await dmtToken();
    expectRedirectToLogin(await get(request, '/admin/launch-checklist', {cookie}));
    expectRedirectToLogin(await get(request, '/sazeo', {cookie, rsc: true}));
    // The API routes check getSession() themselves (the proxy does not cover /api).
    const api = await request.get('/sazeo/api/state', {headers: {cookie: `admin_jwt=${cookie}`}});
    expect(api.status()).toBe(401);
  });

  test('an old-format admin token (raw secret, only sub) opens nothing', async ({request}) => {
    const cookie = await oldFormatAdminToken();
    expectRedirectToLogin(await get(request, '/admin/launch-checklist', {cookie}));
    const api = await request.get('/sazeo/api/state', {headers: {cookie: `admin_jwt=${cookie}`}});
    expect(api.status()).toBe(401);
  });

  test('a magic-link token cannot be used as a session', async ({request}) => {
    const cookie = await magicToken();
    expectRedirectToLogin(await get(request, '/admin/launch-checklist', {cookie}));
  });

  const BAD: [string, () => Promise<string>][] = [
    ['wrong subject', () => adminToken({sub: 'someone-else'})],
    ['wrong scope', () => adminToken({scope: 'dmt'})],
    ['wrong audience', () => adminToken({aud: 'engineers.ge/dmt'})],
    ['expired', () => adminToken({exp: now() - 60})],
    ['no expiry claim', () => adminToken({noExp: true})],
    ['signed with the raw secret', () => adminToken({raw: true})]
  ];
  for (const [label, mint] of BAD) {
    test(`a new-format admin token with ${label} opens nothing`, async ({request}) => {
      expectRedirectToLogin(await get(request, '/admin/launch-checklist', {cookie: await mint()}));
    });
  }

  test('a valid new admin token opens the admin pages', async ({request}) => {
    const cookie = await adminToken();
    const res = await get(request, '/admin/launch-checklist', {cookie});
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('AUTH_SECRET (admin JWT signing)');
    // Not a redirect (the proxy must leave /sazeo/api/* alone) and not a 401 (the
    // session is accepted). The route itself then talks to Supabase, so on a dev
    // server without it the answer is a 500: only "not 307/308/401" can be asserted.
    const api = await request.get('/sazeo/api/state', {
      headers: {cookie: `admin_jwt=${cookie}`},
      maxRedirects: 0
    });
    expect([307, 308, 401]).not.toContain(api.status());
  });

  test('password login issues a session the gate accepts', async ({request}) => {
    test.skip(!ADMIN_PASSWORD, 'set TEST_ADMIN_PASSWORD to run the real-login check');
    const login = await request.post('/api/admin/login', {
      data: {username: ADMIN_USER, password: ADMIN_PASSWORD}
    });
    expect(login.status()).toBe(200);
    const setCookie = login.headers()['set-cookie'] ?? '';
    expect(setCookie).toMatch(/admin_jwt=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    // The request context keeps the cookie jar: no cookie header needed now.
    const page = await get(request, '/admin/launch-checklist');
    expect(page.status()).toBe(200);
  });
});

/* ------------------------------------------------------------ magic link */

test.describe('magic link · request guard (no mail involved)', () => {
  test.setTimeout(90_000);

  // A cross-site <form enctype="text/plain"> can POST a JSON-looking body
  // without a CORS preflight; both routes must refuse anything that is not a
  // same-origin application/json request. All of these are refused BEFORE any
  // mail slot or token is touched.
  for (const path of ['/api/admin/magic-link/request', '/api/admin/magic-link/consume']) {
    test(`${path} refuses text/plain`, async ({request}) => {
      const res = await request.post(path, {
        headers: {'content-type': 'text/plain'},
        data: JSON.stringify({email: 'stranger@example.test', t: 'x'})
      });
      expect(res.status()).toBe(415);
      expect(await res.json()).toEqual({error: 'unsupported_media_type'});
    });

    test(`${path} refuses a cross-site browser request`, async ({request}) => {
      const res = await request.post(path, {
        headers: {'sec-fetch-site': 'cross-site'},
        data: {email: 'stranger@example.test', t: 'x'}
      });
      expect(res.status()).toBe(403);
      expect(await res.json()).toEqual({error: 'forbidden'});
    });
  }
});

type Mail = {auth?: string; to: string[]; from: string; subject: string; html: string; text: string};

test.describe.serial('magic link · end to end (needs a Resend mock)', () => {
  test.setTimeout(90_000);
  // The group spends single-use tokens and the hourly mail slots, so a retry
  // would only rerun against a spent server and hide the first failure's cause.
  test.describe.configure({retries: 0});
  test.skip(
    !MOCK_RESEND_URL,
    'set MAGIC_E2E_RESEND_URL=http://127.0.0.1:<port> and start the dev server with RESEND_API_URL=<same url>'
  );

  const mails: Mail[] = [];
  let server: http.Server | undefined;
  let hourAtStart = 0;
  let link = '';
  let token = '';

  test.beforeAll(async () => {
    if (!MOCK_RESEND_URL) return;
    const u = new URL(MOCK_RESEND_URL);
    hourAtStart = Math.floor(Date.now() / 3_600_000);
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        if (req.method === 'POST' && req.url === '/emails') {
          const body = JSON.parse(raw) as Omit<Mail, 'auth'>;
          mails.push({...body, auth: req.headers.authorization});
        }
        res.setHeader('content-type', 'application/json');
        res.end('{"id":"mock"}');
      });
    });
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(Number(u.port), u.hostname, () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  });

  const requestLink = (request: APIRequestContext, email: string, ip: string) =>
    request.post('/api/admin/magic-link/request', {
      data: {email},
      headers: {'x-forwarded-for': ip}
    });

  // A fresh client address per call, so failed attempts in one test can never
  // add up to the per-IP lock (6 invalid tokens in 10 minutes) for another, and
  // a rerun inside 60 s never meets the per-IP mail gap of the previous run.
  const randomIp = () => `198.51.100.${1 + Math.floor(Math.random() * 250)}`;

  const consume = (request: APIRequestContext, t: string) =>
    request.post('/api/admin/magic-link/consume', {
      data: {t},
      headers: {'x-forwarded-for': randomIp()}
    });

  test('request → mail → consume → admin session', async ({request}) => {
    const before = mails.length;
    const res = await requestLink(request, ` ${RECOVERY_EMAIL.toUpperCase()} `, randomIp());
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ok: true});

    expect(
      mails.length - before,
      'no mail reached the mock: either sending is broken, RESEND_API_URL of the dev server does not point at the mock, or the 6-per-hour slot cap is used up by an earlier run (restart the dev server)'
    ).toBe(1);
    const mail = mails[mails.length - 1];
    expect(mail.to).toEqual([RECOVERY_EMAIL.toLowerCase()]);
    expect(mail.subject).toBe('engineers.ge — ადმინში შესასვლელი ბმული');
    expect(mail.html).toContain('ადმინში შესვლა');
    expect(mail.html + mail.text).toContain('15 წუთი');
    const m = mail.text.match(/\/admin\/magic#t=([A-Za-z0-9_.-]+)/);
    expect(m, 'the mail must carry /admin/magic#t=<token>').not.toBeNull();
    token = m![1];
    link = mail.text.match(/https?:\/\/\S+\/admin\/magic#t=\S+/)![0];
    // The token travels in the fragment only: no query string, no path segment.
    expect(link).not.toContain('?');

    const done = await consume(request, token);
    expect(done.status()).toBe(200);
    expect(await done.json()).toEqual({ok: true});
    const setCookie = done.headers()['set-cookie'] ?? '';
    expect(setCookie).toMatch(/admin_jwt=/);
    expect(setCookie).toMatch(/HttpOnly/i);

    // The same context now carries the session cookie.
    const page = await get(request, '/admin/launch-checklist');
    expect(page.status()).toBe(200);
    expect(await page.text()).toContain('AUTH_SECRET (admin JWT signing)');

    // Double click / second tab with the session: still ok, nothing consumed twice.
    const again = await consume(request, token);
    expect(again.status()).toBe(200);
  });

  test('the same link is single use', async () => {
    const fresh = await pwRequest.newContext({baseURL: test.info().project.use.baseURL});
    try {
      const res = await consume(fresh, token);
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({error: 'used'});
    } finally {
      await fresh.dispose();
    }
  });

  test('tampered, expired and garbage tokens are refused', async ({request}) => {
    const [h, p, s] = token.split('.');
    const flipped = s[0] === 'A' ? 'B' : 'A';
    const tampered = [h, p, flipped + s.slice(1)].join('.');
    let res = await consume(request, tampered);
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({error: 'invalid'});

    res = await consume(request, await magicToken({exp: now() - 60, jti: 'e2e-expired-jti-012345'}));
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({error: 'expired'});

    res = await consume(request, 'not-a-token');
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({error: 'invalid'});

    // An admin SESSION token is not a magic token.
    res = await consume(request, await adminToken());
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({error: 'invalid'});
  });

  test('a minted valid token works once, then is used', async () => {
    const jti = `e2e-minted-${Date.now()}-abcdef`;
    const t = await magicToken({jti});
    const a = await pwRequest.newContext({baseURL: test.info().project.use.baseURL});
    const b = await pwRequest.newContext({baseURL: test.info().project.use.baseURL});
    try {
      expect((await consume(a, t)).status()).toBe(200);
      const second = await consume(b, t);
      expect(second.status()).toBe(400);
      expect(await second.json()).toEqual({error: 'used'});
    } finally {
      await a.dispose();
      await b.dispose();
    }
  });

  test('a non-matching address gets the same answer and no mail', async ({request}) => {
    const before = mails.length;
    const res = await requestLink(request, 'stranger@example.test', randomIp());
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ok: true});
    await new Promise((r) => setTimeout(r, 500));
    expect(mails.length).toBe(before);
  });

  test('a malformed address is a 400, not a silent 200', async ({request}) => {
    const res = await requestLink(request, 'not-an-email', randomIp());
    expect(res.status()).toBe(400);
  });

  test('parallel requests from different IPs: exactly the hourly cap is sent, the rest get an honest 429', async () => {
    // Runs last: it deliberately burns whatever slots are left.
    const mailsBefore = mails.length;
    const ctxs = await Promise.all(
      Array.from({length: 10}, () => pwRequest.newContext({baseURL: test.info().project.use.baseURL}))
    );
    try {
      const results = await Promise.all(
        ctxs.map((c, i) => requestLink(c, RECOVERY_EMAIL, `203.0.113.${100 + i}`))
      );
      const statuses = results.map((r) => r.status());
      for (const r of results) {
        expect([200, 429], 'a matched request is either sent (200) or refused honestly (429)').toContain(
          r.status()
        );
        const body = (await r.json()) as {ok?: boolean; error?: string; wait_seconds?: number};
        if (r.status() === 200) expect(body).toEqual({ok: true});
        else expect(body.error).toBe('throttled');
      }
      await new Promise((r) => setTimeout(r, 1000));

      // Every 200 for the matching address is exactly one mail, and nothing else sent one.
      const sentNow = mails.length - mailsBefore;
      expect(statuses.filter((s) => s === 200).length).toBe(sentNow);

      const hourAtEnd = Math.floor(Date.now() / 3_600_000);
      const sameHour = hourAtEnd === hourAtStart;
      if (sameHour) {
        // 6 slots for the whole site: 1 sent by the first test + the 5 left, no more, no fewer.
        expect(mails.length).toBe(6);
      } else {
        // The file crossed a clock-hour boundary once: two sets of 6 slots, never beyond.
        expect(mails.length).toBeGreaterThanOrEqual(6);
        expect(mails.length).toBeLessThanOrEqual(12);
      }

      if (sameHour) {
        // The cap is used up: EVERYONE (matching address or not) now gets the same
        // honest 429 with the seconds to the next hour, never a silent 200.
        for (const email of [RECOVERY_EMAIL, 'stranger@example.test']) {
          const r = await requestLink(ctxs[0], email, randomIp());
          const stillSameHour = Math.floor(Date.now() / 3_600_000) === hourAtStart;
          if (!stillSameHour) break;
          expect(r.status(), email).toBe(429);
          const body = (await r.json()) as {error?: string; wait_seconds?: number};
          expect(body.error).toBe('throttled');
          expect(body.wait_seconds).toBeGreaterThan(0);
          expect(body.wait_seconds).toBeLessThanOrEqual(3600);
        }
        expect(mails.length).toBe(6);
      }
    } finally {
      await Promise.all(ctxs.map((c) => c.dispose()));
    }
  });
});
