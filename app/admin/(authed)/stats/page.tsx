import {supabaseAdmin} from '@/lib/supabase/admin';
import {getCalcStats} from '@/lib/calc-stats';
import {StatsDashboard} from './dashboard';
import {CalcStatsPanel} from './calc-stats-panel';
import type {PageViewRow} from './types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatsPage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const calcStats = await getCalcStats(30);

  let rows: PageViewRow[] = [];
  let error: string | null = null;

  try {
    const {data, error: qErr} = await supabaseAdmin()
      .from('page_views')
      .select(
        'id,visitor_id,path,referrer_domain,utm_source,country,device,browser,os,entered_at,duration_ms'
      )
      .gte('entered_at', since)
      .eq('bot', false)
      .order('entered_at', {ascending: false})
      .limit(20000);
    if (qErr) throw qErr;
    rows = (data ?? []) as PageViewRow[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'query failed';
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-medium">Supabase-ს ვერ ვუკავშირდები.</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
          <p className="mt-3">
            შეამოწმე <code>.env.local</code>-ში <code>NEXT_PUBLIC_SUPABASE_URL</code> და{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>, და რომ migration გაშვებულია{' '}
            (<code>supabase/migrations/0001_page_views.sql</code>).
          </p>
        </div>
        <CalcStatsPanel rows={calcStats} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CalcStatsPanel rows={calcStats} />
      <StatsDashboard rows={rows} />
    </div>
  );
}
