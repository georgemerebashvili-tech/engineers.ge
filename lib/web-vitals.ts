import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const CORE_METRICS = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'] as const;
export type CoreMetric = (typeof CORE_METRICS)[number];

export type WebVitalInput = {
  metric: string;
  value: number;
  rating?: string | null;
  pathname: string;
  navigation_type?: string | null;
  user_agent?: string | null;
  viewport?: string | null;
  visitor_id?: string | null;
};

export async function recordWebVital(input: WebVitalInput): Promise<void> {
  try {
    await supabaseAdmin()
      .from('web_vitals')
      .insert({
        metric: input.metric.slice(0, 40),
        value: Number(input.value),
        rating: input.rating ?? null,
        pathname: input.pathname.slice(0, 500),
        navigation_type: input.navigation_type ?? null,
        user_agent: input.user_agent?.slice(0, 500) ?? null,
        viewport: input.viewport?.slice(0, 30) ?? null,
        visitor_id: input.visitor_id?.slice(0, 100) ?? null
      });
  } catch {
    // swallow — observability must never cascade
  }
}

export type MetricStats = {
  metric: string;
  count: number;
  p50: number;
  p75: number;
  p95: number;
  good: number;
  needs_improvement: number;
  poor: number;
};

export type TopPathStats = {
  pathname: string;
  metric: string;
  count: number;
  p75: number;
};

/** Percentile on a sorted array. Linear interpolation between ranks. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/**
 * Aggregate stats over `sinceDays`. For each Core Web Vital computes:
 *   - count
 *   - p50/p75/p95 values
 *   - rating distribution (good/needs-improvement/poor)
 *
 * Plus top-20 worst p75 pathnames per metric for drill-down.
 */
export async function getWebVitalStats(sinceDays = 7): Promise<{
  metrics: MetricStats[];
  top_slow: TopPathStats[];
  total: number;
}> {
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
  try {
    const {data, error} = await supabaseAdmin()
      .from('web_vitals')
      .select('metric,value,rating,pathname')
      .gte('created_at', since)
      .limit(10000);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      metric: string;
      value: number;
      rating: string | null;
      pathname: string;
    }>;

    const byMetric = new Map<string, number[]>();
    const byRating = new Map<string, {good: number; ni: number; poor: number}>();
    const byPathMetric = new Map<string, number[]>();

    for (const r of rows) {
      if (!byMetric.has(r.metric)) {
        byMetric.set(r.metric, []);
        byRating.set(r.metric, {good: 0, ni: 0, poor: 0});
      }
      byMetric.get(r.metric)!.push(r.value);
      const rt = byRating.get(r.metric)!;
      if (r.rating === 'good') rt.good++;
      else if (r.rating === 'needs-improvement') rt.ni++;
      else if (r.rating === 'poor') rt.poor++;

      const key = `${r.pathname}::${r.metric}`;
      if (!byPathMetric.has(key)) byPathMetric.set(key, []);
      byPathMetric.get(key)!.push(r.value);
    }

    const metrics: MetricStats[] = [];
    for (const m of CORE_METRICS) {
      const vals = byMetric.get(m) ?? [];
      if (vals.length === 0) continue;
      vals.sort((a, b) => a - b);
      const rt = byRating.get(m) ?? {good: 0, ni: 0, poor: 0};
      metrics.push({
        metric: m,
        count: vals.length,
        p50: percentile(vals, 0.5),
        p75: percentile(vals, 0.75),
        p95: percentile(vals, 0.95),
        good: rt.good,
        needs_improvement: rt.ni,
        poor: rt.poor
      });
    }

    const topSlow: TopPathStats[] = [];
    for (const [key, vals] of byPathMetric) {
      if (vals.length < 3) continue; // ignore noise
      const [pathname, metric] = key.split('::');
      vals.sort((a, b) => a - b);
      topSlow.push({
        pathname,
        metric,
        count: vals.length,
        p75: percentile(vals, 0.75)
      });
    }
    topSlow.sort((a, b) => b.p75 - a.p75);

    return {
      metrics,
      top_slow: topSlow.slice(0, 20),
      total: rows.length
    };
  } catch {
    return {metrics: [], top_slow: [], total: 0};
  }
}

/** Core Web Vitals "good" thresholds per Google. Used in admin UI for color. */
export const THRESHOLDS: Record<CoreMetric, {good: number; poor: number; unit: string}> = {
  LCP: {good: 2500, poor: 4000, unit: 'ms'},
  CLS: {good: 0.1, poor: 0.25, unit: ''},
  INP: {good: 200, poor: 500, unit: 'ms'},
  FCP: {good: 1800, poor: 3000, unit: 'ms'},
  TTFB: {good: 800, poor: 1800, unit: 'ms'}
};
