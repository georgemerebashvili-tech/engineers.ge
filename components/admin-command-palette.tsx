'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {Search, CornerDownLeft, type LucideIcon} from 'lucide-react';

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  section: string;
  href?: string;
  /** Returns cleanup fn when executed via handler instead of navigation. */
  action?: () => void | Promise<void>;
  icon?: LucideIcon;
  /** Extra search tokens beyond label/description/section. */
  keywords?: string[];
};

type Props = {
  items: CommandItem[];
};

/**
 * Simple character-subsequence fuzzy match. Returns a score if every character
 * of `query` appears in `text` in order (case-insensitive), higher = better
 * (penalizes gaps). Returns null when no match.
 */
function fuzzyScore(query: string, text: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 1000 - t.indexOf(q); // prefix > contains
  let score = 0;
  let ti = 0;
  let lastMatch = -1;
  for (let qi = 0; qi < q.length; qi++) {
    let found = -1;
    for (let j = ti; j < t.length; j++) {
      if (t[j] === q[qi]) {
        found = j;
        break;
      }
    }
    if (found === -1) return null;
    const gap = lastMatch === -1 ? found : found - lastMatch - 1;
    score += 10 - Math.min(gap, 9);
    lastMatch = found;
    ti = found + 1;
  }
  return score;
}

function matchItem(q: string, item: CommandItem): number | null {
  const fields = [
    item.label,
    item.description ?? '',
    item.section,
    ...(item.keywords ?? [])
  ];
  let best: number | null = null;
  for (const f of fields) {
    const s = fuzzyScore(q, f);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}

export function AdminCommandPalette({items}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Cmd/Ctrl+K to open; Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // Focus next tick so the portal-mounted input is in the DOM.
    queueMicrotask(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // No query: show everything grouped by section.
      return items.map((item) => ({item, score: 0}));
    }
    return items
      .map((item) => ({item, score: matchItem(q, item)}))
      .filter((r): r is {item: CommandItem; score: number} => r.score !== null)
      .sort((a, b) => b.score - a.score);
  }, [items, query]);

  // Reset cursor when results shift.
  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${cursor}"]`
    );
    el?.scrollIntoView({block: 'nearest'});
  }, [cursor]);

  async function execute(item: CommandItem) {
    setOpen(false);
    if (item.action) {
      await item.action();
      return;
    }
    if (item.href) router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const picked = results[cursor]?.item;
      if (picked) void execute(picked);
      return;
    }
  }

  if (!open || typeof window === 'undefined') return null;

  // Group preserved across input-bound ordering: when user hasn't typed, we
  // display items grouped by section; when searching, we flatten by score.
  const grouped = !query.trim();
  const sections = grouped
    ? results.reduce<Record<string, CommandItem[]>>((acc, r) => {
        const k = r.item.section;
        if (!acc[k]) acc[k] = [];
        acc[k].push(r.item);
        return acc;
      }, {})
    : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin command palette"
      className="fixed inset-0 z-[200] flex items-start justify-center bg-navy/50 backdrop-blur-sm p-4 pt-[10vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-card border border-bdr bg-sur shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-bdr px-3">
          <Search size={16} className="text-text-3" strokeWidth={2} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="ძიება admin-ში… (Cmd+K)"
            className="h-11 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-text-3"
          />
          <kbd className="rounded border border-bdr bg-sur-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-1"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-text-3">
              „{query}"-ის შედეგი არ მოიძებნა
            </p>
          ) : grouped && sections ? (
            (() => {
              let flatIdx = 0;
              return Object.entries(sections).map(([section, secItems]) => (
                <div key={section}>
                  <h3 className="sticky top-0 bg-sur px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-text-3">
                    {section}
                  </h3>
                  {secItems.map((item) => {
                    const idx = flatIdx++;
                    return (
                      <Row
                        key={item.id}
                        item={item}
                        active={idx === cursor}
                        idx={idx}
                        onHover={() => setCursor(idx)}
                        onPick={() => void execute(item)}
                      />
                    );
                  })}
                </div>
              ));
            })()
          ) : (
            results.map((r, idx) => (
              <Row
                key={r.item.id}
                item={r.item}
                active={idx === cursor}
                idx={idx}
                onHover={() => setCursor(idx)}
                onPick={() => void execute(r.item)}
              />
            ))
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-bdr bg-sur-2 px-3 py-1.5 font-mono text-[10px] text-text-3">
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-bdr bg-sur px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-bdr bg-sur px-1 py-0.5">↓</kbd>
              ნავიგაცია
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-bdr bg-sur px-1 py-0.5">
                <CornerDownLeft size={9} />
              </kbd>
              არჩევა
            </span>
          </span>
          <span>{results.length} შედეგი</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function Row({
  item,
  active,
  idx,
  onHover,
  onPick
}: {
  item: CommandItem;
  active: boolean;
  idx: number;
  onHover: () => void;
  onPick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      data-idx={idx}
      onMouseEnter={onHover}
      onClick={onPick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
        active ? 'bg-blue-lt text-navy' : 'text-text-2 hover:bg-sur-2'
      }`}
    >
      {Icon && (
        <span className="shrink-0">
          <Icon size={14} strokeWidth={1.8} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{item.label}</span>
        {item.description && (
          <span className="block truncate text-[11px] text-text-3">{item.description}</span>
        )}
      </span>
      {active && (
        <kbd className="shrink-0 rounded border border-bdr bg-sur px-1 py-0.5 font-mono text-[9px] text-text-3">
          ↵
        </kbd>
      )}
    </button>
  );
}
