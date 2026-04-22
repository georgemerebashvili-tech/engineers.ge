import 'server-only';
import {SignJWT, jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import bcrypt from 'bcryptjs';
import {supabaseAdmin} from '@/lib/supabase/admin';

const COOKIE_NAME = 'dmt_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type DmtRole = 'owner' | 'admin' | 'member' | 'viewer';
export type DmtStatus = 'active' | 'invited' | 'suspended';
export const DMT_MANUAL_LEADS_TAB_COLORS = ['blue', 'navy', 'green', 'orange', 'gray'] as const;
export type DmtManualLeadsTabColor = (typeof DMT_MANUAL_LEADS_TAB_COLORS)[number];
export type DmtUserSettings = {
  manualLeadsTabColor: DmtManualLeadsTabColor;
};

const DEFAULT_DMT_USER_SETTINGS: DmtUserSettings = {
  manualLeadsTabColor: 'blue'
};

export type DmtUser = {
  id: string;
  email: string;
  name: string;
  role: DmtRole;
  status: DmtStatus;
  last_login_at: string | null;
  created_at: string;
  settings: DmtUserSettings;
};

function normalizeDmtUserSettings(raw: unknown): DmtUserSettings {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const tabColor = source.manualLeadsTabColor;
  return {
    manualLeadsTabColor:
      typeof tabColor === 'string' &&
      DMT_MANUAL_LEADS_TAB_COLORS.includes(tabColor as DmtManualLeadsTabColor)
        ? (tabColor as DmtManualLeadsTabColor)
        : DEFAULT_DMT_USER_SETTINGS.manualLeadsTabColor
  };
}

function mapDmtUser(
  data: {
    id: string;
    email: string;
    name: string;
    role: DmtRole;
    status: DmtStatus;
    last_login_at: string | null;
    created_at: string;
    settings?: unknown;
  } | null
): DmtUser | null {
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
    last_login_at: data.last_login_at,
    created_at: data.created_at,
    settings: normalizeDmtUserSettings(data.settings)
  };
}

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
    .select('id,email,name,role,status,last_login_at,created_at,settings')
    .eq('id', session.userId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.status === 'suspended') return null;
  return mapDmtUser(data as Parameters<typeof mapDmtUser>[0]);
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
      invited_by: input.invited_by ?? null,
      settings: DEFAULT_DMT_USER_SETTINGS
    })
    .select('id,email,name,role,status,last_login_at,created_at,settings')
    .single();

  if (error || !data) return {error: error?.message ?? 'failed to create user'};
  return {user: mapDmtUser(data as Parameters<typeof mapDmtUser>[0]) ?? undefined};
}

export async function authenticateDmt(
  email: string,
  password: string
): Promise<{user?: DmtUser; error?: string}> {
  const sb = supabaseAdmin();
  const {data, error} = await sb
    .from('dmt_users')
    .select('id,email,name,role,status,password_hash,last_login_at,created_at,settings')
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

  const rest = {...data};
  delete rest.password_hash;
  return {user: mapDmtUser(rest as Parameters<typeof mapDmtUser>[0]) ?? undefined};
}

export async function listDmtUsers(): Promise<DmtUser[]> {
  const {data, error} = await supabaseAdmin()
    .from('dmt_users')
    .select('id,email,name,role,status,last_login_at,created_at,settings')
    .order('created_at', {ascending: false});
  if (error || !data) return [];
  return (data as Parameters<typeof mapDmtUser>[0][])
    .map((row) => mapDmtUser(row))
    .filter((row): row is DmtUser => row !== null);
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

export async function updateDmtUserSettings(
  id: string,
  patch: Partial<DmtUserSettings>
): Promise<DmtUserSettings> {
  const sb = supabaseAdmin();
  const {data, error} = await sb
    .from('dmt_users')
    .select('settings')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw error ?? new Error('user_not_found');

  const next = normalizeDmtUserSettings({
    ...normalizeDmtUserSettings(data.settings),
    ...patch
  });

  const {error: updateError} = await sb
    .from('dmt_users')
    .update({settings: next})
    .eq('id', id);
  if (updateError) throw updateError;
  return next;
}

export function isPrivilegedRole(r: DmtRole) {
  return r === 'owner' || r === 'admin';
}
