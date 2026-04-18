import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {
  checkEnv,
  listLocalMigrations,
  probeMigrations,
  probeStorageBucket
} from '@/lib/system-health';
import {
  CheckCircle2,
  AlertTriangle,
  Database,
  Key,
  HardDrive,
  XCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'System health · Admin · engineers.ge'};

export default async function HealthPage() {
  const envs = checkEnv();
  const localMigrations = listLocalMigrations();
  const migrations = await probeMigrations();
  const bucketProbe = await probeStorageBucket('public-assets');

  const requiredMissing = envs.filter((e) => e.required && !e.set);
  const migrationsPending = migrations.filter(
    (m) => m.tableExists === false || m.missingColumns.length > 0
  );
  const migrationsUnknown = migrations.filter((m) => m.tableExists === null);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მთავარი'}, {label: 'System health'}]}
        title="სისტემის ჯანმრთელობა"
        description="Env variables, Supabase connectivity, migration სტატუსი და Storage ბუკეტის ხელმისაწვდომობა."
      />
      <AdminSection>
        <div className="grid gap-3 md:grid-cols-3">
          <HealthTile
            title="Required env"
            value={requiredMissing.length === 0 ? 'ყველაფერი OK' : `${requiredMissing.length} აკლია`}
            ok={requiredMissing.length === 0}
            icon={<Key size={14} />}
          />
          <HealthTile
            title="DB migrations"
            value={
              migrationsUnknown.length > 0
                ? 'Supabase env აკლია'
                : migrationsPending.length === 0
                ? 'up-to-date'
                : `${migrationsPending.length} pending`
            }
            ok={migrationsUnknown.length === 0 && migrationsPending.length === 0}
            icon={<Database size={14} />}
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
  icon
}: {
  title: string;
  value: string;
  ok: boolean;
  icon: React.ReactNode;
}) {
  return (
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
}
