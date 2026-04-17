export type StoredUser = {
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  hash_algo: 'PBKDF2-SHA256-210000';
  registered_at: string;
};

const KEY = 'eng_user';
const ITERATIONS = 210_000;
const HASH_BITS = 256;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out.buffer;
}

export async function hashPassword(password: string, saltHex?: string) {
  const enc = new TextEncoder();
  const saltBytes = saltHex
    ? new Uint8Array(fromHex(saltHex))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    {name: 'PBKDF2'},
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', salt: saltBytes.buffer as ArrayBuffer, iterations: ITERATIONS, hash: 'SHA-256'},
    keyMaterial,
    HASH_BITS
  );
  return {hash: toHex(bits), salt: toHex(saltBytes)};
}

export async function verifyPassword(password: string, user: StoredUser) {
  const {hash} = await hashPassword(password, user.password_salt);
  return hash === user.password_hash;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUser;
    if (!parsed?.name || !parsed?.email || !parsed?.password_hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStoredUser(user: {name: string; email: string; password: string}) {
  if (typeof window === 'undefined') return;
  try {
    const {hash, salt} = await hashPassword(user.password);
    const payload: StoredUser = {
      name: user.name,
      email: user.email,
      password_hash: hash,
      password_salt: salt,
      hash_algo: 'PBKDF2-SHA256-210000',
      registered_at: new Date().toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('eng_user_change'));
  } catch {}
}

export function clearStoredUser() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('eng_user_change'));
  } catch {}
}
