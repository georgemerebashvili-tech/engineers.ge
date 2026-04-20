import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {getConsentStats, listConsentLog} from '@/lib/consent-log';
import {BarChart3, Check, CheckCircle2, Cookie, Shield, Users} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Consent log · Admin · engineers.ge'};

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

export default async function AdminConsentLogPage() {
  const [stats, entries] = await Promise.all([
    getConsentStats(30),
    listConsentLog(300)
  ]);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მომხმარებლები'}, {label: 'Consent log'}]}
        title="Cookie consent log"
        description="ვიზიტორების არჩევანი cookie banner-ზე. GDPR compliance proof (ვინ როდის დაეთანხმა რას) + acceptance rate monitoring."
      />
      <AdminSection>
        {stats.total === 0 ? (
          <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
            ჯერ არცერთი consent decision არ დაფიქსირდა.
            <p className="mt-1 text-text-3 text-xs">
              (ან migration 0021_consent_log.sql-ი არ გაუშვა Supabase-ზე)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Kpi icon={Cookie} label="სულ decisions" value={stats.total} tone="neutral" />
              <Kpi icon={Users} label="უნიკ. visitors" value={stats.unique_visitors} tone="neutral" />
              <Kpi icon={BarChart3} label="Analytics ON" value={`${stats.acceptance_rate}%`} tone="good" />
              <Kpi icon={Check} label="Analytics total" value={stats.accepted_analytics} tone="good" />
              <Kpi icon={Shield} label="Essential-only" value={stats.essential_only} tone="neutral" />
            </div>

            {/* Acceptance bar */}
            <section className="rounded-card border border-bdr bg-sur p-4">
              <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                Breakdown (30 დღე)
              </h2>
              <AcceptanceBar
                label="Analytics cookies"
                accepted={stats.accepted_analytics}
                total={stats.total}
              />
              <AcceptanceBar
                label="Marketing cookies"
                accepted={stats.accepted_marketing}
                total={stats.total}
              />
              <AcceptanceBar
                label="Essential-only (decline ყველაფერი)"
                accepted={stats.essential_only}
                total={stats.total}
                tone="warn"
              />
            </section>

            {/* Recent decisions */}
            <section className="rounded-card border border-bdr bg-sur overflow-hidden">
              <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2.5">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                  Recent · {entries.length}
                </h2>
              </header>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                    <tr>
                      <th className="px-3 py-2 text-left">როდის</th>
                      <th className="px-3 py-2 text-left">action</th>
                      <th className="px-3 py-2 text-center">analytics</th>
                      <th className="px-3 py-2 text-center">marketing</th>
                      <th className="px-3 py-2 text-left">visitor</th>
                      <th className="px-3 py-2 text-left">pathname</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-t border-bdr hover:bg-sur-2">
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3 whitespace-nowrap" title={e.created_at}>
                          {relativeTime(e.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex h-5 items-center rounded-full border px-2 font-mono text-[9px] font-bold uppercase ${e.action === 'decide' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-bdr bg-sur-2 text-text-3'}`}>
                            {e.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.analytics ? (
                            <CheckCircle2 size={14} className="mx-auto text-emerald-600" />
                          ) : (
                            <span className="font-mono text-[10px] text-text-3">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.marketing ? (
                            <CheckCircle2 size={14} className="mx-auto text-emerald-600" />
                          ) : (
                            <span className="font-mono text-[10px] text-text-3">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                          {e.visitor_id ? e.visitor_id.slice(0, 8) + '…' : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3 truncate max-w-[30ch]" title={e.pathname ?? ''}>
                          {e.pathname ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </AdminSection>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: React.ComponentType<{size?: number; strokeWidth?: number}>;
  label: string;
  value: number | string;
  tone: 'good' | 'neutral' | 'warn';
}) {
  const colors =
    tone === 'good'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : tone === 'warn'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-text-2 bg-sur-2 border-bdr';
  return (
    <div className={`rounded-card border p-3 ${colors}`}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-80">
        <Icon size={12} strokeWidth={2.2} />
        {label}
      </div>
      <p className="mt-0.5 text-[22px] font-bold">{value}</p>
    </div>
  );
}

function AcceptanceBar({
  label,
  accepted,
  total,
  tone = 'good'
}: {
  label: string;
  accepted: number;
  total: number;
  tone?: 'good' | 'warn';
}) {
  const pct = total === 0 ? 0 : Math.round((accepted / total) * 100);
  const color = tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-[11px] text-text-2">
        <span>{label}</span>
        <span className="font-mono text-text-3">
          {accepted}/{total} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sur-2">
        <div className={`h-full ${color} transition-all`} style={{width: `${pct}%`}} />
      </div>
    </div>
  );
}
