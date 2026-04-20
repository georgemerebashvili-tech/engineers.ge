'use client';

import {useMemo, useState} from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  ShieldAlert,
  ToggleRight,
  User,
  Image as ImageIcon,
  Bug,
  Sparkles,
  Activity
} from 'lucide-react';
import type {AuditEntry} from '@/lib/admin-audit';

const ACTION_ICON: Record<string, React.ComponentType<{size?: number; strokeWidth?: number}>> = {
  feature: ToggleRight,
  user: User,
  tile: ImageIcon,
  bug: Bug,
  ai: Sparkles,
  admin: ShieldAlert
};

function prefixOf(action: string): string {
  return action.split('.')[0] ?? 'admin';
}

function iconFor(action: string) {
  return ACTION_ICON[prefixOf(action)] ?? Activity;
}

export function AuditTable({
  initial,
  availableActions
}: {
  initial: AuditEntry[];
  availableActions: string[];
}) {
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const actors = useMemo(
    () => Array.from(new Set(initial.map((e) => e.actor))).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initial.filter((e) => {
      if (actorFilter && e.actor !== actorFilter) return false;
      if (actionFilter && !e.action.startsWith(actionFilter)) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.target_id ?? '').toLowerCase().includes(q) ||
        JSON.stringify(e.metadata).toLowerCase().includes(q)
      );
    });
  }, [initial, search, actorFilter, actionFilter]);

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
      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძიება: action, actor, target, metadata…"
            className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        >
          <option value="">ყველა actor</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        >
          <option value="">ყველა action</option>
          {availableActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <p className="text-[11px] text-text-3">
        {filtered.length} / {initial.length} ჩანაწერი
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          ფილტრისთვის ჩანაწერი არ არის.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-bdr bg-sur">
          <table className="min-w-full text-[12px]">
            <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
              <tr>
                <th className="w-10 px-2 py-2"></th>
                <th className="px-3 py-2 text-left">როდის</th>
                <th className="px-3 py-2 text-left">actor</th>
                <th className="px-3 py-2 text-left">action</th>
                <th className="px-3 py-2 text-left">target</th>
                <th className="px-3 py-2 text-left">ip</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const Icon = iconFor(e.action);
                const isOpen = expanded.has(e.id);
                const hasMeta = e.metadata && Object.keys(e.metadata).length > 0;
                return (
                  <tr
                    key={e.id}
                    className={`border-t border-bdr ${isOpen ? 'bg-sur-2/50' : ''}`}
                  >
                    <td className="px-2 py-2">
                      {hasMeta && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(e.id)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-sur-2 text-text-3"
                          aria-label={isOpen ? 'კოლაპს' : 'გაშალე metadata'}
                        >
                          {isOpen ? (
                            <ChevronDown size={14} strokeWidth={2.2} />
                          ) : (
                            <ChevronRight size={14} strokeWidth={2.2} />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-2 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('ka-GE', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-navy">{e.actor}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2">
                        <Icon size={10} strokeWidth={2.2} />
                        {e.action}
                      </span>
                      {isOpen && hasMeta && (
                        <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-md border border-bdr bg-bg p-2 font-mono text-[10px] text-text-2">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-3">
                      {e.target_type && (
                        <div className="text-text-3">{e.target_type}</div>
                      )}
                      {e.target_id && (
                        <div className="truncate max-w-[20ch] text-text-2" title={e.target_id}>
                          {e.target_id}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                      {e.ip ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
