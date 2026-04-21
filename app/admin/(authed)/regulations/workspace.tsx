'use client';

import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  PauseCircle,
  RefreshCcw,
  ShieldAlert
} from 'lucide-react';
import {
  formatRelative,
  isSourceStale,
  type RegulationDashboardData,
  type RegulationSource
} from '@/lib/regulation-sources-shared';

export function RegulationsWorkspace({data}: {data: RegulationDashboardData}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groups = useMemo(() => {
    return data.sources.reduce<Record<string, RegulationSource[]>>((acc, source) => {
      const key = source.source_group || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(source);
      return acc;
    }, {});
  }, [data.sources]);

  async function runNow() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/regulations/run', {method: 'POST'});
      const json = (await res.json()) as
        | {ok: true; result: {checked: number; changed: number; failed: number; unchanged: number}}
        | {error?: string; message?: string; hint?: string};
      if (!res.ok || !('ok' in json)) {
        const err = json as {message?: string; hint?: string};
        setMessage(err.message ?? err.hint ?? 'შემოწმება ვერ გაეშვა');
        return;
      }
      setMessage(
        `შემოწმდა ${json.result.checked} წყარო · ცვლილება ${json.result.changed} · შეცდომა ${json.result.failed}`
      );
      router.refresh();
    } catch {
      setMessage('ქსელური შეცდომა მოხდა');
    } finally {
      setBusy(false);
    }
  }

  async function publishSnapshot(sourceId: number, snapshotId: number) {
    setPublishingId(snapshotId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/regulations/publish', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({source_id: sourceId, snapshot_id: snapshotId})
      });
      const json = (await res.json().catch(() => ({}))) as {ok?: true; error?: string; message?: string};
      if (!res.ok || !json.ok) {
        setMessage(json.message ?? 'publish ვერ შესრულდა');
        return;
      }
      setMessage('Snapshot დამტკიცდა და published reference განახლდა');
      router.refresh();
    } catch {
      setMessage('ქსელური შეცდომა მოხდა');
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-card border border-bdr bg-sur p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
            regulations watcher
          </div>
          <p className="mt-1 text-[20px] font-bold text-navy">
            {data.summary.total} წყარო · {data.summary.changedRecently} ცვლილება ბოლო 14 დღეში
          </p>
          <p className="mt-1 text-[11px] text-text-2">
            ყოველდღიური cron-ready monitor + ხელით `Run now`
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={busy || !data.databaseReady}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-blue px-4 text-[12px] font-semibold text-white transition-colors hover:bg-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={14} className={busy ? 'animate-spin' : ''} />
          {busy ? 'მიმდინარეობს…' : 'ახლავე შემოწმება'}
        </button>
      </div>

      {data.usingFallback && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <strong>Fallback რეჟიმი:</strong> DB env ან migration ჯერ მზად არ არის, ამიტომ ქვემოთ seed სია ჩანს.
          `Run now` ჩაირთვება მას შემდეგ, რაც `0027_regulation_sources.sql` გაეშვება.
        </div>
      )}

      {message && (
        <div className="rounded-md border border-bdr bg-sur px-3 py-2 text-[11px] text-text-2">
          {message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Active"
          value={String(data.summary.active)}
          hint="აკვირდება"
          icon={CheckCircle2}
          tone="green"
        />
        <SummaryCard
          label="Stale"
          value={String(data.summary.stale)}
          hint=">72 სთ update-ის გარეშე"
          icon={Clock3}
          tone="amber"
        />
        <SummaryCard
          label="Error"
          value={String(data.summary.error)}
          hint="fetch / parse failure"
          icon={ShieldAlert}
          tone="red"
        />
        <SummaryCard
          label="Paused"
          value={String(data.summary.paused)}
          hint="დროებით გაჩერებული"
          icon={PauseCircle}
          tone="neutral"
        />
      </section>

      {Object.entries(groups).map(([group, sources]) => (
        <section
          key={group}
          className="overflow-hidden rounded-card border border-bdr bg-sur"
        >
          <header className="border-b border-bdr bg-sur-2 px-4 py-2.5">
            <h2 className="text-[12px] font-semibold text-navy">{group}</h2>
          </header>
          <div className="divide-y divide-bdr">
            {sources.map((source) => {
              const snapshots = data.snapshotsBySource[source.id] ?? [];
              const latest = snapshots[0];
              const previous = snapshots.find((snapshot) => snapshot.id !== latest?.id && snapshot.id !== source.published_snapshot_id);
              const publishedSnapshot = snapshots.find(
                (snapshot) =>
                  snapshot.id === source.published_snapshot_id || snapshot.published
              );
              const stale = isSourceStale(source);
              const publishPending =
                !!latest &&
                (!source.published_hash || latest.content_hash !== source.published_hash);
              return (
                <article key={source.key} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-bold text-navy">{source.title}</h3>
                        <StatusBadge status={source.status} stale={stale} />
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue hover:underline"
                      >
                        {source.url}
                        <ExternalLink size={12} />
                      </a>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-text-3">
                        <span>ბოლო შემოწმება: {source.last_checked_at ? formatRelative(source.last_checked_at) : '—'}</span>
                        <span>ბოლო ცვლილება: {source.last_changed_at ? formatRelative(source.last_changed_at) : '—'}</span>
                        <span>published: {source.published_at ? formatRelative(source.published_at) : '—'}</span>
                        {source.selector && <span>selector: {source.selector}</span>}
                      </div>
                      {publishPending && (
                        <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          draft change waiting approval
                        </div>
                      )}
                      {(source.latest_excerpt || source.notes) && (
                        <p className="mt-2 text-[11px] text-text-2">
                          {source.latest_excerpt ?? source.notes}
                        </p>
                      )}
                      {source.last_error && (
                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-900">
                          <strong>ბოლო შეცდომა:</strong> {source.last_error}
                        </div>
                      )}
                    </div>

                    <div className="grid min-w-[280px] gap-2 md:grid-cols-3 lg:w-[540px]">
                      <SnapshotBox
                        label="ახალი snapshot"
                        snapshot={latest}
                        empty="ჯერ არაფერი დაფიქსირებულა"
                        action={
                          latest && publishPending && data.databaseReady ? (
                            <button
                              type="button"
                              onClick={() => publishSnapshot(source.id, latest.id)}
                              disabled={publishingId === latest.id}
                              className="mt-2 inline-flex h-8 items-center justify-center rounded-md bg-blue px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {publishingId === latest.id ? 'მიმდინარეობს…' : 'Approve + publish'}
                            </button>
                          ) : undefined
                        }
                      />
                      <SnapshotBox
                        label="published"
                        snapshot={
                          publishedSnapshot
                            ? {
                                excerpt: publishedSnapshot.excerpt,
                                fetched_at: source.published_at ?? publishedSnapshot.fetched_at,
                                published: true
                              }
                            : source.published_excerpt
                              ? {
                                  excerpt: source.published_excerpt,
                                  fetched_at: source.published_at ?? '',
                                  published: true
                                }
                              : undefined
                        }
                        empty="ჯერ არაფერი გამოქვეყნებულა"
                      />
                      <SnapshotBox
                        label="წინა snapshot"
                        snapshot={previous}
                        empty="diff-ისთვის მეორე snapshot-ს ველოდებით"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{size?: number; className?: string}>;
  tone: 'green' | 'amber' | 'red' | 'neutral';
}) {
  const toneClass: Record<typeof tone, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-sur-2 text-text-2 border-bdr'
  };

  return (
    <div className="rounded-card border border-bdr bg-sur p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-3">
            {label}
          </div>
          <div className="mt-2 text-[24px] font-bold text-navy">{value}</div>
          <div className="mt-1 text-[11px] text-text-2">{hint}</div>
        </div>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${toneClass[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  stale
}: {
  status: RegulationSource['status'];
  stale: boolean;
}) {
  if (status === 'error') {
    return <Badge className="border-red-200 bg-red-50 text-red-700">error</Badge>;
  }
  if (status === 'paused') {
    return <Badge className="border-bdr bg-sur-2 text-text-2">paused</Badge>;
  }
  if (stale) {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-800">stale</Badge>;
  }
  return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">active</Badge>;
}

function SnapshotBox({
  label,
  snapshot,
  empty,
  action
}: {
  label: string;
  snapshot?:
    | {excerpt: string | null; fetched_at: string; published?: boolean}
    | undefined;
  empty: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-bdr bg-sur-2 p-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-3">
        {label}
      </div>
      {snapshot ? (
        <>
          <div className="mt-1 text-[10px] text-text-3">
            {formatRelative(snapshot.fetched_at)}
          </div>
          {snapshot.published && (
            <div className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              published
            </div>
          )}
          <p className="mt-2 line-clamp-5 text-[11px] text-text-2">
            {snapshot.excerpt || 'excerpt არ არის'}
          </p>
          {action}
        </>
      ) : (
        <p className="mt-2 text-[11px] text-text-3">{empty}</p>
      )}
    </div>
  );
}

function Badge({
  className,
  children
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
