import 'server-only';
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {SignJWT, jwtVerify, errors} from 'jose';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {getDerivedKey, readEnv} from '@/lib/admin-session-token';

/**
 * E-mail magic link for the single admin account.
 *
 * Design (decided, see the commit message):
 *  - The link is a short-lived (15 min) HS256 JWT in the URL FRAGMENT
 *    (`/admin/magic#t=<jwt>`), so it never reaches a server log or a Referer.
 *    It carries no e-mail and no subject: only `scope`, `jti`, `aud`, `iat`, `exp`.
 *  - Signed with its own HKDF key (info "admin-magic-link/v1"), different from
 *    the session key, so a magic token can never verify as a session and the
 *    reverse.
 *  - Single use is enforced server-side: consuming inserts `used:<jti>` into the
 *    existing `rate_limits` table (PK (bucket,key)); only the first insert wins.
 *  - Not bound to the requesting browser (a phone / in-app browser must work).
 *    Mailbox access + the ability to request IS the login, as with any e-mail login.
 *  - Sending is capped at 6 mails per clock hour for the whole site, claimed
 *    atomically in the same table (`send:<epoch-hour>:<n>`).
 *
 * No migration: `rate_limits` already exists in production (0012) and has no
 * check constraint on `bucket`.
 */

export const MAGIC_AUDIENCE = 'engineers.ge/admin-magic';
export const MAGIC_SCOPE = 'admin-magic';
export const MAGIC_TTL_SECONDS = 15 * 60;
export const MAGIC_SEND_SLOTS_PER_HOUR = 6;
export const MAGIC_IP_GAP_MS = 60_000;

const MAGIC_KEY_INFO = 'admin-magic-link/v1';
const RL_BUCKET = 'admin_magic';
const DEFAULT_MAIL_FROM = 'engineers.ge <no-reply@engineers.ge>';
const DEFAULT_RESEND_URL = 'https://api.resend.com';
const DEFAULT_PRODUCTION_ORIGIN = 'https://engineers.ge';

/* ------------------------------------------------------------------ token */

export async function mintMagicToken(): Promise<string | null> {
  const key = await getDerivedKey(MAGIC_KEY_INFO);
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({scope: MAGIC_SCOPE})
    .setProtectedHeader({alg: 'HS256'})
    .setJti(randomBytes(16).toString('base64url'))
    .setAudience(MAGIC_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + MAGIC_TTL_SECONDS)
    .sign(key);
}

const JTI_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export type MagicVerifyResult =
  | {ok: true; jti: string}
  | {ok: false; reason: 'expired'; jti: string | null}
  | {ok: false; reason: 'invalid'};

/**
 * `expired` is returned only for a token whose signature verified (jose checks
 * the signature before the claims), so it is safe to audit-log, and it carries
 * the token id so the log can be limited to one row per token; every other
 * failure is `invalid`.
 */
export async function verifyMagicToken(token: string): Promise<MagicVerifyResult> {
  const key = await getDerivedKey(MAGIC_KEY_INFO);
  if (!key) return {ok: false, reason: 'invalid'};
  try {
    const {payload} = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      audience: MAGIC_AUDIENCE,
      requiredClaims: ['exp', 'jti']
    });
    if (payload.scope !== MAGIC_SCOPE) return {ok: false, reason: 'invalid'};
    const jti = payload.jti;
    if (typeof jti !== 'string' || !JTI_PATTERN.test(jti)) {
      return {ok: false, reason: 'invalid'};
    }
    return {ok: true, jti};
  } catch (e) {
    if (e instanceof errors.JWTExpired) {
      const jti = e.payload?.jti;
      return {
        ok: false,
        reason: 'expired',
        jti: typeof jti === 'string' && JTI_PATTERN.test(jti) ? jti : null
      };
    }
    return {ok: false, reason: 'invalid'};
  }
}

/* ------------------------------------------------- server-side claim store */

export type ClaimResult = 'claimed' | 'taken' | 'error';

type ClaimGlobal = typeof globalThis & {__adminMagicClaims?: Set<string>};

/**
 * Development-only fallback: with no Supabase configured locally the claim
 * store would always fail closed and the flow could never be exercised. This
 * switches to a per-process Set ONLY outside production AND only when the
 * Supabase env is absent. In production it is never used — a DB error there
 * fails closed (503), exactly as the design requires.
 */
function memoryClaimsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function memoryClaims(): Set<string> {
  const g = globalThis as ClaimGlobal;
  return (g.__adminMagicClaims ??= new Set<string>());
}

/** Atomically claims `bucket=admin_magic, key=<key>`; only the first caller gets 'claimed'. */
async function claimRow(key: string): Promise<ClaimResult> {
  if (memoryClaimsEnabled()) {
    const set = memoryClaims();
    if (set.has(key)) return 'taken';
    set.add(key);
    return 'claimed';
  }
  try {
    const {data, error} = await supabaseAdmin()
      .from('rate_limits')
      .upsert({bucket: RL_BUCKET, key}, {onConflict: 'bucket,key', ignoreDuplicates: true})
      .select();
    if (error) {
      console.error('[admin-magic] claim failed', error.message);
      return 'error';
    }
    return data && data.length > 0 ? 'claimed' : 'taken';
  } catch (e) {
    console.error('[admin-magic] claim failed', e instanceof Error ? e.message : e);
    return 'error';
  }
}

