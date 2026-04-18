import 'server-only';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type Country = {
  id: number;
  code: string | null;
  name_ka: string;
  name_en: string;
  flag_emoji: string | null;
};

export type UserSource = 'self' | 'referred';

export type UserRow = {
  id: string;
  email: string;
  name: string;
  country_id: number | null;
  language: string;
  profession: string | null;
  registered_at: string;
  last_login_at: string | null;
  email_verified: boolean;
  source: UserSource;
  referred_by_user_id: string | null;
  ref_code: string | null;
  interests: string[];
  project_count: number;
  deleted_at: string | null;
  notes: string | null;
  verified_engineer: boolean;
  verified_engineer_at: string | null;
  disposable_email: boolean;
  fraud_score: number;
};

export type UserWithCountry = UserRow & {
  country: Country | null;
  referrer: {id: string; name: string; email: string} | null;
};

const ITERATIONS = 210_000;
const KEY_LEN = 32;

export function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha256');
  return {hash: hash.toString('hex'), salt: salt.toString('hex')};
}

export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
) {
  const {hash} = hashPassword(password, storedSalt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

export async function listCountries(): Promise<Country[]> {
  const {data, error} = await supabaseAdmin()
    .from('countries')
    .select('id,code,name_ka,name_en,flag_emoji')
    .order('name_ka', {ascending: true});
  if (error) throw error;
  return (data ?? []) as Country[];
}

export async function findCountryByName(name: string): Promise<Country | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const {data, error} = await supabaseAdmin()
    .from('countries')
    .select('id,code,name_ka,name_en,flag_emoji')
    .or(`name_ka.ilike.${trimmed},name_en.ilike.${trimmed}`)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as Country) ?? null;
}

export async function upsertCountryByName(input: {
  name_ka: string;
  name_en?: string;
  code?: string;
  flag_emoji?: string;
}): Promise<Country> {
  const existing = await findCountryByName(input.name_ka);
  if (existing) return existing;
  const {data, error} = await supabaseAdmin()
    .from('countries')
    .insert({
      code: input.code ?? null,
      name_ka: input.name_ka.trim(),
      name_en: (input.name_en ?? input.name_ka).trim(),
      flag_emoji: input.flag_emoji ?? null
    })
    .select('id,code,name_ka,name_en,flag_emoji')
    .single();
  if (error) throw error;
  return data as Country;
}

export async function findUserByEmail(email: string) {
  const {data, error} = await supabaseAdmin()
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as
    | (UserRow & {password_hash: string; password_salt: string})
    | null;
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  country_id: number | null;
  language: string;
  profession?: string | null;
  interests?: string[] | null;
  visitor_id?: string | null;
  referred_by_user_id?: string | null;
  source?: UserSource;
}) {
  const {hash, salt} = hashPassword(input.password);
  const {data, error} = await supabaseAdmin()
    .from('users')
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      country_id: input.country_id,
      language: input.language,
      profession: input.profession ?? null,
      interests: Array.isArray(input.interests) && input.interests.length > 0 ? input.interests : null,
      visitor_id: input.visitor_id ?? null,
      password_hash: hash,
      password_salt: salt,
      referred_by_user_id: input.referred_by_user_id ?? null,
      source: input.source ?? 'self'
    })
    .select('id,email,name,language,registered_at,ref_code')
    .single();
  if (error) throw error;
  return data as Pick<
    UserRow,
    'id' | 'email' | 'name' | 'language' | 'registered_at' | 'ref_code'
  >;
}

export async function findUserByRefCode(code: string) {
  const clean = code.trim().toLowerCase();
  if (!clean) return null;
  const {data, error} = await supabaseAdmin()
    .from('users')
    .select('id,name,email,ref_code')
    .ilike('ref_code', clean)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as {
    id: string;
    name: string;
    email: string;
    ref_code: string | null;
  } | null;
}

export async function markUserFraud(
  userId: string,
  patch: {disposable_email?: boolean; fraud_score?: number}
) {
  const update: Record<string, unknown> = {};
  if (typeof patch.disposable_email === 'boolean')
    update.disposable_email = patch.disposable_email;
  if (typeof patch.fraud_score === 'number') update.fraud_score = patch.fraud_score;
  if (Object.keys(update).length === 0) return;
  await supabaseAdmin().from('users').update(update).eq('id', userId);
}

export async function listReferralsFor(userId: string) {
  const {data, error} = await supabaseAdmin()
    .from('users')
    .select(
      'id,name,email,registered_at,email_verified,verified_engineer,project_count,deleted_at'
    )
    .eq('referred_by_user_id', userId)
    .is('deleted_at', null)
    .order('registered_at', {ascending: false})
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    name: string;
    email: string;
    registered_at: string;
    email_verified: boolean;
    verified_engineer: boolean;
    project_count: number;
    deleted_at: string | null;
  }>;
}

