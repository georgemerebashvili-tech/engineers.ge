import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

const TOKEN_URL = 'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
const API_BASE  = 'https://api.businessonline.ge/api';

// ── config (DB first, env fallback) ──────────────────────────────────────────
export type BogConfig = {
  client_id: string;
  client_secret: string;
  account_iban: string;
  account_currency: string;
};

export async function getBogConfig(): Promise<BogConfig | null> {
  try {
    const db = supabaseAdmin();
    const {data} = await db
      .from('construction_bog_config')
      .select('client_id, client_secret, account_iban, account_currency')
      .order('id').limit(1).maybeSingle();
    if (data?.client_id) return data as BogConfig;
  } catch {}

  const id     = process.env.BOG_CLIENT_ID || process.env.CONSTRUCTION_BOG_CLIENT_ID;
  const secret = process.env.BOG_CLIENT_SECRET || process.env.CONSTRUCTION_BOG_CLIENT_SECRET;
  const iban   = process.env.BOG_ACCOUNT_IBAN || process.env.CONSTRUCTION_BOG_IBAN;
  const cur    = process.env.BOG_ACCOUNT_CURRENCY || process.env.CONSTRUCTION_BOG_CURRENCY || 'GEL';
  if (id && secret && iban) return {client_id: id, client_secret: secret, account_iban: iban, account_currency: cur};

  return null;
}

// ── token cache ───────────────────────────────────────────────────────────────
type TokenCache = {token: string; expiresAt: number};
let _cache: TokenCache | null = null;
let _cacheKey = '';

async function getToken(cfg: BogConfig): Promise<string> {
  const key = cfg.client_id;
  if (_cache && _cacheKey === key && Date.now() < _cache.expiresAt - 30_000) return _cache.token;

  const basic = Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}`},
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`BOG auth failed (${res.status}): ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  _cache = {token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 300) * 1000};
  _cacheKey = key;
  return _cache.token;
}

async function bogGet(cfg: BogConfig, path: string) {
  const token = await getToken(cfg);
  const res = await fetch(`${API_BASE}/${path}`, {
    headers: {Authorization: `Bearer ${token}`},
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`BOG API ${res.status} — ${path}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// BOG expects DD.MM.YYYY — accept both YYYY-MM-DD and DD.MM.YYYY
function toBogDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  }
  return s;
}

// Strip accidentally appended currency codes: "GE84BG...GEL" → "GE84BG..."
export function cleanIban(iban: string): string {
  return iban.trim().replace(/[A-Z]{2,3}$/, '').trim();
}

// ── public helpers ────────────────────────────────────────────────────────────
export async function bogBalance(iban: string, currency: string) {
  const cfg = await getBogConfig();
  if (!cfg) throw new Error('BOG credentials not configured');
  return bogGet(cfg, `accounts/${cleanIban(iban)}/${currency}`);
}

export async function bogStatement(iban: string, currency: string, from: string, to: string) {
  const cfg = await getBogConfig();
  if (!cfg) throw new Error('BOG credentials not configured');
  return bogGet(cfg, `statement/${cleanIban(iban)}/${currency}/${toBogDate(from)}/${toBogDate(to)}`);
}

export async function bogToday(iban: string, currency: string) {
  const cfg = await getBogConfig();
  if (!cfg) throw new Error('BOG credentials not configured');
  return bogGet(cfg, `documents/v2/todayactivities/${cleanIban(iban)}/${currency}`);
}
