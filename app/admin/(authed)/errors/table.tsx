'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Flame,
  Monitor,
  Search,
  Undo2
} from 'lucide-react';
import type {ErrorEvent} from '@/lib/error-events';

type Digest = {digest: string | null; message: string; count: number; latest_at: string};

const KIND_COLOR: Record<string, string> = {
  route: 'bg-amber-100 border-amber-300 text-amber-900',
  global: 'bg-red-100 border-red-300 text-red-900',
  api: 'bg-blue-100 border-blue-300 text-blue-900'
};

export function ErrorsTable({
  initial,
  digests,
  currentFilter
}: {
  initial: ErrorEvent[];
  digests: Digest[];
  currentFilter: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (!q) return true;
      return (
        e.message.toLowerCase().includes(q) ||
        e.pathname.toLowerCase().includes(q) ||
        (e.stack ?? '').toLowerCase().includes(q) ||
        (e.digest ?? '').toLowerCase().includes(q)
      );
    });
  }, [entries, search]);

  async function toggleResolved(id: number, resolved: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({resolved})
      });
      if (!res.ok) throw new Error('error');
      setEntries((prev) => prev.map((e) => (e.id === id ? {...e, resolved} : e)));
      router.refresh();
    } catch (e) {
      alert(`ცდა ვერ მოხდა: ${e instanceof Error ? e.message : 'error'}`);
    } finally {
      setBusyId(null);
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Top digests (dedup summary) */}
      {digests.length > 0 && (
        <section className="rounded-card border border-bdr bg-sur overflow-hidden">
          <header className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-4 py-2">
            <Flame size={13} className="text-red-600" />
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
              ყველაზე ხშირი ღია შეცდომა · top {Math.min(5, digests.length)}
            </h2>
          </header>
          <ul className="divide-y divide-bdr">
            {digests.slice(0, 5).map((d, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2">
                <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold text-red-700">
                  ×{d.count}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-navy">{d.message}</p>
                  {d.digest && (
                    <p className="font-mono text-[9px] text-text-3">digest: {d.digest}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[9px] text-text-3">
                  {new Date(d.latest_at).toLocaleString('ka-GE', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="inline-flex rounded-md border border-bdr bg-sur p-0.5">
          {[
            {key: '0', label: 'ღია'},
            {key: '1', label: 'მოგვარდა'},
            {key: 'all', label: 'ყველა'}
          ].map((t) => (
            <Link
              key={t.key}
              href={`/admin/errors?resolved=${t.key}`}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-3 text-[11px] font-semibold transition-colors ${
                currentFilter === t.key
                  ? 'bg-navy text-white'
                  : 'text-text-2 hover:bg-sur-2'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="relative flex-1 md:max-w-xs md:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძიება message / stack / pathname…"
            className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
      </div>

      <p className="text-[11px] text-text-3">
        {filtered.length} / {entries.length} ჩანაწერი
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          ფილტრისთვის ჩანაწერი არ არის.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => {
            const isOpen = expanded.has(e.id);
            const kindColor = KIND_COLOR[e.kind] ?? KIND_COLOR.route;
            return (
              <li
                key={e.id}
                className={`rounded-card border bg-sur ${e.resolved ? 'border-emerald-200 opacity-60' : 'border-bdr'} ${busyId === e.id ? 'opacity-50' : ''}`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {e.resolved ? (
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`inline-flex h-5 items-center rounded-full border px-1.5 font-mono text-[9px] font-bold uppercase ${kindColor}`}>
                          {e.kind}
                        </span>
                        <Link
                          href={e.pathname}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-blue hover:underline"
                          target="_blank"
                        >
                          {e.pathname}
                          <ExternalLink size={10} />
                        </Link>
                        <span className="ml-auto font-mono text-[10px] text-text-3" title={e.created_at}>
                          {new Date(e.created_at).toLocaleString('ka-GE', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-navy break-words">{e.message}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-text-3">
                        {e.digest && <span>digest: {e.digest}</span>}
                        {e.viewport && (
                          <span className="inline-flex items-center gap-1">
                            <Monitor size={10} />
                            {e.viewport}
                          </span>
                        )}
                        {e.visitor_id && <span>vid: {e.visitor_id.slice(0, 8)}…</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(e.id)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 text-[10px] hover:bg-sur"
                      >
                        {isOpen ? (
                          <ChevronDown size={11} strokeWidth={2.2} />
                        ) : (
                          <ChevronRight size={11} strokeWidth={2.2} />
                        )}
                        stack
                      </button>
                      {e.resolved ? (
                        <button
                          type="button"
                          onClick={() => toggleResolved(e.id, false)}
                          disabled={busyId === e.id}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 text-[10px] text-text-2 hover:bg-sur disabled:opacity-50"
                        >
                          <Undo2 size={11} strokeWidth={2.2} />
                          reopen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleResolved(e.id, true)}
                          disabled={busyId === e.id}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} strokeWidth={2.2} />
                          მოგვარდა
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && e.stack && (
                    <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-bdr bg-bg p-3 font-mono text-[10px] text-text-2 whitespace-pre-wrap break-all">
                      {e.stack}
                    </pre>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
