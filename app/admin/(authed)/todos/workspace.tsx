'use client';

import {useMemo, useState} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flame,
  Search,
  X
} from 'lucide-react';
import type {TodoItem} from './page';

type Props = {
  pending: TodoItem[];
  done: TodoItem[];
  updated: string;
  blockers: number;
  important: number;
};

const PRIORITY_ORDER: Record<TodoItem['priority'], number> = {
  blocker: 0,
  important: 1,
  normal: 2,
  nice: 3
};

export function TodosWorkspace({pending, done, updated, blockers, important}: Props) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<TodoItem['priority'] | 'all'>(
    'all'
  );

  const list = tab === 'pending' ? pending : done;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list
      .filter((i) => priorityFilter === 'all' || i.priority === priorityFilter)
      .filter((i) =>
        needle
          ? i.text.toLowerCase().includes(needle) ||
            i.section.toLowerCase().includes(needle)
          : true
      )
      .sort((a, b) => {
        const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (p !== 0) return p;
        return (b.date ?? '').localeCompare(a.date ?? '');
      });
  }, [list, q, priorityFilter]);

  const sectioned = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.section) ?? [];
      arr.push(item);
      map.set(item.section, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="pending" value={pending.length} />
        <Kpi label="blockers 🔴" value={blockers} accent="red" />
        <Kpi label="important 🟡" value={important} accent="ora" />
        <Kpi label="done" value={done.length} accent="grn" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border bg-sur p-0.5">
          {(['pending', 'done'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                tab === k ? 'bg-blue text-white' : 'text-text-2 hover:text-navy'
              }`}
            >
              {k === 'pending' ? 'Pending' : 'Done'}
            </button>
          ))}
        </div>

        <div className="inline-flex gap-1">
          {(['all', 'blocker', 'important', 'normal', 'nice'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                priorityFilter === p
                  ? 'border-blue bg-blue-lt text-blue'
                  : 'border-bdr bg-sur text-text-3 hover:text-navy'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-[220px] max-w-md flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ძიება task-ის ან სექციის მიხედვით…"
            className="w-full rounded-full border bg-sur py-1.5 pl-7 pr-7 text-[12px] placeholder:text-text-3 focus:border-blue focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-text-3 hover:bg-sur-2"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border bg-sur p-6 text-center text-[12px] text-text-3">
          შედეგი არ მოიძებნა.
        </div>
      ) : (
        <div className="space-y-4">
          {sectioned.map(([section, items]) => (
            <section
              key={section}
              className="rounded-[var(--radius-card)] border bg-sur"
            >
              <header className="flex items-center gap-2 border-b px-4 py-2">
                <span className="text-[12.5px] font-semibold text-navy">{section}</span>
                <span className="font-mono text-[10px] text-text-3">
                  {items.length} {items.length === 1 ? 'task' : 'tasks'}
                </span>
              </header>
              <ul className="divide-y">
                {items.map((i, idx) => (
                  <li key={idx} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-0.5 shrink-0">
                      {i.done ? (
                        <CheckCircle2 size={14} className="text-grn" />
                      ) : i.priority === 'blocker' ? (
                        <Flame size={14} className="text-danger" />
                      ) : i.priority === 'important' ? (
                        <AlertTriangle size={14} className="text-ora" />
                      ) : (
                        <Circle size={14} className="text-text-3" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[12.5px] leading-relaxed ${
                          i.done ? 'text-text-3 line-through' : 'text-text'
                        }`}
                        dangerouslySetInnerHTML={{__html: renderInline(i.text)}}
                      />
                      {i.date && (
                        <p className="mt-0.5 font-mono text-[10px] text-text-3">
                          {i.date} · TODO.md L{i.line}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-[10px] text-text-3 font-mono">
        last modified: {updated ? new Date(updated).toLocaleString('ka-GE') : '—'}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: 'red' | 'ora' | 'grn';
}) {
  const color =
    accent === 'red'
      ? 'text-danger'
      : accent === 'ora'
      ? 'text-ora'
      : accent === 'grn'
      ? 'text-grn'
      : 'text-navy';
  return (
    <div className="rounded-[var(--radius-card)] border bg-sur p-3">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {label}
      </div>
      <div className={`mt-1 text-[22px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

// Minimal inline markdown: **bold**, `code`, [text](url)
function renderInline(input: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!
    );

  let out = esc(input);
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-sur-2 px-1 py-0.5 font-mono text-[11px] text-navy">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-navy">$1</strong>');
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return out;
}
