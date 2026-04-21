'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

type Developer = {
  id: string;
  name: string;
  email: string | null;
  disabled: boolean;
  status: 'online' | 'idle' | 'offline';
  last_seen: string | null;
  last_event: string | null;
  last_session: string | null;
  last_repo: string | null;
  sessions_total: number;
  prompts: number;
  tools: number;
  errors: number;
  minutes_today: number;
  os: string | null;
  host: string | null;
  claude_version: string | null;
};

type SessionRow = {
  developer: string;
  session_id: string;
  started: string;
  ended: string;
  tools: number;
  errors: number;
  closed: boolean;
  repo_id: string | null;
  duration_min: number;
};

type EventRow = {
  id: number;
  developer: string;
  event_type: string;
  session_id: string | null;
  ts_server: string;
  repo_id: string | null;
  data: Record<string, unknown>;
};

type State = {
  generated_at: string;
  totals: {
    events: number;
    integrity_broken: number;
    devs: number;
    devs_online: number;
    devs_idle: number;
    errors_recent: number;
  };
  developers: Developer[];
  sessions: SessionRow[];
  recent: EventRow[];
};

const POLL_MS = 3000;

const STATUS_STYLE: Record<Developer['status'], string> = {
  online: 'bg-emerald-100 text-emerald-700',
  idle: 'bg-amber-100 text-amber-700',
  offline: 'bg-slate-200 text-slate-600'
};

const EVENT_STYLE: Record<string, string> = {
  session_start: 'bg-emerald-100 text-emerald-700',
  session_end: 'bg-slate-200 text-slate-600',
  stop: 'bg-slate-200 text-slate-600',
  prompt: 'bg-yellow-100 text-yellow-800',
  tool_pre: 'bg-blue-100 text-blue-700',
  tool_post: 'bg-blue-100 text-blue-700',
  error: 'bg-red-100 text-red-700',
  notification: 'bg-purple-100 text-purple-700',
  install_handshake: 'bg-indigo-100 text-indigo-700'
};

function eventPillStyle(type: string) {
  return EVENT_STYLE[type] ?? 'bg-slate-100 text-slate-600';
}

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const d = (Date.now() - t) / 1000;
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'});
}

