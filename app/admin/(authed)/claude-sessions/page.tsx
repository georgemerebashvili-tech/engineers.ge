import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {
  getSessions,
  getRecentEvents,
  getHeartbeatStats,
  computeStats,
  formatDuration,
  formatHours,
  type ClaudeSessionRow,
  type ClaudeSessionEvent,
  type HeartbeatStats
} from '@/lib/claude-sessions';
import {Bot, Clock, Activity, Zap, CalendarDays, Hash, Heart} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {title: 'Claude Sessions · Admin · engineers.ge'};

export default async function ClaudeSessionsPage() {
  let sessions: ClaudeSessionRow[] = [];
  let events: ClaudeSessionEvent[] = [];
  let heartbeats: HeartbeatStats = {total: 0, last24h: 0, last7d: 0, activeLastHour: 0};
  let error: string | null = null;
  try {
    [sessions, events, heartbeats] = await Promise.all([
      getSessions(500),
      getRecentEvents(50),
      getHeartbeatStats().catch(() => ({total: 0, last24h: 0, last7d: 0, activeLastHour: 0}))
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'query failed';
  }
  const stats = computeStats(sessions);

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'ანალიტიკა'}, {label: 'Claude Sessions'}]}
        title="Claude-ის სამუშაო დრო"
        description="რამდენი საათი მუშაობდა Claude ამ პროექტზე. server-side timestamps, hook-დან ნაკრები."
      />
      <AdminSection>
        {error ? (
          <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4 text-[12px] text-red-900">
            <div className="font-semibold">მონაცემების ვერ წამოღება</div>
            <div className="mt-1 font-mono">{error}</div>
            <p className="mt-2 text-[11px] text-red-800">
              დარწმუნდი რომ <code>0014_claude_sessions.sql</code> migration გაშვებულია და{' '}
              <code>CLAUDE_HOOK_SECRET</code> დაყენებულია.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <StatTile
            icon={<Clock size={14} />}
            label="სულ"
            value={`${formatHours(stats.totalSeconds)}სთ`}
            hint={formatDuration(stats.totalSeconds)}
          />
          <StatTile
            icon={<CalendarDays size={14} />}
            label="ბოლო 24სთ"
            value={`${formatHours(stats.todaySeconds)}სთ`}
            hint={formatDuration(stats.todaySeconds)}
          />
          <StatTile
            icon={<CalendarDays size={14} />}
            label="ბოლო 7 დღე"
            value={`${formatHours(stats.last7Seconds)}სთ`}
            hint={formatDuration(stats.last7Seconds)}
          />
          <StatTile
            icon={<CalendarDays size={14} />}
            label="ბოლო 30 დღე"
            value={`${formatHours(stats.last30Seconds)}სთ`}
            hint={formatDuration(stats.last30Seconds)}
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <StatTile
            icon={<Hash size={14} />}
            label="სულ სესიები"
            value={String(stats.totalSessions)}
            hint={`${stats.activeSessions} აქტიური`}
          />
          <StatTile
            icon={<Activity size={14} />}
            label="საშუალო სესია"
            value={formatDuration(stats.avgSessionSeconds)}
            hint="დახურული სესიების მიხედვით"
          />
          <StatTile
            icon={<Zap size={14} />}
            label="აქტიური ახლა"
            value={String(stats.activeSessions)}
            hint="start მიღებულია, end არა"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <StatTile
            icon={<Heart size={14} />}
            label="Heartbeat სულ"
            value={heartbeats.total.toLocaleString()}
            hint="ყოველ 60წმ-ში → launchd agent"
          />
          <StatTile
            icon={<Heart size={14} />}
            label="24სთ heartbeats"
            value={heartbeats.last24h.toLocaleString()}
            hint={`≈ ${Math.round((heartbeats.last24h * 60) / 3600)}სთ active`}
          />
          <StatTile
            icon={<Heart size={14} />}
            label="7 დღე heartbeats"
            value={heartbeats.last7d.toLocaleString()}
            hint={`≈ ${Math.round((heartbeats.last7d * 60) / 3600)}სთ active`}
          />
          <StatTile
            icon={<Zap size={14} />}
            label="ახლა active"
            value={String(heartbeats.activeLastHour)}
            hint="unique session-ები ბოლო 1სთ-ში"
          />
        </div>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Bot size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">სესიები</h2>
            <span className="font-mono text-[10px] text-text-3">
              {sessions.length} rows
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                <tr>
                  <th className="px-3 py-2 text-left">დაწყება</th>
                  <th className="px-3 py-2 text-left">დასრულება</th>
                  <th className="px-3 py-2 text-left">ხანგრძ.</th>
                  <th className="px-3 py-2 text-left">project</th>
                  <th className="px-3 py-2 text-left">model</th>
                  <th className="px-3 py-2 text-left">session</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-text-3">
                      ჯერ არცერთი სესია არ არის ჩაწერილი. გადახედე hook setup-ს ქვემოთ.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => {
                    const open = s.ended_at == null;
                    // Server component — Date.now() during render is fine; the
                    // page is marked force-dynamic so each render gets a fresh value.
                    // eslint-disable-next-line react-hooks/purity
                    const nowMs = Date.now();
                    const dur =
                      s.duration_seconds ??
                      Math.min(
                        Math.max(
                          0,
                          Math.round((nowMs - new Date(s.started_at).getTime()) / 1000)
                        ),
                        24 * 60 * 60
                      );
                    return (
                      <tr key={s.session_id} className="border-t">
                        <td className="px-3 py-2 font-mono text-[11px] text-navy">
                          {fmtDate(s.started_at)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-2">
                          {s.ended_at ? (
                            fmtDate(s.ended_at)
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 text-[9px] font-semibold text-grn">
                              active
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-navy">
                          {formatDuration(dur)}
                          {open && <span className="ml-1 text-text-3">(so far)</span>}
                        </td>
                        <td className="px-3 py-2 text-text-2">{s.project ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                          {s.model ?? '—'}
                        </td>
                        <td
                          className="px-3 py-2 font-mono text-[10px] text-text-3"
                          title={s.session_id}
                        >
                          {s.session_id.slice(0, 8)}…
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Activity size={14} className="text-blue" />
            <h2 className="text-sm font-bold text-navy">ბოლო event-ები</h2>
            <span className="font-mono text-[10px] text-text-3">
              server-clock
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
                <tr>
                  <th className="px-3 py-2 text-left">server time</th>
                  <th className="px-3 py-2 text-left">kind</th>
                  <th className="px-3 py-2 text-left">session</th>
                  <th className="px-3 py-2 text-left">project</th>
                  <th className="px-3 py-2 text-left">ip</th>
                  <th className="px-3 py-2 text-left">client time</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-text-3">
                      event არ არის.
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-[11px] text-navy">
                        {fmtDate(e.event_at)}
                      </td>
                      <td className="px-3 py-2">
                        <KindBadge kind={e.kind} />
                      </td>
                      <td
                        className="px-3 py-2 font-mono text-[10px] text-text-3"
                        title={e.session_id}
                      >
                        {e.session_id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 text-text-2">{e.project ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                        {e.source_ip ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                        {e.client_at ? fmtDate(e.client_at) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border bg-sur p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
            <Bot size={14} className="text-blue" /> Hook setup
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[12px] text-text-2">
            <li>
              დააყენე env var: <code className="font-mono">CLAUDE_HOOK_SECRET=…</code>{' '}
              (production + local).
            </li>
            <li>
              გაუშვი migration{' '}
              <code className="font-mono">supabase/migrations/0014_claude_sessions.sql</code>.
            </li>
            <li>
              დაამატე hook-ები <code className="font-mono">~/.claude/settings.json</code>-ში (ან
              project-level <code className="font-mono">.claude/settings.json</code>) და შექმენი{' '}
              <code className="font-mono">~/.claude/hooks/claude-session-log.sh</code>. ნიმუში
              ნახე <code className="font-mono">docs/claude-session-tracking.md</code>-ში.
            </li>
            <li>
              წყარო: server-side <code className="font-mono">event_at = now()</code> — client-ის
              საათს არ ვენდობით.
            </li>
          </ol>
        </section>
      </AdminSection>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-sur p-3">
      <div className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[18px] font-bold text-navy">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-3">{hint}</div>}
    </div>
  );
}

function KindBadge({kind}: {kind: 'start' | 'end' | 'stop' | 'heartbeat'}) {
  const map = {
    start: 'border-grn-bd bg-grn-lt text-grn',
    end: 'border-bdr bg-sur-2 text-text-2',
    stop: 'border-bdr bg-sur-2 text-text-2',
    heartbeat: 'border-blue-bd bg-blue-lt text-blue'
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${map[kind]}`}
    >
      {kind === 'heartbeat' ? '♥ beat' : kind}
    </span>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ka-GE', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
