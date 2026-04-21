import 'server-only';
import {SignJWT, jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import bcrypt from 'bcryptjs';
import {supabaseAdmin} from '@/lib/supabase/admin';

const COOKIE_NAME = 'dmt_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type DmtRole = 'owner' | 'admin' | 'member' | 'viewer';
export type DmtStatus = 'active' | 'invited' | 'suspended';

export type DmtUser = {
  id: string;
  email: string;
  name: string;
  role: DmtRole;
  status: DmtStatus;
  last_login_at: string | null;
  created_at: string;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function issueDmtSession(userId: string, email: string, role: DmtRole) {
  const token = await new SignJWT({sub: userId, email, role, scope: 'dmt'})
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

export async function destroyDmtSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type DmtSession = {
  userId: string;
  email: string;
  role: DmtRole;
};

export async function getDmtSession(): Promise<DmtSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, secret());
    if (payload.scope !== 'dmt') return null;
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      role: payload.role as DmtRole
    };
  } catch {
    return null;
  }
}

export async function getCurrentDmtUser(): Promise<DmtUser | null> {
  const session = await getDmtSession();
  if (!session) return null;
  const {data, error} = await supabaseAdmin()
    .from('dmt_users')
    .select('id,email,name,role,status,last_login_at,created_at')
    .eq('id', session.userId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.status === 'suspended') return null;
  return data as DmtUser;
}

export async function createDmtUser(input: {
  email: string;
  password: string;
  name: string;
  role?: DmtRole;
  invited_by?: string | null;
}): Promise<{user?: DmtUser; error?: string}> {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {error: 'არასწორი email'};
  }
  if (input.password.length < 8) {
    return {error: 'პაროლი უნდა იყოს მინ. 8 სიმბოლო'};
  }

  const sb = supabaseAdmin();
  const existing = await sb
    .from('dmt_users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (existing.data) return {error: 'ამ email-ზე მომხმარებელი უკვე არსებობს'};

  const password_hash = await hashPassword(input.password);
  const {data, error} = await sb
    .from('dmt_users')
    .insert({
      email,
      password_hash,
      name: input.name.trim(),
      role: input.role ?? 'member',
      status: 'active',
      invited_by: input.invited_by ?? null
    })
    .select('id,email,name,role,status,last_login_at,created_at')
    .single();

  if (error || !data) return {error: error?.message ?? 'failed to create user'};
  return {user: data as DmtUser};
}

export async function authenticateDmt(
  email: string,
  password: string
): Promise<{user?: DmtUser; error?: string}> {
  const sb = supabaseAdmin();
  const {data, error} = await sb
    .from('dmt_users')
    .select('id,email,name,role,status,password_hash,last_login_at,created_at')
    .ilike('email', email.trim())
    .maybeSingle();
  if (error || !data) return {error: 'email ან პაროლი არასწორია'};
  if (data.status === 'suspended') return {error: 'ანგარიში გაყინულია'};

  const ok = await verifyPassword(password, data.password_hash);
  if (!ok) return {error: 'email ან პაროლი არასწორია'};

  await sb
    .from('dmt_users')
    .update({last_login_at: new Date().toISOString()})
    .eq('id', data.id);

  const {password_hash: _p, ...rest} = data;
  return {user: rest as DmtUser};
}

export async function listDmtUsers(): Promise<DmtUser[]> {
  const {data, error} = await supabaseAdmin()
    .from('dmt_users')
    .select('id,email,name,role,status,last_login_at,created_at')
    .order('created_at', {ascending: false});
  if (error || !data) return [];
  return data as DmtUser[];
}

export async function updateDmtUser(
  id: string,
  patch: Partial<Pick<DmtUser, 'name' | 'role' | 'status'>>
) {
  const {error} = await supabaseAdmin().from('dmt_users').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDmtUser(id: string) {
  const {error} = await supabaseAdmin().from('dmt_users').delete().eq('id', id);
  if (error) throw error;
}

export function isPrivilegedRole(r: DmtRole) {
  return r === 'owner' || r === 'admin';
}
