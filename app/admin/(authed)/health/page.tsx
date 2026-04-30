import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {
  checkEnv,
  getQuickCounts,
  listLocalMigrations,
  probeAnthropic,
  probeMigrations,
  probeStorageBucket,
  probeSupabaseLatency
} from '@/lib/system-health';
import {
  CheckCircle2,
  AlertTriangle,
  Bug,
  Database,
  Gauge,
  Key,
  HardDrive,
  Rocket,
  Sparkles,
  ToggleRight,
  XCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'System health · Admin · engineers.ge'};

export default async function HealthPage() {
  const envs = checkEnv();
  const localMigrations = listLocalMigrations();
  const [migrations, bucketProbe, supabasePing, anthropicPing, counts] =
    await Promise.all([
      probeMigrations(),
      probeStorageBucket('public-assets'),
      probeSupabaseLatency(),
      probeAnthropic(),
      getQuickCounts()
    ]);

  const requiredMissing = envs.filter((e) => e.required && !e.set);
  const migrationsPending = migrations.filter(
    (m) => m.tableExists === false || m.missingColumns.length > 0
  );
  const migrationsUnknown = migrations.filter((m) => m.tableExists === null);

  // Launch-readiness scorecard — which critical checks pass?
  const readiness = [
    {
      id: 'env',
      label: 'Required env vars',
      ok: requiredMissing.length === 0,
      detail: requiredMissing.length === 0 ? 'ყველაფერი OK' : `${requiredMissing.length} აკლია`
    },
    {
      id: 'supabase',
      label: 'Supabase კავშირი',
      ok: supabasePing.ok,
      detail: supabasePing.detail
    },
    {
      id: 'migrations',
      label: 'DB migrations',
      ok: migrationsUnknown.length === 0 && migrationsPending.length === 0,
      detail:
        migrationsUnknown.length > 0
          ? 'Supabase env აკლია'
          : migrationsPending.length === 0
          ? 'up-to-date'
          : `${migrationsPending.length} pending`
    },
    {
      id: 'storage',
      label: 'Storage bucket',
      ok: bucketProbe.ok,
      detail: bucketProbe.detail
    },
    {
      id: 'anthropic',
      label: 'Anthropic API',
      ok: anthropicPing.ok,
      detail: anthropicPing.detail
    }
  ];
  const okCount = readiness.filter((r) => r.ok).length;
  const totalCount = readiness.length;
  const allGreen = okCount === totalCount;

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მონიტორინგი'}, {label: 'System health'}]}
        title="სისტემის ჯანმრთელობა"
        description="Env variables, Supabase connectivity, migration სტატუსი და Storage ბუკეტის ხელმისაწვდომობა."
      />
      <AdminSection>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
          <a
            href="/admin/launch-checklist"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-3 py-1.5 font-semibold text-blue transition-colors hover:bg-blue hover:text-white"
          >
            🚀 Launch checklist — deep dive →
          </a>
          <span className="text-text-3">
            ან Deploy ღილაკი: <a className="text-blue underline" href="/admin/sitemap">/admin/sitemap</a>
          </span>
        </div>
        {/* Launch readiness scorecard */}
        <section
          className={`mb-6 rounded-card border-2 p-5 ${
            allGreen
              ? 'border-emerald-300 bg-emerald-50'
              : okCount >= 3
              ? 'border-amber-300 bg-amber-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Rocket
                  size={18}
                  className={
                    allGreen
                      ? 'text-emerald-600'
                      : okCount >= 3
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }
                />
                <h2
                  className={`text-[16px] font-bold ${
                    allGreen
                      ? 'text-emerald-900'
                      : okCount >= 3
                      ? 'text-amber-900'
                      : 'text-red-900'
                  }`}
                >
                  {allGreen
                    ? 'სისტემა გაშვებისთვის მზადაა'
                    : okCount >= 3
                    ? 'თითქმის მზადაა'
                    : 'Launch-მდე კრიტიკული items აკლია'}
                </h2>
              </div>
              <p className="mt-1 text-[12px] text-text-2">
                {okCount}/{totalCount} კრიტიკული check გაიარა
              </p>
            </div>
            <div
              className={`rounded-full border-2 px-3 py-1 font-mono text-[14px] font-bold ${
                allGreen
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                  : okCount >= 3
                  ? 'border-amber-500 bg-amber-100 text-amber-800'
                  : 'border-red-500 bg-red-100 text-red-800'
              }`}
            >
              {okCount}/{totalCount}
            </div>
          </div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {readiness.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-md bg-white/60 px-3 py-2"
              >
                {item.ok ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                )}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-navy">{item.label}</p>
                  <p className="truncate font-mono text-[10px] text-text-3" title={item.detail}>
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Quick operational counts */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <HealthTile
            title="Bug reports (open)"
            value={counts.bug_reports_open === 0 ? 'არ არის' : String(counts.bug_reports_open)}
            ok={counts.bug_reports_open === 0}
            icon={<Bug size={14} />}
          />
          <HealthTile
            title="Features in test"
            value={counts.features_test === 0 ? 'არც ერთი' : String(counts.features_test)}
            ok={true}
            icon={<ToggleRight size={14} />}
          />
          <HealthTile
            title="Features hidden"
            value={counts.features_hidden === 0 ? 'არც ერთი' : String(counts.features_hidden)}
            ok={true}
            icon={<ToggleRight size={14} />}
          />
          <HealthTile
            title="დღ. ვიზიტები"
            value={counts.today_views === 0 ? '0' : String(counts.today_views)}
            ok={true}
            icon={<Gauge size={14} />}
            href="/admin/stats"
          />
          <HealthTile
            title="დღ. უნიკ. ვიზ."
            value={counts.today_uniques === 0 ? '0' : String(counts.today_uniques)}
            ok={true}
            icon={<Gauge size={14} />}
            href="/admin/stats"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <HealthTile
            title="Supabase ping"
            value={
              supabasePing.latency_ms !== null
                ? `${supabasePing.latency_ms}ms`
                : supabasePing.detail
            }
            ok={supabasePing.ok}
            icon={<Gauge size={14} />}
          />
          <HealthTile
            title="Anthropic API"
            value={anthropicPing.detail}
            ok={anthropicPing.ok}
            icon={<Sparkles size={14} />}
          />
          <HealthTile
            title="Storage bucket"
            value={bucketProbe.detail}
            ok={bucketProbe.ok}
            icon={<HardDrive size={14} />}
          />
        </div>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Key size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">Environment variables</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                <tr>
                  <th className="px-3 py-2 text-left">ცვლადი</th>
                  <th className="px-3 py-2 text-left">required</th>
                  <th className="px-3 py-2 text-left">სტატუსი</th>
                  <th className="px-3 py-2 text-left">რისთვის</th>
                </tr>
              </thead>
              <tbody>
                {envs.map((e) => (
                  <tr key={e.key} className="border-t">
                    <td className="px-3 py-2 font-mono text-navy">{e.key}</td>
                    <td className="px-3 py-2">
                      {e.required ? (
                        <span className="rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora">
                          required
                        </span>
                      ) : (
                        <span className="rounded-full border bg-sur-2 px-2 py-0.5 font-mono text-[9px] text-text-3">
                          optional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.set ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-grn">
                          <CheckCircle2 size={10} /> set
                        </span>
                      ) : e.required ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-lt bg-red-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-danger">
                          <XCircle size={10} /> missing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border bg-sur-2 px-2 py-0.5 font-mono text-[9px] text-text-3">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-2">{e.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Database size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">Database migrations</h2>
            <span className="font-mono text-[10px] text-text-3">
              local: {localMigrations.length}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                <tr>
                  <th className="px-3 py-2 text-left">file</th>
                  <th className="px-3 py-2 text-left">target table</th>
                  <th className="px-3 py-2 text-left">სტატუსი</th>
                  <th className="px-3 py-2 text-left">description</th>
                </tr>
              </thead>
              <tbody>
                {migrations.map((m) => (
                  <tr key={m.file} className="border-t">
                    <td className="px-3 py-2 font-mono text-[11px] text-navy">
                      {m.file}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-2">
                      {m.probeTable ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {m.tableExists === null ? (
                        <span className="inline-flex items-center gap-1 rounded-full border bg-sur-2 px-2 py-0.5 font-mono text-[9px] text-text-3">
                          <AlertTriangle size={10} /> unknown
                        </span>
                      ) : m.tableExists && m.missingColumns.length === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-grn">
                          <CheckCircle2 size={10} /> applied
                        </span>
                      ) : m.tableExists === false ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-lt bg-red-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-danger">
                          <XCircle size={10} /> table missing
                        </span>
                      ) : (
                        <span
                          title={m.missingColumns.join(', ')}
                          className="inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora"
                        >
                          <AlertTriangle size={10} /> {m.missingColumns.length} col missing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-2">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(migrationsPending.length > 0 || migrationsUnknown.length > 0) && (
            <p className="border-t px-4 py-2 text-[11px] text-text-3">
              გასაშვებად: Supabase Dashboard → SQL Editor → ჩააკოპირე შესაბამისი{' '}
              <code>.sql</code> ფაილის შიგთავსი და Run. ფაილები:{' '}
              <code className="font-mono">supabase/migrations/</code>
            </p>
          )}
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <HardDrive size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">Storage</h2>
          </header>
          <div className="px-4 py-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-navy">public-assets</span>
              {bucketProbe.ok ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-grn">
                  <CheckCircle2 size={10} /> ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[9px] font-semibold text-ora">
                  <AlertTriangle size={10} /> not ready
                </span>
              )}
            </div>
            <p className="mt-1 text-text-3">{bucketProbe.detail}</p>
          </div>
        </section>
      </AdminSection>
    </>
  );
}

function HealthTile({
  title,
  value,
  ok,
  icon,
  href
}: {
  title: string;
  value: string;
  ok: boolean;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="rounded-[var(--radius-card)] border bg-sur p-3">
      <div className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {icon}
        {title}
      </div>
      <div
        className={`mt-1 text-[16px] font-bold ${
          ok ? 'text-grn' : 'text-ora'
        }`}
      >
        {value}
      </div>
    </div>
  );
  if (href) return <a href={href} className="block hover:opacity-80">{inner}</a>;
  return inner;
}
