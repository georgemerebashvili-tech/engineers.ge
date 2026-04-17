import {SignJWT, jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'admin_jwt';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function verifyCredentials(user: string, pass: string) {
  const expectedUser = process.env.ADMIN_USER;
  const hash = process.env.ADMIN_PASS_HASH;
  if (!expectedUser || !hash) return false;
  if (user !== expectedUser) return false;
  return bcrypt.compare(pass, hash);
}

export async function issueSession(user: string) {
  const token = await new SignJWT({sub: user})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('7d')
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

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, secret());
    return {user: payload.sub as string};
  } catch {
    return null;
  }
}
