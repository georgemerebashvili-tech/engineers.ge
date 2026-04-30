import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type NotFoundEvent = {
  id: number;
  pathname: string;
  referrer: string | null;
  user_agent: string | null;
  visitor_id: string | null;
  created_at: string;
};

export type NewNotFoundEvent = {
  pathname: string;
  referrer?: string | null;
  user_agent?: string | null;
  visitor_id?: string | null;
};

export async function createNotFoundEvent(input: NewNotFoundEvent): Promise<void> {
  try {
    await supabaseAdmin()
      .from('not_found_events')
      .insert({
        pathname: input.pathname.slice(0, 500),
        referrer: input.referrer?.slice(0, 500) ?? null,
        user_agent: input.user_agent?.slice(0, 500) ?? null,
        visitor_id: input.visitor_id?.slice(0, 100) ?? null
      });
  } catch {
    // swallow — tracking must never cascade
  }
}

export type PathStat = {pathname: string; count: number; latest_at: string};
export type ReferrerStat = {referrer: string; count: number};

/**
 * Aggregated view for admin panel. Groups by pathname (top broken routes) and
 * referrer (who's linking to the broken route).
 */
export async function getNotFoundStats(sinceDays = 30): Promise<{
  total: number;
  top_paths: PathStat[];
  top_referrers: ReferrerStat[];
  recent: NotFoundEvent[];
}> {
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
  try {
    const {data, error} = await supabaseAdmin()
      .from('not_found_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', {ascending: false})
      .limit(2000);
    if (error) throw error;
    const rows = (data ?? []) as NotFoundEvent[];

    const pathMap = new Map<string, {count: number; latest_at: string}>();
    const refMap = new Map<string, number>();
    for (const r of rows) {
      const p = pathMap.get(r.pathname);
      if (p) {
        p.count++;
        if (r.created_at > p.latest_at) p.latest_at = r.created_at;
      } else {
        pathMap.set(r.pathname, {count: 1, latest_at: r.created_at});
      }
      if (r.referrer) {
        refMap.set(r.referrer, (refMap.get(r.referrer) ?? 0) + 1);
      }
    }

    return {
      total: rows.length,
      top_paths: Array.from(pathMap.entries())
        .map(([pathname, v]) => ({pathname, ...v}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50),
      top_referrers: Array.from(refMap.entries())
        .map(([referrer, count]) => ({referrer, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
      recent: rows.slice(0, 100)
    };
  } catch {
    return {total: 0, top_paths: [], top_referrers: [], recent: []};
  }
}

// For each broken path, fetch how many real page_views it had in the last 30 days.
// Non-zero traffic = the URL used to work, then broke (high priority for redirect).
// Zero traffic = the URL never existed (low priority — probably a bad inbound link).
export async function getPathTrafficCounts(paths: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (paths.length === 0) return out;
  for (const p of paths) out.set(p, 0);
  try {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const {data, error} = await supabaseAdmin()
      .from('page_views')
      .select('path')
      .in('path', paths)
      .gte('entered_at', since)
      .eq('bot', false)
      .limit(5000);
    if (error) throw error;
    for (const row of (data ?? []) as {path: string}[]) {
      out.set(row.path, (out.get(row.path) ?? 0) + 1);
    }
  } catch {
    // table not available — leave zeros
  }
  return out;
}
