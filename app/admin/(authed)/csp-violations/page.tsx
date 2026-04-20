import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {groupCspViolations, listCspViolations} from '@/lib/csp-violations';
import {Shield, AlertTriangle} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'CSP violations · Admin · engineers.ge'};

function relativeTime(iso: string): string {
  const ago = Date.now() - new Date(iso).getTime();
  const min = Math.round(ago / 60000);
  if (min < 1) return 'ახლახან';
  if (min < 60) return `${min} წთ წინ`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} სთ წინ`;
  return `${Math.round(hr / 24)} დღე წინ`;
}

export default async function AdminCspPage() {
  const [recent, grouped] = await Promise.all([
    listCspViolations(300),
    groupCspViolations()
  ]);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'CSP violations'}]}
        title="CSP violations"
        description="Content-Security-Policy blocked a resource. If a legitimate site feature is broken → loosen the matching directive in next.config.ts. If it's an injection attempt → leave CSP as-is and investigate."
      />
      <AdminSection>
        {recent.length === 0 ? (
          <div className="rounded-card border border-emerald-200 bg-emerald-50 p-8 text-center text-sm text-emerald-800">
            <Shield size={24} className="mx-auto mb-2 text-emerald-600" />
            <p className="font-semibold">CSP violations არ არის.</p>
            <p className="mt-1 text-emerald-700 text-xs">
              (ან migration 0022_csp_violations.sql-ი არ გაუშვა Supabase-ზე — გადახედე /admin/health-ს)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-card border border-red-200 bg-red-50 p-3 text-red-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  <AlertTriangle size={12} />
                  total
                </div>
                <p className="mt-0.5 text-[22px] font-bold">{recent.length}</p>
              </div>
              <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="font-mono text-[10px] uppercase tracking-wider">უნიკ. directive</div>
                <p className="mt-0.5 text-[22px] font-bold">
                  {new Set(grouped.map((g) => g.directive)).size}
                </p>
              </div>
              <div className="rounded-card border border-blue-200 bg-blue-50 p-3 text-blue-800">
                <div className="font-mono text-[10px] uppercase tracking-wider">უნიკ. blocked URL</div>
                <p className="mt-0.5 text-[22px] font-bold">{grouped.length}</p>
              </div>
            </div>

            {/* Grouped triage view */}
            <section className="rounded-card border border-bdr bg-sur overflow-hidden">
              <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                  Grouped violations (triage first)
                </h2>
              </header>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                    <tr>
                      <th className="px-3 py-2 text-left">directive</th>
                      <th className="px-3 py-2 text-left">blocked_uri</th>
                      <th className="px-3 py-2 text-right">hits</th>
                      <th className="px-3 py-2 text-left">latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g, i) => (
                      <tr key={i} className="border-t border-bdr hover:bg-sur-2">
                        <td className="px-3 py-2">
                          <span className="inline-flex h-5 items-center rounded-full border border-bdr bg-sur-2 px-2 font-mono text-[10px] text-text-2">
                            {g.directive}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-navy max-w-[40ch] truncate" title={g.blocked_uri}>
                          {g.blocked_uri}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex h-5 items-center rounded-full border border-red-200 bg-red-50 px-2 font-mono text-[10px] font-bold text-red-700">
                            ×{g.count}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                          {relativeTime(g.latest_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Raw recent */}
            <section className="rounded-card border border-bdr bg-sur overflow-hidden">
              <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                  Recent · {recent.length}
                </h2>
              </header>
              <ul className="divide-y divide-bdr">
                {recent.slice(0, 100).map((v) => (
                  <li key={v.id} className="px-4 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex h-5 items-center rounded-full border border-bdr bg-sur-2 px-2 font-mono text-[9px] font-bold uppercase text-text-2">
                        {v.violated_directive ?? v.effective_directive ?? '—'}
                      </span>
                      <span className="font-mono text-[11px] text-navy truncate" title={v.blocked_uri ?? ''}>
                        {v.blocked_uri ?? 'inline'}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-text-3">
                        {relativeTime(v.created_at)}
                      </span>
                    </div>
                    {v.document_uri && (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-text-3" title={v.document_uri}>
                        on {v.document_uri}
                      </p>
                    )}
                    {v.source_file && (
                      <p className="truncate font-mono text-[10px] text-text-3">
                        src {v.source_file}{v.line_number ? `:${v.line_number}` : ''}
                      </p>
                    )}
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
