import {cookies} from 'next/headers';
import bcrypt from 'bcryptjs';
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  readEnv,
  signAdminToken,
  verifyAdminToken
} from '@/lib/admin-session-token';

export async function verifyCredentials(user: string, pass: string) {
  const expectedUser = readEnv('ADMIN_USER');
  const hash = readEnv('ADMIN_PASS_HASH');
  if (!expectedUser || !hash) return false;
  if (user !== expectedUser) return false;
  return bcrypt.compare(pass, hash);
}

export async function issueSession(user: string) {
  const token = await signAdminToken(user);

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
