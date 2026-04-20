import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getNotFoundStats} from '@/lib/not-found-events';
import Link from 'next/link';
import {ExternalLink, FileQuestion, TrendingDown, Globe2, ArrowRight} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: '404 tracking · Admin · engineers.ge'};

function relativeTime(iso: string): string {
  const ago = Date.now() - new Date(iso).getTime();
  const min = Math.round(ago / 60000);
  if (min < 1) return 'ახლახან';
  if (min < 60) return `${min} წთ წინ`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} სთ წინ`;
  const d = Math.round(hr / 24);
  return `${d} დღე წინ`;
}

export default async function AdminNotFoundsPage() {
  const stats = await getNotFoundStats(30);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}, {label: '404s'}]}
        title="404 tracking"
        description="ყველა broken URL ბოლო 30 დღის განმავლობაში. ხედავ რომელი ბმული გატყდა და საიდან მოდის ხალხი — გადახედე fix-ი / redirect-ი."
      />
      <AdminSection>
        {stats.total === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            ბოლო 30 დღეში ერთი 404-იც არ დაფიქსირდა.
            <p className="mt-1 text-text-3 text-xs">
              (ან migration 0019 არ გაუშვა: <code className="font-mono">0019_not_found_events.sql</code>)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary KPI */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-card border border-red-200 bg-red-50 p-3 text-red-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  <FileQuestion size={12} />
                  სულ 404
                </div>
                <p className="mt-0.5 text-[22px] font-bold">{stats.total}</p>
                <p className="font-mono text-[10px] text-red-700/70">30 დღე</p>
              </div>
              <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  <TrendingDown size={12} />
                  უნიკ. URL
                </div>
                <p className="mt-0.5 text-[22px] font-bold">{stats.top_paths.length}</p>
              </div>
              <div className="rounded-card border border-blue-200 bg-blue-50 p-3 text-blue-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  <Globe2 size={12} />
                  Referrer-ები
                </div>
                <p className="mt-0.5 text-[22px] font-bold">{stats.top_referrers.length}</p>
              </div>
            </div>

            {/* Top broken paths */}
            <section className="rounded-card border border-bdr bg-sur overflow-hidden">
              <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                  Top broken paths · {stats.top_paths.length}
                </h2>
              </header>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                    <tr>
                      <th className="px-3 py-2 text-left">pathname</th>
                      <th className="px-3 py-2 text-right">hits</th>
                      <th className="px-3 py-2 text-left">latest</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_paths.map((p) => (
                      <tr key={p.pathname} className="border-t border-bdr hover:bg-sur-2">
                        <td className="px-3 py-2 font-mono text-[11px] text-navy truncate max-w-[40ch]" title={p.pathname}>
                          {p.pathname}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex h-5 items-center rounded-full border border-red-200 bg-red-50 px-2 font-mono text-[10px] font-bold text-red-700">
                            ×{p.count}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                          {relativeTime(p.latest_at)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/redirects?prefill_source=${encodeURIComponent(p.pathname)}`}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700 hover:bg-emerald-100"
                            >
                              redirect <ArrowRight size={10} />
                            </Link>
                            <Link
                              href={p.pathname}
                              target="_blank"
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-blue hover:underline"
                            >
                              ნახე <ExternalLink size={10} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Top referrers */}
            {stats.top_referrers.length > 0 && (
              <section className="rounded-card border border-bdr bg-sur overflow-hidden">
                <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                    Top referrers · {stats.top_referrers.length}
                  </h2>
                </header>
                <ul className="divide-y divide-bdr">
                  {stats.top_referrers.map((r) => (
                    <li key={r.referrer} className="flex items-center gap-3 px-4 py-2">
                      <span className="shrink-0 rounded-full border border-bdr bg-sur-2 px-2 font-mono text-[10px] text-text-3">
                        ×{r.count}
                      </span>
                      <a
                        href={r.referrer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate font-mono text-[11px] text-blue hover:underline"
                        title={r.referrer}
                      >
                        {r.referrer}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recent */}
            <section className="rounded-card border border-bdr bg-sur overflow-hidden">
              <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                  Recent · {stats.recent.length}
                </h2>
              </header>
              <ul className="divide-y divide-bdr">
                {stats.recent.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-2 hover:bg-sur-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] text-navy" title={r.pathname}>
                        {r.pathname}
                      </p>
                      {r.referrer && (
                        <p className="truncate font-mono text-[10px] text-text-3" title={r.referrer}>
                          ← {r.referrer}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-text-3">
                      {relativeTime(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </AdminSection>
    </>
  );
}
