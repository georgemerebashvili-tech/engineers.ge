'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bug,
  ExternalLink,
  FileQuestion,
  Cookie,
  ScrollText,
  UserPlus,
  Search,
  type LucideIcon
} from 'lucide-react';
import type {ActivityEntry, ActivityKind} from '@/lib/activity-feed';

const KIND_META: Record<
  ActivityKind,
  {label: string; icon: LucideIcon; color: string}
> = {
  bug: {label: 'Bug', icon: Bug, color: 'text-amber-700 bg-amber-50 border-amber-200'},
  error: {label: 'Error', icon: AlertTriangle, color: 'text-red-700 bg-red-50 border-red-200'},
  'not-found': {label: '404', icon: FileQuestion, color: 'text-orange-700 bg-orange-50 border-orange-200'},
  consent: {label: 'Consent', icon: Cookie, color: 'text-blue-700 bg-blue-50 border-blue-200'},
  audit: {label: 'Audit', icon: ScrollText, color: 'text-text-2 bg-sur-2 border-bdr'},
  'user-registered': {label: 'New user', icon: UserPlus, color: 'text-emerald-700 bg-emerald-50 border-emerald-200'}
};

const SEVERITY_DOT: Record<ActivityEntry['severity'], string> = {
  info: 'bg-text-3',
  success: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500'
};

const FILTER_ORDER: ActivityKind[] = [
  'error',
  'bug',
  'not-found',
  'user-registered',
  'consent',
  'audit'
];

function relativeTime(iso: string): string {
  const ago = Date.now() - new Date(iso).getTime();
  const min = Math.round(ago / 60000);
  if (min < 1) return 'ახლახან';
  if (min < 60) return `${min} წთ წინ`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} სთ წინ`;
  return `${Math.round(hr / 24)} დღე წინ`;
}

export function ActivityList({
  initial,
  counts
}: {
  initial: ActivityEntry[];
  counts: Record<ActivityKind, number>;
}) {
  const [active, setActive] = useState<Set<ActivityKind>>(new Set(FILTER_ORDER));
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initial.filter((e) => {
      if (!active.has(e.kind)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.detail ?? '').toLowerCase().includes(q) ||
        (e.pathname ?? '').toLowerCase().includes(q) ||
        (e.actor ?? '').toLowerCase().includes(q)
      );
    });
  }, [initial, active, search]);

  function toggle(kind: ActivityKind) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_ORDER.map((k) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          const count = counts[k];
          const on = active.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                on ? meta.color : 'border-bdr bg-sur text-text-3 opacity-60 hover:opacity-100'
              }`}
            >
              <Icon size={11} strokeWidth={2.2} />
              {meta.label}
              <span className="rounded-full bg-black/10 px-1.5 font-mono text-[9px]">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება: title / detail / pathname / actor..."
          className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      <p className="text-[11px] text-text-3">
        {filtered.length} / {initial.length} event
      </p>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          {search || active.size < FILTER_ORDER.length
            ? 'ფილტრისთვის event არ მოიძებნა.'
            : 'არცერთი event ჯერ არ არის. Supabase migrations გაუშვი და ცოტა ხანში გამოჩნდება.'}
        </div>
      ) : (
        <ol className="space-y-1">
          {filtered.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            return (
              <li key={e.id}>
                <Link
                  href={e.link ?? '#'}
                  className="flex items-start gap-3 rounded-md border border-transparent bg-sur px-3 py-2 hover:border-bdr hover:bg-sur-2"
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[e.severity]}`}
                    aria-hidden
                  />
                  <span className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 font-mono text-[9px] font-bold uppercase ${meta.color}`}>
                    <Icon size={10} strokeWidth={2.4} />
                    {meta.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-navy">{e.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 font-mono text-[10px] text-text-3">
                      {e.pathname && <span className="truncate max-w-[30ch]">{e.pathname}</span>}
                      {e.actor && <span>by {e.actor}</span>}
                      {e.detail && <span className="truncate max-w-[30ch]">{e.detail}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-text-3 whitespace-nowrap" title={e.created_at}>
                    {relativeTime(e.created_at)}
                  </span>
                  <ExternalLink size={11} className="mt-1 shrink-0 text-text-3" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