export function SazeoDashboard() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/sazeo/api/state', {cache: 'no-store'});
      if (r.status === 401) {
        setError('unauthorized — log in at /admin first');
        return;
      }
      if (!r.ok) {
        setError(`state error: ${r.status}`);
        return;
      }
      const data = (await r.json()) as State;
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    const clockTick = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(clockTick);
    };
  }, [load]);

  const totals = state?.totals;

  const kpis = useMemo(
    () => [
      {label: 'მთლ. EVENTS', value: totals?.events ?? 0, tone: 'text-slate-900'},
      {label: 'დეველოპერი', value: totals?.devs ?? 0, tone: 'text-slate-900'},
      {label: 'ONLINE', value: totals?.devs_online ?? 0, tone: 'text-emerald-600'},
      {label: 'IDLE', value: totals?.devs_idle ?? 0, tone: 'text-amber-600'},
      {label: 'შეცდომა', value: totals?.errors_recent ?? 0, tone: 'text-red-600'},
      {
        label: 'INTEGRITY BREAK',
        value: totals?.integrity_broken ?? 0,
        tone:
          (totals?.integrity_broken ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'
      }
    ],
    [totals]
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[var(--bdr)] bg-[var(--sur)] px-5 shadow-[var(--shadow-sticky)]">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[var(--blue)] to-[var(--navy)] text-[11px] font-bold text-white">
            S
          </div>
          <h1 className="text-sm font-semibold">Sazeo · Claude Tracker</h1>
          <span className="font-mono text-[10px] text-[var(--text-3)]">DMT · contracted devs</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-3)]">
          {error ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {error}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              live · {POLL_MS / 1000}s
            </span>
          )}
          {state && <span>sync {fmtAgo(state.generated_at)} ago</span>}
          <span suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      <section className="border-b border-[var(--bdr)] bg-[var(--sur)] px-5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">დეველოპერთა მონიტორინგი</h2>
            <p className="text-xs text-[var(--text-3)]">
              ინფორმაცია იწერება მხოლოდ იმ სესიებისთვის სადაც{' '}
              <code className="rounded bg-[var(--sur-2)] px-1 font-mono text-[11px]">.dmt-tracker</code>{' '}
              marker ფაილი არის რეპოს root-ში.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-md border border-[var(--bdr)] bg-[var(--sur-2)] px-3 py-2.5"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-3)]">
                {k.label}
              </div>
              <div className={`font-mono text-[22px] font-semibold leading-none ${k.tone}`}>
                {loading && !state ? '—' : k.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-[1760px] space-y-3.5 px-5 pb-12 pt-4">
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <Card title="Developers">
              {state && state.developers.length === 0 && (
                <div className="rounded-md border border-dashed border-[var(--bdr)] bg-[var(--sur-2)] p-8 text-center text-sm text-[var(--text-3)]">
                  ჯერ არცერთი დეველოპერი არ არის რეგისტრირებული.
                  <br />
                  გააკეთე POST <code className="font-mono text-[11px]">/sazeo/api/developers</code>{' '}
                  name-ით.
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {state?.developers.map((d) => (
                  <DeveloperCard key={d.id} dev={d} tick={tick} />
                ))}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4">
            <Card title="Live timeline" subtle="ბოლო 120 event">
              <div className="max-h-[520px] overflow-auto">
                {state?.recent.map((ev) => (
                  <div
                    key={ev.id}
                    className="grid grid-cols-[70px_96px_1fr] items-baseline gap-2 border-b border-dashed border-[var(--bdr)] py-1.5 font-mono text-[11px] last:border-b-0"
                  >
                    <span className="text-[var(--text-3)]">{fmtTime(ev.ts_server)}</span>
                    <span
                      className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${eventPillStyle(
                        ev.event_type
                      )}`}
                    >
                      {ev.event_type}
                    </span>
                    <span className="truncate text-[var(--text-2)]">
                      <span className="font-semibold">{ev.developer}</span>
                      {ev.repo_id && <span className="text-[var(--text-3)]"> · {ev.repo_id}</span>}
                      {ev.session_id && (
                        <span className="text-[var(--text-3)]"> · {ev.session_id.slice(0, 10)}</span>
                      )}
                    </span>
                  </div>
                ))}
                {state?.recent.length === 0 && (
                  <div className="py-6 text-center text-xs text-[var(--text-3)]">ჯერ event-ი არ მოსულა.</div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Card title="Sessions" subtle="ბოლო 60 სესია">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-3)]">
                <tr className="border-b border-[var(--bdr)] bg-[var(--sur-2)]">
                  <th className="px-3 py-2 text-left">დეველოპერი</th>
                  <th className="px-3 py-2 text-left">სესია</th>
                  <th className="px-3 py-2 text-left">რეპო</th>
                  <th className="px-3 py-2 text-left">დაწყება</th>
                  <th className="px-3 py-2 text-left">ხანგრძლ.</th>
                  <th className="px-3 py-2 text-left">Tool</th>
                  <th className="px-3 py-2 text-left">Error</th>
                  <th className="px-3 py-2 text-left">სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {state?.sessions.map((s) => (
                  <tr key={s.session_id} className="border-b border-[var(--bdr)] last:border-b-0">
                    <td className="px-3 py-2 font-medium">{s.developer}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-2)]">
                      {s.session_id.slice(0, 12)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-2)]">
                      {s.repo_id ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-3)]">
                      {fmtTime(s.started)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{s.duration_min}m</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{s.tools}</td>
                    <td
                      className={`px-3 py-2 font-mono text-[11px] ${
                        s.errors > 0 ? 'text-red-600 font-semibold' : ''
                      }`}
                    >
                      {s.errors}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                          s.closed
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {s.closed ? 'closed' : 'open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Card({
  title,
  subtle,
  children
}: {
  title: string;
  subtle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--bdr)] bg-[var(--sur)] p-4 shadow-[var(--shadow-card)]">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
          {title}
        </h3>
        {subtle && <span className="text-[11px] text-[var(--text-3)]">{subtle}</span>}
      </header>
      {children}
    </section>
  );
}

function DeveloperCard({dev, tick: _tick}: {dev: Developer; tick: number}) {
  const stats = [
    {l: 'სესია', v: dev.sessions_total},
    {l: 'Prompt', v: dev.prompts},
    {l: 'Tool', v: dev.tools},
    {l: 'Error', v: dev.errors, err: dev.errors > 0}
  ];

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--bdr)] bg-[var(--sur-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{dev.name}</div>
          <div className="truncate font-mono text-[10px] text-[var(--text-3)]">
            {dev.email ?? (dev.host ?? '—')}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${STATUS_STYLE[dev.status]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full bg-current ${
              dev.status === 'online' ? 'animate-pulse' : ''
            }`}
          />
          {dev.status}
          {dev.last_seen && <span className="opacity-70">· {fmtAgo(dev.last_seen)}</span>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {stats.map((s) => (
          <div
            key={s.l}
            className="flex flex-col gap-0.5 rounded border border-[var(--bdr)] bg-[var(--sur)] px-2 py-1.5"
          >
            <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-3)]">
              {s.l}
            </div>
            <div
              className={`font-mono text-[14px] font-semibold ${s.err ? 'text-red-600' : ''}`}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-[var(--bdr)] pt-1.5 font-mono text-[10px] text-[var(--text-3)]">
        {dev.last_repo && <span>repo: {dev.last_repo}</span>}
        {dev.last_event && <span>last: {dev.last_event}</span>}
        {dev.host && (
          <span>
            {dev.host} · {dev.os}
          </span>
        )}
        {dev.claude_version && <span>claude: {dev.claude_version}</span>}
        <span>ᲓᲦᲔᲡ: {dev.minutes_today}m</span>
      </div>
    </div>
  );
}
