import {supabaseAdmin} from '@/lib/supabase/admin';
import {getCalcStats} from '@/lib/calc-stats';
import {StatsDashboard} from '../stats/dashboard';
import {CalcStatsPanel} from '../stats/calc-stats-panel';
import {LivePanel} from '../stats/live-panel';
import type {PageViewRow} from '../stats/types';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {title: 'ანალიტიკა · Admin · engineers.ge'};

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{path?: string}>;
}) {
  const {path: filterPath} = await searchParams;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const calcStats = await getCalcStats(30);

  let rows: PageViewRow[] = [];
  let error: string | null = null;

  try {
    let query = supabaseAdmin()
      .from('page_views')
      .select(
        'id,visitor_id,path,referrer_domain,utm_source,country,device,browser,os,entered_at,duration_ms'
      )
      .gte('entered_at', since)
      .eq('bot', false);
    if (filterPath) query = query.eq('path', filterPath);
    const {data, error: qErr} = await query
      .order('entered_at', {ascending: false})
      .limit(20000);
    if (qErr) throw qErr;
    rows = (data ?? []) as PageViewRow[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'query failed';
  }

  if (error) {
    return (
      <>
        <AdminPageHeader
          crumbs={[{label: 'ანალიტიკა'}]}
          title="სტატისტიკა"
          description="კალკულატორების გამოყენება + გვერდების ვიზიტები."
        />
        <AdminSection>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
            <p className="font-medium">Supabase-ს ვერ ვუკავშირდები.</p>
            <p className="mt-1 font-mono text-xs">{error}</p>
          </div>
          <div className="mt-6">
            <CalcStatsPanel rows={calcStats} />
          </div>
        </AdminSection>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}]}
        title="სტატისტიკა"
        description={
          filterPath
            ? `ფილტრი: ${filterPath} (ბოლო 30 დღე)`
            : 'კალკულატორების გამოყენება + გვერდების ვიზიტები (ბოლო 30 დღე).'
        }
      />
      <AdminSection>
        <div className="space-y-6">
          {filterPath && (
            <div className="flex items-center gap-2 rounded-card border border-blue-bd bg-blue-lt px-3 py-2 text-[12px]">
              <span className="font-mono text-blue">filter: {filterPath}</span>
              <a
                href="/admin/analytics"
                className="ml-auto text-[11px] text-blue underline hover:text-navy"
              >
                ფილტრის გასუფთავება
              </a>
            </div>
          )}
          {!filterPath && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <CalcStatsPanel rows={calcStats} />
              </div>
              <LivePanel />
            </div>
          )}
          <StatsDashboard rows={rows} />
        </div>
      </AdminSection>
    </>
  );
}
