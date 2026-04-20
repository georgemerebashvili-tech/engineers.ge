import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type RateLimitBucket = 'login' | 'verify_resend' | 'register' | 'generic';

type LimitSpec = {
  /** Fails allowed in a row before lock triggers */
  maxFails: number;
  /** How long to lock after maxFails reached (ms) */
  lockMs: number;
};

const DEFAULTS: Record<RateLimitBucket, LimitSpec> = {
  login: {maxFails: 6, lockMs: 10 * 60 * 1000},
  verify_resend: {maxFails: 1, lockMs: 60 * 1000},
  register: {maxFails: 8, lockMs: 5 * 60 * 1000},
  generic: {maxFails: 10, lockMs: 60 * 1000}
};

type Row = {
  fail_count: number;
  locked_until: string | null;
  last_attempt: string;
};

async function readRow(bucket: string, key: string): Promise<Row | null> {
  const {data, error} = await supabaseAdmin()
    .from('rate_limits')
    .select('fail_count,locked_until,last_attempt')
    .eq('bucket', bucket)
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

async function writeRow(
  bucket: string,
  key: string,
  patch: Partial<Row>
): Promise<void> {
  await supabaseAdmin()
    .from('rate_limits')
    .upsert({
      bucket,
      key,
      fail_count: patch.fail_count ?? 0,
      locked_until: patch.locked_until ?? null,
      last_attempt: patch.last_attempt ?? new Date().toISOString()
    });
}

async function deleteRow(bucket: string, key: string): Promise<void> {
  await supabaseAdmin().from('rate_limits').delete().eq('bucket', bucket).eq('key', key);
}

export type RateLimitCheck =
  | {locked: false}
  | {locked: true; retry_after_seconds: number};

/** Check whether an action is currently locked. Use before the attempt. */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  key: string
): Promise<RateLimitCheck> {
  try {
    const row = await readRow(bucket, key);
    if (!row?.locked_until) return {locked: false};
    const until = new Date(row.locked_until).getTime();
    const now = Date.now();
    if (until > now) {
      return {locked: true, retry_after_seconds: Math.ceil((until - now) / 1000)};
    }
    return {locked: false};
  } catch (e) {
    // Degrade open: if the DB is down, don't lock users out.
    console.warn('[rate-limit] check failed, allowing', e);
    return {locked: false};
  }
}

/** Record a failed attempt. Returns the updated state. */
export async function recordFailure(
  bucket: RateLimitBucket,
  key: string,
  spec?: Partial<LimitSpec>
): Promise<{locked: boolean; fails: number; retry_after_seconds?: number}> {
  const s = {...DEFAULTS[bucket], ...spec};
  try {
    const row = await readRow(bucket, key);
    const now = new Date();

    // Auto-reset counter if the lock already expired (clean slate).
    const lockedUntil = row?.locked_until ? new Date(row.locked_until) : null;
    const expired = lockedUntil ? lockedUntil.getTime() <= now.getTime() : true;

    const fails = (expired ? 0 : row?.fail_count ?? 0) + 1;
    let newLock: string | null = null;

    if (fails >= s.maxFails) {
      newLock = new Date(now.getTime() + s.lockMs).toISOString();
      await writeRow(bucket, key, {
        fail_count: 0,
        locked_until: newLock,
        last_attempt: now.toISOString()
      });
      return {
        locked: true,
        fails,
        retry_after_seconds: Math.ceil(s.lockMs / 1000)
      };
    }
    await writeRow(bucket, key, {
      fail_count: fails,
      locked_until: null,
      last_attempt: now.toISOString()
    });
    return {locked: false, fails};
  } catch (e) {
    console.warn('[rate-limit] record failure failed', e);
    return {locked: false, fails: 0};
  }
}

/** Clear rate-limit state on successful attempt. */
export async function clearRateLimit(
  bucket: RateLimitBucket,
  key: string
): Promise<void> {
  try {
    await deleteRow(bucket, key);
  } catch (e) {
    console.warn('[rate-limit] clear failed', e);
  }
}

/** Minimum-gap throttle: reject if an attempt happened within `minGapMs` ago. */
export async function checkMinGap(
  bucket: RateLimitBucket,
  key: string,
  minGapMs: number
): Promise<{allowed: true} | {allowed: false; retry_after_seconds: number}> {
  try {
    const row = await readRow(bucket, key);
    if (!row) return {allowed: true};
    const lastMs = new Date(row.last_attempt).getTime();
    const deltaMs = Date.now() - lastMs;
    if (deltaMs < minGapMs) {
      return {
        allowed: false,
        retry_after_seconds: Math.ceil((minGapMs - deltaMs) / 1000)
      };
    }
    return {allowed: true};
  } catch (e) {
    console.warn('[rate-limit] min-gap check failed', e);
    return {allowed: true};
  }
}

export type RateLimitRow = {
  bucket: string;
  key: string;
  fail_count: number;
  locked_until: string | null;
  last_attempt: string;
};

/**
 * Admin-only: list all rate-limit rows (both locked and recent-attempt).
 * Used by /admin/rate-limits panel for launch-day monitoring.
 */
export async function listRateLimits(opts?: {
  lockedOnly?: boolean;
  bucket?: RateLimitBucket;
  limit?: number;
}): Promise<RateLimitRow[]> {
  try {
    let q = supabaseAdmin()
      .from('rate_limits')
      .select('bucket,key,fail_count,locked_until,last_attempt')
      .order('last_attempt', {ascending: false})
      .limit(opts?.limit ?? 300);
    if (opts?.bucket) q = q.eq('bucket', opts.bucket);
    if (opts?.lockedOnly) {
      q = q.not('locked_until', 'is', null).gt('locked_until', new Date().toISOString());
    }
    const {data, error} = await q;
    if (error) throw error;
    return (data ?? []) as RateLimitRow[];
  } catch {
    return [];
  }
}

/** Mark the last-attempt timestamp without counting as failure. */
export async function stampAttempt(
  bucket: RateLimitBucket,
  key: string
): Promise<void> {
  try {
    const row = await readRow(bucket, key);
    await writeRow(bucket, key, {
      fail_count: row?.fail_count ?? 0,
      locked_until: row?.locked_until ?? null,
      last_attempt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[rate-limit] stamp failed', e);
  }
}
