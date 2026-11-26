import {SignJWT, jwtVerify} from 'jose';

/**
 * Admin session token — pure sign/verify, no `next/headers` import, so it can
 * run inside `proxy.ts` (before any page renders) as well as in `lib/auth.ts`.
 *
 * Why a derived key + audience + scope instead of the raw AUTH_SECRET:
 * DMT, TBC and construction sessions are all HS256 JWTs signed with the same
 * raw AUTH_SECRET (or fall back to it). The old admin check was
 * `jwtVerify(token, AUTH_SECRET)` with no claim checks, so any DMT user could
 * paste their `dmt_session` value into an `admin_jwt` cookie and open the
 * admin panel. The admin session key is now
 *   HKDF-SHA256(ikm = AUTH_SECRET, salt = "engineers.ge", info = "admin-session/v1")
 * and a token must also carry aud `engineers.ge/admin`, scope `admin` and
 * `sub === ADMIN_USER`. A token signed with any other key (raw secret, magic
 * link key, DMT/TBC/construction) fails the signature check.
 *
 * Runtime: Next 16 `proxy.ts` runs on the Node.js runtime (the `runtime` option
 * is rejected there), and WebCrypto `crypto.subtle` is available in Node and
 * Edge alike, so the same module works in every caller.
 */

export const ADMIN_COOKIE_NAME = 'admin_jwt';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const ADMIN_AUDIENCE = 'engineers.ge/admin';
export const ADMIN_SCOPE = 'admin';

const HKDF_SALT = 'engineers.ge';
const ADMIN_SESSION_KEY_INFO = 'admin-session/v1';

const encoder = new TextEncoder();

/** Trimmed env value; empty string when unset. A stray newline in a pasted env value must not lock the owner out. */
export function readEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

type CachedKey = {secret: string; key: Promise<Uint8Array>};
const keyCache = new Map<string, CachedKey>();

async function deriveKeyBytes(secret: string, info: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const ikm = await subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, [
    'deriveBits'
  ]);
  const bits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(HKDF_SALT),
      info: encoder.encode(info)
    },
    ikm,
    256
  );
  return new Uint8Array(bits);
}

/**
 * HKDF-derived 32-byte key for `info`, cached per process. The AUTH_SECRET is
 * used exactly as stored (not trimmed) to stay byte-identical to the other
 * AUTH_SECRET consumers; an unset or blank secret yields `null` (callers fail
 * closed) instead of throwing. A rejected derivation is evicted, never cached.
 */
export async function getDerivedKey(info: string): Promise<Uint8Array | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !secret.trim()) return null;

  let entry = keyCache.get(info);
  if (!entry || entry.secret !== secret) {
    const created: CachedKey = {secret, key: deriveKeyBytes(secret, info)};
    created.key.catch(() => {
      if (keyCache.get(info) === created) keyCache.delete(info);
    });
    keyCache.set(info, created);
    entry = created;
  }
  try {
    return await entry.key;
  } catch {
    return null;
  }
}

/** Signs a 7-day admin session token. Throws when AUTH_SECRET is not set. */
export async function signAdminToken(user: string): Promise<string> {
  const key = await getDerivedKey(ADMIN_SESSION_KEY_INFO);
  if (!key) throw new Error('AUTH_SECRET is not set');
  return new SignJWT({scope: ADMIN_SCOPE})
    .setProtectedHeader({alg: 'HS256'})
    .setSubject(user)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Verifies an admin session token. Returns `null` for anything that is not a
 * currently valid admin token: missing/blank AUTH_SECRET or ADMIN_USER, wrong
 * key, algorithm, audience, scope, subject, or an expired token. Never throws.
 */
export async function verifyAdminToken(
  token: string | null | undefined
): Promise<{user: string} | null> {
  if (!token) return null;
  const adminUser = readEnv('ADMIN_USER');
  if (!adminUser) return null;
  const key = await getDerivedKey(ADMIN_SESSION_KEY_INFO);
  if (!key) return null;
  try {
    const {payload} = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      audience: ADMIN_AUDIENCE
    });
    if (payload.scope !== ADMIN_SCOPE) return null;
    if (payload.sub !== adminUser) return null;
    return {user: adminUser};
  } catch {
    return null;
  }
}
