import 'server-only';
import {SignJWT, jwtVerify} from 'jose';
import {cookies, headers} from 'next/headers';
import bcrypt from 'bcryptjs';
import {supabaseAdmin} from '@/lib/supabase/admin';

const COOKIE_NAME = 'tbc_jwt';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type TbcSession = {
  uid: string;
  username: string;
  role: 'admin' | 'user';
  displayName: string | null;
};

function secret() {
  const s = process.env.TBC_JWT_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error('TBC_JWT_SECRET (or AUTH_SECRET) is not set');
  return new TextEncoder().encode(s);
}

/**
 * Static admin bootstrap — if a login attempt uses one of the two hardcoded
 * usernames AND the env hash matches, ensure the row exists in tbc_users and
 * return it. This lets admin_givi / admin_temo work even before DB is seeded.
 */
async function ensureStaticAdmin(username: string, password: string) {
  const envMap: Record<string, string | undefined> = {
    admin: process.env.TBC_ADMIN_PASS_HASH,
    admin_givi: process.env.TBC_ADMIN_GIVI_PASS_HASH,
    admin_temo: process.env.TBC_ADMIN_TEMO_PASS_HASH
  };
  const displayMap: Record<string, string> = {
    admin: 'Admin',
    admin_givi: 'Givi (Admin)',
    admin_temo: 'Temo (Admin)'
  };
  const hash = envMap[username];
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;

  const db = supabaseAdmin();
  const existing = await db
    .from('tbc_users')
    .select('id, username, role, display_name, password_hash, active')
    .eq('username', username)
    .maybeSingle();

  if (existing.data) {
    if (!existing.data.active) return null;
    // keep hash in sync with env (rotate via env)
    if (existing.data.password_hash !== hash) {
      await db
        .from('tbc_users')
        .update({password_hash: hash, role: 'admin', is_static: true})
        .eq('id', existing.data.id);
    }
    return {
      id: existing.data.id as string,
      username: existing.data.username as string,
      role: 'admin' as const,
      displayName: (existing.data.display_name as string) || null
    };
  }

  const inserted = await db
    .from('tbc_users')
    .insert({
      username,
      password_hash: hash,
      display_name: displayMap[username] || username,
      role: 'admin',
      is_static: true,
      active: true,
      created_by: 'system'
    })
    .select('id, username, display_name')
    .single();

  if (inserted.error || !inserted.data) return null;
  return {
    id: inserted.data.id as string,
    username: inserted.data.username as string,
    role: 'admin' as const,
    displayName: (inserted.data.display_name as string) || null
  };
}

export async function verifyLogin(username: string, password: string) {
  const cleaned = username.trim().toLowerCase();

  // Static admin path first
  const staticRes = await ensureStaticAdmin(cleaned, password);
  if (staticRes) return staticRes;

  // DB-backed user
  const db = supabaseAdmin();
  const row = await db
    .from('tbc_users')
    .select('id, username, role, display_name, password_hash, active')
    .eq('username', cleaned)
    .maybeSingle();

  if (row.error || !row.data) return null;
  if (!row.data.active) return null;
  const ok = await bcrypt.compare(password, row.data.password_hash as string);
  if (!ok) return null;

  return {
    id: row.data.id as string,
    username: row.data.username as string,
    role: (row.data.role as 'admin' | 'user') || 'user',
    displayName: (row.data.display_name as string) || null
  };
}

export async function issueTbcSession(u: {
  id: string;
  username: string;
  role: 'admin' | 'user';
  displayName: string | null;
}) {
  const token = await new SignJWT({
    uid: u.id,
    sub: u.username,
    role: u.role,
    name: u.displayName
  })
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
}

export async function destroyTbcSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getTbcSession(): Promise<TbcSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, secret());
    const role = payload.role === 'admin' ? 'admin' : 'user';
    return {
      uid: payload.uid as string,
      username: payload.sub as string,
      role,
      displayName: (payload.name as string) || null
    };
  } catch {
    return null;
  }
}

export async function logLoginEvent(opts: {
  username: string;
  userId?: string | null;
  success: boolean;
}) {
  try {
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null;
    const ua = h.get('user-agent') || null;
    const db = supabaseAdmin();
    await db.from('tbc_login_events').insert({
      username: opts.username,
      user_id: opts.userId || null,
      ip,
      user_agent: ua,
      success: opts.success
    });
    if (opts.success && opts.userId) {
      await db
        .from('tbc_users')
        .update({last_login_at: new Date().toISOString()})
        .eq('id', opts.userId);
    }
  } catch (e) {
    console.error('[tbc] log login event failed', e);
  }
}

export async function requireTbcSession(): Promise<TbcSession> {
  const s = await getTbcSession();
  if (!s) throw new Error('unauthorized');
  return s;
}

export async function requireTbcAdmin(): Promise<TbcSession> {
  const s = await requireTbcSession();
  if (s.role !== 'admin') throw new Error('forbidden');
  return s;
}