const HOUR_MS = 3_600_000;

/** Claims one of the 6 mail slots of the current clock hour. 'taken' = none left. */
export async function claimSendSlot(nowMs: number = Date.now()): Promise<ClaimResult> {
  const hour = Math.floor(nowMs / HOUR_MS);
  for (let n = 0; n < MAGIC_SEND_SLOTS_PER_HOUR; n++) {
    const r = await claimRow(`send:${hour}:${n}`);
    if (r !== 'taken') return r;
  }
  return 'taken';
}

/**
 * Read-only: are all 6 slots of the current clock hour used? Slots are claimed
 * in order 0..5, so slot 5 existing means every slot is gone. This is global
 * state, independent of any submitted address, so the request route can answer
 * it honestly (429) to EVERYONE instead of the silent 200 that left the owner
 * waiting for a mail that was never sent. It is only an early answer: the
 * atomic claim in claimSendSlot stays the real guard, so a read error here
 * simply falls through to it.
 */
export async function sendSlotsExhausted(nowMs: number = Date.now()): Promise<boolean> {
  const key = `send:${Math.floor(nowMs / HOUR_MS)}:${MAGIC_SEND_SLOTS_PER_HOUR - 1}`;
  if (memoryClaimsEnabled()) return memoryClaims().has(key);
  try {
    const {data, error} = await supabaseAdmin()
      .from('rate_limits')
      .select('key')
      .eq('bucket', RL_BUCKET)
      .eq('key', key)
      .limit(1);
    if (error) {
      console.error('[admin-magic] slot check failed', error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (e) {
    console.error('[admin-magic] slot check failed', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Seconds until the next clock hour, when a fresh set of 6 slots opens. */
export function secondsUntilNextSlotHour(nowMs: number = Date.now()): number {
  const next = (Math.floor(nowMs / HOUR_MS) + 1) * HOUR_MS;
  return Math.max(1, Math.ceil((next - nowMs) / 1000));
}

/** First caller for this token id wins; everyone else gets 'taken'. */
export function claimTokenUse(jti: string): Promise<ClaimResult> {
  return claimRow(`used:${jti}`);
}

/**
 * True only for the first caller per (token id, reason). Replaying one real
 * link (expired or already used) must not write one audit row per request, so
 * the consume route logs a failure only when this claims. A store error means
 * "do not log": the audit trail is not worth a flood.
 */
export async function claimFailureNotice(jti: string, reason: 'expired' | 'used'): Promise<boolean> {
  return (await claimRow(`failed:${jti}:${reason}`)) === 'claimed';
}

/* ---------------------------------------------------------------- helpers */

/**
 * Guard for the two JSON POST routes. A cross-site `<form enctype="text/plain">`
 * can POST a JSON-looking body without a CORS preflight, so the routes must not
 * accept anything but a same-origin `application/json` request:
 *  - `Sec-Fetch-Site` (sent by every current browser) must be `same-origin`
 *    (or `none`); absent = a non-browser client such as curl or the test
 *    runner, which is not a CSRF vector, so it passes;
 *  - the body must declare `application/json` (a cross-site request cannot,
 *    without a preflight the server never answers).
 * Returns the error to send, or null when the request may proceed.
 */
export function rejectUnsafeJsonPost(
  headers: Headers
): {status: 403 | 415; error: 'forbidden' | 'unsupported_media_type'} | null {
  const site = headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none') {
    return {status: 403, error: 'forbidden'};
  }
  const type = headers.get('content-type')?.trim().toLowerCase() ?? '';
  if (type !== 'application/json' && !type.startsWith('application/json;')) {
    return {status: 415, error: 'unsupported_media_type'};
  }
  return null;
}

/** Constant-time string equality (hash first so lengths do not matter). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function expandIpv6(addr: string): string[] | null {
  const noZone = addr.split('%')[0];
  const halves = noZone.split('::');
  if (halves.length > 2) return null;
  const groups = (s: string): string[] | null => {
    if (!s) return [];
    const out: string[] = [];
    for (const g of s.split(':')) {
      if (g.includes('.')) {
        const m = g.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (!m) return null;
        const [a, b, c, d] = m.slice(1).map(Number);
        if ([a, b, c, d].some((n) => n > 255)) return null;
        out.push(((a << 8) | b).toString(16), ((c << 8) | d).toString(16));
      } else if (/^[0-9a-f]{1,4}$/.test(g)) {
        out.push(g);
      } else {
        return null;
      }
    }
    return out;
  };
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  if (!head || !tail) return null;
  if (halves.length === 1) {
    return head.length === 8 ? head.map((g) => g.padStart(4, '0')) : null;
  }
  const fill = 8 - head.length - tail.length;
  if (fill < 1) return null;
  return [...head, ...Array<string>(fill).fill('0'), ...tail].map((g) =>
    g.padStart(4, '0')
  );
}

/**
 * Per-client key for the 60 s gap: IPv4 as is, IPv6 reduced to its /64 (one
 * household/host owns a whole /64, so rotating the low 64 bits must not
 * dodge the gap). Anything unparseable shares the key `unknown`.
 */
export function ipRateKey(ip: string | null | undefined): string {
  const raw = ip?.trim().toLowerCase();
  if (!raw) return 'unknown';
  const mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  const candidate = mapped ? mapped[1] : raw;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(candidate)) return candidate;
  if (candidate.includes(':')) {
    const full = expandIpv6(candidate);
    return full ? `${full.slice(0, 4).join(':')}::/64` : 'unknown';
  }
  return 'unknown';
}

/**
 * Where the link points. NEXT_PUBLIC_SITE_URL, else https://engineers.ge in
 * production, else (development only) the origin of the request URL. The Host
 * header is never used in production: a forged Host must not be able to put an
 * attacker's domain into a login mail.
 */
export function magicLinkOrigin(requestUrl: string): string {
  const configured = readEnv('NEXT_PUBLIC_SITE_URL');
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the safe defaults
    }
  }
  if (process.env.NODE_ENV === 'production') return DEFAULT_PRODUCTION_ORIGIN;
  return new URL(requestUrl).origin;
}

export function buildMagicLink(origin: string, token: string): string {
  return `${origin}/admin/magic#t=${token}`;
}

/* ------------------------------------------------------------------ e-mail */

const MAIL_SUBJECT = 'engineers.ge — ადმინში შესასვლელი ბმული';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMagicMail(link: string): {subject: string; html: string; text: string} {
  const safe = escapeHtml(link);
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:20px;line-height:1.5">
      <h2 style="color:#1a3a6b">engineers.ge — ადმინში შესვლა</h2>
      <p style="text-align:center;margin:24px 0">
        <a href="${safe}" style="background:#1f6fd4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">ადმინში შესვლა</a>
      </p>
      <p style="font-size:12px;color:#7a96b8;word-break:break-all">ან დააკოპირე ბმული: ${safe}</p>
      <p style="color:#7a96b8;font-size:12px">ბმული მოქმედებს 15 წუთი და მხოლოდ ერთხელ.</p>
      <p style="color:#7a96b8;font-size:12px">თუ შენ არ მოგითხოვია — უბრალოდ წაშალე ეს წერილი.</p>
    </div>`;
  const text = [
    'engineers.ge — ადმინში შესვლა',
    '',
    `ადმინში შესვლა: ${link}`,
    '',
    'ბმული მოქმედებს 15 წუთი და მხოლოდ ერთხელ.',
    'თუ შენ არ მოგითხოვია — უბრალოდ წაშალე ეს წერილი.'
  ].join('\n');
  return {subject: MAIL_SUBJECT, html, text};
}

export type SendResult = 'sent' | 'logged' | 'failed';

/**
 * The admin login mail has its OWN key and sender: `ADMIN_MAIL_RESEND_API_KEY`
 * and `ADMIN_MAIL_FROM` — never the site-wide `RESEND_API_KEY` / `MAIL_FROM`.
 * Measured 27.11.2026: setting the site-wide key to enable this one mail
 * switched on ~10 other dormant mail flows at once (user e-mail verification
 * and password reset, TBC/construction onboarding passwords and resets, tender
 * announcements to suppliers), all sending from the admin's sender domain.
 * A dedicated variable keeps enabling admin sign-in from enabling anything else.
 */
export function adminMailKey(): string {
  return readEnv('ADMIN_MAIL_RESEND_API_KEY');
}

/**
 * Sends the link through Resend (`POST ${RESEND_API_URL}/emails`).
 * RESEND_API_URL exists so tests can point the dev server at a local mock; it
 * is IGNORED in production, so a stray copy of a dev env file can never send
 * the Resend key and the login link to another host. With neither
 * ADMIN_MAIL_RESEND_API_KEY nor RESEND_API_URL set, outside production, the
 * link is printed to the server console instead (never in production: a log
 * line there would be a credential in a log).
 */
export async function sendMagicMail(opts: {to: string; link: string}): Promise<SendResult> {
  const isProd = process.env.NODE_ENV === 'production';
  const key = adminMailKey();
  const apiUrl = isProd ? '' : readEnv('RESEND_API_URL');

  if (!isProd && !key && !apiUrl) {
    console.log('[admin-magic] dev mode, no mail provider — login link:', opts.link);
    return 'logged';
  }

  const from = readEnv('ADMIN_MAIL_FROM') || DEFAULT_MAIL_FROM;
  const mail = renderMagicMail(opts.link);
  const base = (apiUrl || DEFAULT_RESEND_URL).replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/emails`, {
      method: 'POST',
      headers: {
        ...(key ? {authorization: `Bearer ${key}`} : {}),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) {
      console.error('[admin-magic] mail provider rejected the request', res.status);
      return 'failed';
    }
    return 'sent';
  } catch (e) {
    console.error('[admin-magic] mail provider unreachable', e instanceof Error ? e.message : e);
    return 'failed';
  }
}