export async function setVerifiedEngineer(opts: {
  user_id: string;
  verified: boolean;
  admin_id?: string | null;
}) {
  const patch: Record<string, unknown> = {
    verified_engineer: opts.verified,
    verified_engineer_at: opts.verified ? new Date().toISOString() : null,
    verified_engineer_by: opts.verified ? opts.admin_id ?? null : null
  };
  const {error} = await supabaseAdmin()
    .from('users')
    .update(patch)
    .eq('id', opts.user_id);
  if (error) throw error;
}

const USER_SELECT =
  'id,email,name,country_id,language,profession,registered_at,last_login_at,email_verified,' +
  'source,referred_by_user_id,ref_code,interests,project_count,deleted_at,notes,' +
  'verified_engineer,verified_engineer_at,disposable_email,fraud_score,' +
  'country:countries(id,code,name_ka,name_en,flag_emoji),' +
  'referrer:referred_by_user_id(id,name,email)';

export async function listUsers(opts: {
  country_id?: number | null;
  language?: string | null;
  source?: UserSource | null;
  interest?: string | null;
  q?: string;
  limit?: number;
  include_deleted?: boolean;
  only_deleted?: boolean;
}): Promise<UserWithCountry[]> {
  const limit = Math.min(opts.limit ?? 200, 500);
  let query = supabaseAdmin()
    .from('users')
    .select(USER_SELECT)
    .order('registered_at', {ascending: false})
    .limit(limit);

  if (opts.only_deleted) {
    query = query.not('deleted_at', 'is', null);
  } else if (!opts.include_deleted) {
    query = query.is('deleted_at', null);
  }
  if (opts.country_id != null) {
    query = query.eq('country_id', opts.country_id);
  }
  if (opts.language) {
    query = query.eq('language', opts.language);
  }
  if (opts.source) {
    query = query.eq('source', opts.source);
  }
  if (opts.interest) {
    query = query.contains('interests', [opts.interest]);
  }
  if (opts.q) {
    const needle = `%${opts.q}%`;
    query = query.or(`email.ilike.${needle},name.ilike.${needle}`);
  }

  const {data, error} = await query;
  if (error) throw error;
  return (data ?? []) as unknown as UserWithCountry[];
}

export type ReferrerSummary = {
  id: string;
  name: string;
  email: string;
  total_invited: number;
  total_registered: number;
  reward_gel: number;
};

export async function listTopReferrers(limit = 10): Promise<ReferrerSummary[]> {
  // Aggregation via two passes: pull invited users grouped by referrer.
  const {data, error} = await supabaseAdmin()
    .from('users')
    .select('id,name,email,referred_by_user_id,email_verified')
    .not('referred_by_user_id', 'is', null)
    .is('deleted_at', null);
  if (error) throw error;

  const groups = new Map<string, {invited: number; verified: number}>();
  for (const row of data ?? []) {
    const key = (row as {referred_by_user_id: string}).referred_by_user_id;
    const bucket = groups.get(key) ?? {invited: 0, verified: 0};
    bucket.invited += 1;
    if ((row as {email_verified: boolean}).email_verified) bucket.verified += 1;
    groups.set(key, bucket);
  }

  const referrerIds = Array.from(groups.keys());
  if (referrerIds.length === 0) return [];

  const {data: refs, error: refErr} = await supabaseAdmin()
    .from('users')
    .select('id,name,email')
    .in('id', referrerIds);
  if (refErr) throw refErr;

  return (refs ?? [])
    .map((r) => {
      const g = groups.get(r.id as string) ?? {invited: 0, verified: 0};
      return {
        id: r.id as string,
        name: r.name as string,
        email: r.email as string,
        total_invited: g.invited,
        total_registered: g.verified,
        reward_gel: Math.min(g.verified * 10, 3000)
      };
    })
    .sort((a, b) => b.total_invited - a.total_invited)
    .slice(0, limit);
}

export async function getRegistrationsByDay(days = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const {data, error} = await supabaseAdmin()
    .from('users')
    .select('registered_at,source')
    .gte('registered_at', since)
    .is('deleted_at', null)
    .order('registered_at', {ascending: true});
  if (error) throw error;

  const buckets = new Map<string, {self: number; referred: number}>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {self: 0, referred: 0});
  }
  for (const row of data ?? []) {
    const key = (row as {registered_at: string}).registered_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if ((row as {source: UserSource}).source === 'referred') bucket.referred += 1;
    else bucket.self += 1;
  }
  return Array.from(buckets.entries()).map(([date, v]) => ({date, ...v}));
}

export async function softDeleteUser(id: string) {
  const {error} = await supabaseAdmin()
    .from('users')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', id);
  if (error) throw error;
}

export async function restoreUser(id: string) {
  const {error} = await supabaseAdmin()
    .from('users')
    .update({deleted_at: null})
    .eq('id', id);
  if (error) throw error;
}

export async function purgeUser(id: string) {
  const {error} = await supabaseAdmin().from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function purgeExpiredSoftDeletes() {
  const {data, error} = await supabaseAdmin().rpc('purge_soft_deleted');
  if (error) throw error;
  return data;
}
