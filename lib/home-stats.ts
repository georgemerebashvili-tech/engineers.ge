import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/admin';

export type HomeStatsData = {
  uniqueVisitors30d: number;
  calcEvents30d: number;
  pageViewsByDay7d: {label: string; count: number}[];
  calcUsage30d: {slug: string; count: number}[];
  available: boolean;
};

const WEEKDAY_KA = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getHomeStats(): Promise<HomeStatsData> {
  try {
    const since30 = daysAgoISO(30);
    const since7 = daysAgoISO(7);
    const client = supabaseAdmin();

    const [viewsRes, calcRes, views7Res] = await Promise.all([
      client
        .from('page_views')
        .select('visitor_id')
        .gte('entered_at', since30)
        .eq('bot', false),
      client.from('calc_events').select('slug,action').gte('created_at', since30),
      client
        .from('page_views')
        .select('entered_at')
        .gte('entered_at', since7)
        .eq('bot', false)
    ]);

    if (viewsRes.error) throw viewsRes.error;
    if (calcRes.error) throw calcRes.error;
    if (views7Res.error) throw views7Res.error;

    const visitors = new Set<string>();
    for (const row of (viewsRes.data ?? []) as {visitor_id: string}[]) {
      if (row.visitor_id) visitors.add(row.visitor_id);
    }

    const calcEvents = (calcRes.data ?? []) as {slug: string; action: string}[];
    const calcCount = calcEvents.length;
    const calcBySlug = new Map<string, number>();
    for (const ev of calcEvents) {
      calcBySlug.set(ev.slug, (calcBySlug.get(ev.slug) ?? 0) + 1);
    }

    const byDay = new Map<string, number>();
    for (const row of (views7Res.data ?? []) as {entered_at: string}[]) {
      const d = new Date(row.entered_at);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const days: {label: string; count: number}[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      days.push({
        label: WEEKDAY_KA[d.getUTCDay()],
        count: byDay.get(key) ?? 0
      });
    }

    return {
      uniqueVisitors30d: visitors.size,
      calcEvents30d: calcCount,
      pageViewsByDay7d: days,
      calcUsage30d: Array.from(calcBySlug.entries())
        .map(([slug, count]) => ({slug, count}))
        .sort((a, b) => b.count - a.count),
      available: true
    };
  } catch {
    return {
      uniqueVisitors30d: 0,
      calcEvents30d: 0,
      pageViewsByDay7d: [],
      calcUsage30d: [],
      available: false
    };
  }
}
