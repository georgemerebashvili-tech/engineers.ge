import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getWebVitalStats, THRESHOLDS, type CoreMetric} from '@/lib/web-vitals';
import {Gauge, TrendingUp} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Web Vitals · Admin · engineers.ge'};

function formatValue(metric: string, v: number): string {
  if (metric === 'CLS') return v.toFixed(3);
  if (v < 1000) return `${Math.round(v)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

function rateByThreshold(metric: string, p75: number): 'good' | 'ni' | 'poor' {
  const t = THRESHOLDS[metric as CoreMetric];
  if (!t) return 'good';
  if (p75 <= t.good) return 'good';
  if (p75 <= t.poor) return 'ni';
  return 'poor';
}

const RATING_COLOR: Record<string, string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ni: 'border-amber-200 bg-amber-50 text-amber-800',
  poor: 'border-red-200 bg-red-50 text-red-800'
};

export default async function AdminWebVitalsPage() {
  const stats = await getWebVitalStats(7);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}, {label: 'Web Vitals'}]}
        title="Core Web Vitals"
        description="ბოლო 7 დღის LCP / CLS / INP / FCP / TTFB. p75 = Google-ის ოფიციალური Search ranking signal. analytics-consent-გაცემული visitor-ების მონაცემი. 🔴 poor = ოპტიმიზაცია საჭირო."
      />
      <AdminSection>
        {stats.total === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            <Gauge size={24} className="mx-auto mb-2 text-text-3" />
            <p>მონაცემი ჯერ არ არის.</p>
            <p className="mt-1 text-text-3 text-xs">
              (ან migration 0023_web_vitals.sql არ გაუშვა, ან analytics consent ჯერ არავის გაუცია, ან
              feature flag <code>site.web-vitals</code> hidden-ში არის)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Per-metric cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {stats.metrics.map((m) => {
                const rating = rateByThreshold(m.metric, m.p75);
                const color = RATING_COLOR[rating];
                const t = THRESHOLDS[m.metric as CoreMetric];
                return (
                  <div key={m.metric} className={`rounded-card border p-4 ${color}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider">
                        {m.metric}
                      </h3>
                      <span className="text-[9px] font-mono uppercase opacity-70">p75</span>
                    </div>
                    <p className="mt-0.5 text-[26px] font-bold leading-none">
                      {formatValue(m.metric, m.p75)}
                    </p>
                    <div className="mt-2 flex items-center gap-x-3 font-mono text-[10px] opacity-80">
                      <span>p50 {formatValue(m.metric, m.p50)}</span>
                      <span>p95 {formatValue(m.metric, m.p95)}</span>
                    </div>
                    <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-black/10">
                      {m.good + m.needs_improvement + m.poor > 0 && (() => {
                        const total = m.good + m.needs_improvement + m.poor;
                        return (
                          <>
                            <div
                              className="bg-emerald-500"
                              style={{width: `${(m.good / total) * 100}%`}}
                            />
                            <div
                              className="bg-amber-500"
                              style={{width: `${(m.needs_improvement / total) * 100}%`}}
                            />
                            <div
                              className="bg-red-500"
                              style={{width: `${(m.poor / total) * 100}%`}}
                            />
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[9px] opacity-70">
                      <span>{m.good} good</span>
                      <span>{m.needs_improvement} ni</span>
                      <span>{m.poor} poor</span>
                    </div>
                    {t && (
                      <p className="mt-2 font-mono text-[9px] opacity-60">
                        good ≤ {t.good}{t.unit} · poor &gt; {t.poor}{t.unit}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[9px] opacity-60">
                      n={m.count}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Slowest pathnames */}
            {stats.top_slow.length > 0 && (
              <section className="rounded-card border border-bdr bg-sur overflow-hidden">
                <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                  <TrendingUp size={13} className="text-red-600" />
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                    ყველაზე ნელი pathname × metric (p75) · top {stats.top_slow.length}
                  </h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[12px]">
                    <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                      <tr>
                        <th className="px-3 py-2 text-left">pathname</th>
                        <th className="px-3 py-2 text-left">metric</th>
                        <th className="px-3 py-2 text-right">p75</th>
                        <th className="px-3 py-2 text-right">n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top_slow.map((s, i) => {
                        const rating = rateByThreshold(s.metric, s.p75);
                        return (
                          <tr key={i} className="border-t border-bdr hover:bg-sur-2">
                            <td className="px-3 py-2 font-mono text-[11px] text-navy max-w-[30ch] truncate" title={s.pathname}>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/admin/stats?path=${encodeURIComponent(s.pathname)}`}
                                  className="truncate hover:text-blue hover:underline"
                                  title="ნახე trafic-ი ამ გვერდზე"
                                >
                                  {s.pathname}
                                </Link>
                                <Link
                                  href={s.pathname}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-[10px] text-text-3 hover:text-blue"
                                  title="გახსენი გვერდი"
                                >
                                  ↗
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex h-5 items-center rounded-full border border-bdr bg-sur-2 px-2 font-mono text-[10px]">
                                {s.metric}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] font-bold ${RATING_COLOR[rating]}`}>
                                {formatValue(s.metric, s.p75)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-[10px] text-text-3">
                              {s.count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </AdminSection>
    </>
  );
}
