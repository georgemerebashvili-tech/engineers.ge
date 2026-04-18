import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/admin';

export type CalcStatRow = {
  slug: string;
  opens: number;
  pdfs: number;
  last_at: string | null;
};

export async function getCalcStats(days = 30): Promise<CalcStatRow[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const {data, error} = await supabaseAdmin()
      .from('calc_events')
      .select('slug,action,created_at')
      .gte('created_at', since);
    if (error) throw error;

    const map = new Map<string, CalcStatRow>();
    for (const ev of (data ?? []) as {slug: string; action: string; created_at: string}[]) {
      const row = map.get(ev.slug) ?? {slug: ev.slug, opens: 0, pdfs: 0, last_at: null};
      if (ev.action === 'open') row.opens += 1;
      if (ev.action === 'pdf') row.pdfs += 1;
      if (!row.last_at || ev.created_at > row.last_at) row.last_at = ev.created_at;
      map.set(ev.slug, row);
    }
    return Array.from(map.values()).sort((a, b) => b.opens + b.pdfs - (a.opens + a.pdfs));
  } catch {
    return [];
  }
}
