'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {
  Bug,
  CheckCircle2,
  Archive,
  Clock,
  Wrench,
  ExternalLink,
  Mail,
  Monitor,
  Search
} from 'lucide-react';
import type {BugReport, BugStatus} from '@/lib/bug-reports';

type Counts = Record<BugStatus, number>;

const STATUS_CONFIG: Record<
  BugStatus,
  {label: string; color: string; icon: React.ComponentType<{size?: number; strokeWidth?: number}>}
> = {
  open: {label: 'ახალი', color: 'bg-amber-100 border-amber-300 text-amber-900', icon: Clock},
  in_progress: {label: 'მიმდინარე', color: 'bg-blue-50 border-blue-200 text-blue-800', icon: Wrench},
  resolved: {label: 'გამოსწორდა', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: CheckCircle2},
  archived: {label: 'არქივი', color: 'bg-sur-2 border-bdr text-text-3', icon: Archive}
};

export function BugReportsTable({
  initial,
  counts
}: {
  initial: BugReport[];
  counts: Counts;
}) {
  const router = useRouter();
  const [reports, setReports] = useState(initial);
  const [filter, setFilter] = useState<BugStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.message.toLowerCase().includes(q) ||
        r.pathname.toLowerCase().includes(q) ||
        (r.feature_key ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [reports, filter, search]);

  async function updateStatus(id: string, status: BugStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bug-reports/${id}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({status})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'error');
      setReports((prev) => prev.map((r) => (r.id === id ? data.report : r)));
      router.refresh();
    } catch (e) {
      alert(`ცდა ვერ მოხდა: ${e instanceof Error ? e.message : 'error'}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="ახალი" value={counts.open} color="text-amber-700 bg-amber-50 border-amber-200" />
        <Kpi label="მიმდინარე" value={counts.in_progress} color="text-blue-700 bg-blue-50 border-blue-200" />
        <Kpi label="გამოსწორდა" value={counts.resolved} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        <Kpi label="არქივი" value={counts.archived} color="text-text-2 bg-sur-2 border-bdr" />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(['open', 'in_progress', 'resolved', 'archived', 'all'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
              filter === k
                ? 'bg-navy border-navy text-white'
                : 'border-bdr bg-sur text-text-2 hover:bg-sur-2'
            }`}
          >
            {k === 'all' ? 'ყველა' : STATUS_CONFIG[k].label}
            {k !== 'all' && (
              <span className="rounded-full bg-black/10 px-1.5 py-0 font-mono text-[9px]">
                {counts[k]}
              </span>
            )}
          </button>
        ))}
        <div className="relative ml-auto flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძიება…"
            className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          ამ ფილტრისთვის შეტყობინება არ არის.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              busy={busyId === r.id}
              onStatus={(s) => updateStatus(r.id, s)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportCard({
  report,
  busy,
  onStatus
}: {
  report: BugReport;
  busy: boolean;
  onStatus: (s: BugStatus) => void;
}) {
  const cfg = STATUS_CONFIG[report.status];
  const Icon = cfg.icon;
  const created = new Date(report.created_at);

  return (
    <li className={`rounded-card border border-bdr bg-sur transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
              <Icon size={10} strokeWidth={2.5} />
              {cfg.label}
            </span>
            <Link
              href={report.pathname}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-blue hover:underline"
              target="_blank"
            >
              {report.pathname}
              <ExternalLink size={10} />
            </Link>
            {report.feature_key && (
              <span className="rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[9px] text-text-3">
                {report.feature_key}
              </span>
            )}
            <span className="ml-auto text-[10px] text-text-3" title={created.toISOString()}>
              {created.toLocaleString('ka-GE', {
                dateStyle: 'short',
                timeStyle: 'short'
              })}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-[13px] text-navy leading-relaxed">
            {report.message}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-text-3">
            {report.email && (
              <span className="inline-flex items-center gap-1">
                <Mail size={10} />
                <a href={`mailto:${report.email}`} className="hover:text-blue">
                  {report.email}
                </a>
              </span>
            )}
            {report.viewport && (
              <span className="inline-flex items-center gap-1">
                <Monitor size={10} />
                {report.viewport}
              </span>
            )}
            {report.user_agent && (
              <span className="truncate max-w-[30ch]" title={report.user_agent}>
                {report.user_agent}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1">
          {(['open', 'in_progress', 'resolved', 'archived'] as const).map((s) => {
            const active = report.status === s;
            const label = STATUS_CONFIG[s].label;
            return (
              <button
                key={s}
                type="button"
                onClick={() => !active && onStatus(s)}
                disabled={active || busy}
                className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? `${STATUS_CONFIG[s].color} cursor-default`
                    : 'border-bdr bg-sur text-text-2 hover:bg-sur-2'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}

function Kpi({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <div className={`rounded-card border p-3 ${color}`}>
      <div className="flex items-center gap-1.5">
        <Bug size={12} strokeWidth={2.2} />
        <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="mt-0.5 text-[22px] font-bold">{value}</p>
    </div>
  );
}
