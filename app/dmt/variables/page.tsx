'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  Plus,
  Trash2,
  GripVertical,
  Palette,
  ChevronDown,
  ChevronRight,
  Link2,
  Lock,
  Copy,
  MoreHorizontal,
  Sparkles,
  ExternalLink,
  Type,
  Hash,
  Phone,
  Calendar,
  User,
  DollarSign,
  ListChecks,
  FileText,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import {
  COLOR_STYLES,
  COLORS,
  DEFAULT_SETS,
  DEFAULT_PAGES,
  STORE_KEY,
  PAGES_KEY,
  randomId,
  type ColumnKind,
  type ColumnScope,
  type PageColumn,
  type PageScope,
  type PageTable,
  type VarColor,
  type VarOption,
  type VarSet
} from '@/lib/dmt/variables';

const KIND_META: Record<
  ColumnKind,
  {label: string; Icon: React.ComponentType<{size?: number; className?: string}>}
> = {
  text: {label: 'ტექსტი', Icon: Type},
  textarea: {label: 'მრავალხაზიანი', Icon: FileText},
  number: {label: 'რიცხვი', Icon: Hash},
  currency: {label: 'ფასი ₾', Icon: DollarSign},
  phone: {label: 'ტელეფონი', Icon: Phone},
  date: {label: 'თარიღი', Icon: Calendar},
  user: {label: 'მომხმარებელი', Icon: User},
  select: {label: 'არჩევანი', Icon: ListChecks}
};

const KIND_ORDER: ColumnKind[] = [
  'text',
  'textarea',
  'number',
  'currency',
  'phone',
  'date',
  'user',
  'select'
];

export default function VariablesPage() {
  const [sets, setSets] = useState<VarSet[]>(DEFAULT_SETS);
  const [pages, setPages] = useState<PageScope[]>(DEFAULT_PAGES);
  const [hydrated, setHydrated] = useState(false);

  const [pageId, setPageId] = useState<string>(DEFAULT_PAGES[0]?.id ?? '');
  const [tableId, setTableId] = useState<string>(DEFAULT_PAGES[0]?.tables[0]?.id ?? '');
  const [expandedColId, setExpandedColId] = useState<string | null>(null);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [activeSetId, setActiveSetId] = useState<string>(DEFAULT_SETS[0]?.id ?? '');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Drag state for column reorder
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const pagePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as VarSet[];
        if (Array.isArray(p) && p.length) {
          setSets(p);
          setActiveSetId(p[0].id);
        }
      }
      const rawPages = localStorage.getItem(PAGES_KEY);
      if (rawPages) {
        const pp = JSON.parse(rawPages) as PageScope[];
        if (Array.isArray(pp) && pp.length) {
          setPages(pp);
          setPageId(pp[0].id);
          setTableId(pp[0].tables[0]?.id ?? '');
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(sets));
      localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
    } catch {}
  }, [sets, pages, hydrated]);

  useEffect(() => {
    if (!pagePickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (pagePickerRef.current && !pagePickerRef.current.contains(e.target as Node)) {
        setPagePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pagePickerOpen]);

  // ────────────────────────────────────────────────────────────
  // Page / table / column mutations
  // ────────────────────────────────────────────────────────────
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const table = page?.tables.find((t) => t.id === tableId) ?? page?.tables[0];

  const selectPage = (id: string) => {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    setPageId(id);
    setTableId(p.tables[0]?.id ?? '');
    setExpandedColId(null);
    setPagePickerOpen(false);
  };

  const selectTable = (id: string) => {
    setTableId(id);
    setExpandedColId(null);
  };

  const addTable = () => {
    if (!page) return;
    const id = randomId('tbl');
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: [...p.tables, {id, label: 'ახალი ცხრილი', columns: []}]
            }
      )
    );
    setTableId(id);
  };

  const patchTable = (pid: string, tid: string, patch: Partial<PageTable>) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id !== pid
          ? p
          : {...p, tables: p.tables.map((t) => (t.id !== tid ? t : {...t, ...patch}))}
      )
    );
  };

  const removeTable = (pid: string, tid: string) => {
    if (!confirm('ცხრილი წავშალო?')) return;
    setPages((prev) =>
      prev.map((p) => (p.id !== pid ? p : {...p, tables: p.tables.filter((t) => t.id !== tid)}))
    );
    if (tableId === tid) {
      const remainingTables = pages.find((p) => p.id === pid)?.tables.filter((t) => t.id !== tid);
      setTableId(remainingTables?.[0]?.id ?? '');
    }
  };

  const addColumn = () => {
    if (!page || !table) return;
    const id = randomId('col');
    const col: PageColumn = {id, label: 'ახალი სვეტი', kind: 'text'};
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: p.tables.map((t) =>
                t.id !== table.id ? t : {...t, columns: [...t.columns, col]}
              )
            }
      )
    );
    setExpandedColId(id);
  };

  const patchColumn = (colId: string, patch: Partial<PageColumn>) => {
    if (!page || !table) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: p.tables.map((t) =>
                t.id !== table.id
                  ? t
                  : {
                      ...t,
                      columns: t.columns.map((c) => (c.id !== colId ? c : {...c, ...patch}))
                    }
              )
            }
      )
    );
  };

  const removeColumn = (colId: string) => {
    if (!page || !table) return;
    if (!confirm('სვეტი წავშალო?')) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: p.tables.map((t) =>
                t.id !== table.id ? t : {...t, columns: t.columns.filter((c) => c.id !== colId)}
              )
            }
      )
    );
    if (expandedColId === colId) setExpandedColId(null);
  };

  const duplicateColumn = (colId: string) => {
    if (!page || !table) return;
    const src = table.columns.find((c) => c.id === colId);
    if (!src) return;
    const newId = randomId('col');
    const copy: PageColumn = {
      ...src,
      id: newId,
      label: src.label + ' (copy)',
      options: src.options ? src.options.map((o) => ({...o, id: randomId('opt')})) : undefined
    };
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: p.tables.map((t) => {
                if (t.id !== table.id) return t;
                const idx = t.columns.findIndex((c) => c.id === colId);
                const next = [...t.columns];
                next.splice(idx + 1, 0, copy);
                return {...t, columns: next};
              })
            }
      )
    );
    setExpandedColId(newId);
  };

  const reorderColumn = (fromId: string, toId: string) => {
    if (!page || !table || fromId === toId) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id !== page.id
          ? p
          : {
              ...p,
              tables: p.tables.map((t) => {
                if (t.id !== table.id) return t;
                const cols = [...t.columns];
                const fromIdx = cols.findIndex((c) => c.id === fromId);
                const toIdx = cols.findIndex((c) => c.id === toId);
                if (fromIdx === -1 || toIdx === -1) return t;
                const [moved] = cols.splice(fromIdx, 1);
                cols.splice(toIdx, 0, moved);
                return {...t, columns: cols};
              })
            }
      )
    );
  };

  // Convert fixed column → new VarSet (promote options to universal)
  const promoteToUniversal = (colId: string) => {
    if (!page || !table) return;
    const col = table.columns.find((c) => c.id === colId);
    if (!col || col.kind !== 'select' || col.scope !== 'fixed') return;
    const newSetId = randomId('set');
    const newSet: VarSet = {
      id: newSetId,
      name: `${page.label} · ${col.label}`,
      type: 'single',
      options: (col.options ?? []).map((o) => ({...o}))
    };
    setSets((prev) => [...prev, newSet]);
    patchColumn(colId, {scope: 'universal', varSetId: newSetId, options: undefined});
  };

  // ────────────────────────────────────────────────────────────
  // Universal VarSet mutations
  // ────────────────────────────────────────────────────────────
  const activeSet = sets.find((s) => s.id === activeSetId);

  const addSet = () => {
    const id = randomId('set');
    setSets((prev) => [...prev, {id, name: 'ახალი ცვლადი', type: 'single', options: []}]);
    setActiveSetId(id);
    setEditingSetId(id);
  };

  const removeSet = (id: string) => {
    const refsCount = pages.reduce(
      (n, p) =>
        n +
        p.tables.reduce(
          (m, t) =>
            m +
            t.columns.filter(
              (c) => c.kind === 'select' && c.scope === 'universal' && c.varSetId === id
            ).length,
          0
        ),
      0
    );
    const warn =
      refsCount > 0
        ? `ცვლადი ${refsCount} column-ში გამოიყენება. წავშალო?`
        : 'ცვლადი წავშალო?';
    if (!confirm(warn)) return;
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (activeSetId === id) {
      const rest = sets.filter((s) => s.id !== id);
      setActiveSetId(rest[0]?.id ?? '');
    }
  };

  const patchSet = (id: string, patch: Partial<VarSet>) => {
    setSets((prev) => prev.map((s) => (s.id === id ? {...s, ...patch} : s)));
  };

  const addSetOption = (setId: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id !== setId
          ? s
          : {
              ...s,
              options: [
                ...s.options,
                {id: randomId('opt'), label: 'ახალი ვარიანტი', color: 'gray'}
              ]
            }
      )
    );
  };

  const patchSetOption = (setId: string, optId: string, patch: Partial<VarOption>) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id !== setId
          ? s
          : {...s, options: s.options.map((o) => (o.id === optId ? {...o, ...patch} : o))}
      )
    );
  };

  const removeSetOption = (setId: string, optId: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id !== setId ? s : {...s, options: s.options.filter((o) => o.id !== optId)}
      )
    );
  };

  // Count references per VarSet (for sidebar badges)
  const setRefCounts = useMemo(() => {
    const out: Record<string, number> = {};
    pages.forEach((p) =>
      p.tables.forEach((t) =>
        t.columns.forEach((c) => {
          if (c.kind === 'select' && c.scope === 'universal' && c.varSetId) {
            out[c.varSetId] = (out[c.varSetId] ?? 0) + 1;
          }
        })
      )
    );
    return out;
  }, [pages]);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <DmtPageShell
      kicker="SCHEMA · PAGES · COLUMNS"
      title="ცვლადები"
      subtitle="სისტემის სქემა: გვერდი → ცხრილი → სვეტი. Select-სვეტი შეიძლება იყოს Universal (reusable VarSet) ან Fixed (inline)."
    >
      <div className="flex h-full min-h-0">
        {/* ══════════════ MAIN CANVAS ══════════════ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — page picker + quick actions */}
          <div className="flex shrink-0 items-center gap-3 border-b border-bdr bg-sur px-5 py-3">
            <div ref={pagePickerRef} className="relative">
              <button
                onClick={() => setPagePickerOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[13px] font-semibold text-navy hover:border-blue-bd hover:bg-blue-lt/40"
              >
                <span className="text-[14px]">{page?.icon ?? '📄'}</span>
                <span>{page?.label ?? '—'}</span>
                <ChevronDown size={14} className="text-text-3" />
              </button>
              {pagePickerOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-[320px] overflow-hidden rounded-[10px] border border-bdr bg-sur shadow-xl">
                  <div className="max-h-[420px] overflow-y-auto">
                    {pages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPage(p.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-sur-2 ${
                          p.id === pageId ? 'bg-blue-lt' : ''
                        }`}
                      >
                        <span className="text-[14px]">{p.icon ?? '📄'}</span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-[12.5px] font-semibold ${
                              p.id === pageId ? 'text-blue' : 'text-navy'
                            }`}
                          >
                            {p.label}
                          </div>
                          <div className="truncate font-mono text-[9.5px] text-text-3">
                            {p.route}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-sur-2 px-1.5 py-[1px] font-mono text-[9.5px] text-text-3">
                          {p.tables.reduce((n, t) => n + t.columns.length, 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Table tabs */}
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {page?.tables.map((t) => (
                <TableTab
                  key={t.id}
                  active={t.id === tableId}
                  table={t}
                  onSelect={() => selectTable(t.id)}
                  onRename={(label) => patchTable(page.id, t.id, {label})}
                  onRemove={() => removeTable(page.id, t.id)}
                />
              ))}
              <button
                onClick={addTable}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-bdr-2 px-2.5 py-1.5 text-[11px] font-semibold text-text-3 hover:border-blue hover:bg-blue-lt/30 hover:text-blue"
              >
                <Plus size={11} /> ცხრილი
              </button>
            </div>

            <Link
              href={page?.route ?? '/dmt'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[11.5px] font-semibold text-text-2 hover:border-blue-bd hover:text-blue"
              title="გახსენი რეალური გვერდი"
            >
              <ExternalLink size={12} /> გვერდი
            </Link>

            <button
              onClick={() => setLibraryOpen((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                libraryOpen
                  ? 'border-blue bg-blue text-white hover:bg-navy-2'
                  : 'border-bdr bg-sur-2 text-text-2 hover:border-blue-bd hover:text-blue'
              }`}
            >
              <Sparkles size={12} /> ბიბლიოთეკა
            </button>
          </div>

          {/* Column canvas */}
          <div className="flex-1 overflow-y-auto bg-sur-2/40 px-5 py-5">
            {!table ? (
              <div className="flex h-full items-center justify-center text-[12px] text-text-3">
                ცხრილი არ არის — დააჭირე "+ ცხრილი"
              </div>
            ) : (
              <div className="mx-auto max-w-[960px]">
                {/* Table description header */}
                <div className="mb-4 rounded-[10px] border border-bdr bg-sur p-4 shadow-sm">
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                    {page?.icon ?? '📄'} {page?.label} · {table.label}
                  </div>
                  <input
                    value={table.description ?? ''}
                    onChange={(e) =>
                      page && patchTable(page.id, table.id, {description: e.target.value})
                    }
                    placeholder="ცხრილის აღწერა (optional)…"
                    className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] text-text-2 hover:bg-sur-2 focus:border-blue focus:bg-sur focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-text-3">
                    <span>{table.columns.length} სვეტი</span>
                    <span>·</span>
                    <span>
                      {table.columns.filter((c) => c.scope === 'universal').length} universal
                    </span>
                    <span>·</span>
                    <span>{table.columns.filter((c) => c.scope === 'fixed').length} fixed</span>
                  </div>
                </div>

                {/* Column cards */}
                <div className="space-y-1.5">
                  {table.columns.length === 0 ? (
                    <div className="rounded-[10px] border-2 border-dashed border-bdr-2 bg-sur/60 px-6 py-12 text-center">
                      <div className="mb-2 text-[24px]">📐</div>
                      <div className="mb-1 text-[13px] font-semibold text-navy">
                        ცარიელი ცხრილი
                      </div>
                      <div className="mb-3 text-[11.5px] text-text-3">
                        სვეტების დასამატებლად დააჭირე ქვემოთ
                      </div>
                      <button
                        onClick={addColumn}
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
                      >
                        <Plus size={12} /> პირველი სვეტი
                      </button>
                    </div>
                  ) : (
                    table.columns.map((col) => (
                      <ColumnCard
                        key={col.id}
                        column={col}
                        varSets={sets}
                        expanded={expandedColId === col.id}
                        isDragging={dragColId === col.id}
                        isDragOver={dragOverColId === col.id && dragColId !== col.id}
                        onExpand={() =>
                          setExpandedColId(expandedColId === col.id ? null : col.id)
                        }
                        onPatch={(patch) => patchColumn(col.id, patch)}
                        onRemove={() => removeColumn(col.id)}
                        onDuplicate={() => duplicateColumn(col.id)}
                        onPromote={() => promoteToUniversal(col.id)}
                        onBrowseSet={(sid) => {
                          setLibraryOpen(true);
                          setActiveSetId(sid);
                        }}
                        onDragStart={() => setDragColId(col.id)}
                        onDragOver={() => setDragOverColId(col.id)}
                        onDragEnd={() => {
                          setDragColId(null);
                          setDragOverColId(null);
                        }}
                        onDrop={() => {
                          if (dragColId && dragColId !== col.id) {
                            reorderColumn(dragColId, col.id);
                          }
                          setDragColId(null);
                          setDragOverColId(null);
                        }}
                      />
                    ))
                  )}

                  {table.columns.length > 0 && (
                    <button
                      onClick={addColumn}
                      className="group flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-bdr-2 bg-sur/60 px-4 py-3 text-[12px] font-semibold text-text-3 transition-colors hover:border-blue hover:bg-blue-lt/40 hover:text-blue"
                    >
                      <Plus size={14} /> ახალი სვეტი
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════ UNIVERSAL LIBRARY PANEL ══════════════ */}
        {libraryOpen && (
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-bdr bg-sur">
            <div className="flex shrink-0 items-center gap-2 border-b border-bdr px-3 py-2.5">
              <Sparkles size={13} className="text-blue" />
              <span className="flex-1 text-[12px] font-semibold text-navy">
                უნივერსალური ცვლადები
              </span>
              <button
                onClick={addSet}
                className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-2 py-1 text-[10.5px] font-semibold text-white hover:bg-navy-2"
              >
                <Plus size={10} /> ახალი
              </button>
              <button
                onClick={() => setLibraryOpen(false)}
                className="rounded p-1 text-text-3 hover:bg-sur-2 hover:text-red"
                title="დახურვა"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[45%] overflow-y-auto border-b border-bdr">
              {sets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSetId(s.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    s.id === activeSetId ? 'bg-blue-lt' : 'hover:bg-sur-2'
                  }`}
                >
                  <div className="flex shrink-0 -space-x-1.5">
                    {s.options.slice(0, 4).map((o) => (
                      <span
                        key={o.id}
                        className="h-2.5 w-2.5 rounded-full border border-white"
                        style={{background: COLOR_STYLES[o.color].color}}
                      />
                    ))}
                    {s.options.length === 0 && (
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-sur-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[12px] font-semibold ${
                        s.id === activeSetId ? 'text-blue' : 'text-navy'
                      }`}
                    >
                      {s.name}
                    </div>
                    <div className="truncate font-mono text-[9.5px] text-text-3">
                      {s.options.length} opt · {setRefCounts[s.id] ?? 0} column
                    </div>
                  </div>
                </button>
              ))}
              {sets.length === 0 && (
                <div className="px-4 py-6 text-center text-[11px] text-text-3">
                  VarSet არ არის
                </div>
              )}
            </div>

            {/* Inline editor for selected universal set */}
            {activeSet && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center gap-2 border-b border-bdr bg-sur-2/50 px-3 py-2">
                  {editingSetId === activeSet.id ? (
                    <input
                      autoFocus
                      value={activeSet.name}
                      onChange={(e) => patchSet(activeSet.id, {name: e.target.value})}
                      onBlur={() => setEditingSetId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setEditingSetId(null);
                      }}
                      className="flex-1 rounded-md border border-blue bg-sur px-2 py-1 text-[12.5px] font-semibold text-navy focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSetId(activeSet.id)}
                      className="flex-1 truncate rounded px-2 py-1 text-left text-[12.5px] font-semibold text-navy hover:bg-sur-2"
                      title="სახელის რედაქტ."
                    >
                      {activeSet.name}
                    </button>
                  )}
                  <select
                    value={activeSet.type}
                    onChange={(e) =>
                      patchSet(activeSet.id, {type: e.target.value as 'single' | 'multi'})
                    }
                    className="rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] text-text-2 focus:border-blue focus:outline-none"
                  >
                    <option value="single">single</option>
                    <option value="multi">multi</option>
                  </select>
                  <button
                    onClick={() => removeSet(activeSet.id)}
                    className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                    title="წაშლა"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {activeSet.options.length === 0 ? (
                    <div className="px-2 py-4 text-center text-[11px] text-text-3">
                      ცარიელია. დააჭირე "+"
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeSet.options.map((o) => (
                        <MiniOptionRow
                          key={o.id}
                          opt={o}
                          onPatch={(patch) => patchSetOption(activeSet.id, o.id, patch)}
                          onRemove={() => removeSetOption(activeSet.id, o.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addSetOption(activeSet.id)}
                  className="flex shrink-0 items-center justify-center gap-1 border-t border-bdr bg-sur-2/60 py-2 text-[11px] font-semibold text-text-2 hover:bg-blue-lt hover:text-blue"
                >
                  <Plus size={11} /> ვარიანტი
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </DmtPageShell>
  );
}

// ════════════════════════════════════════════════════════════════
// TableTab
// ════════════════════════════════════════════════════════════════
function TableTab({
  active,
  table,
  onSelect,
  onRename,
  onRemove
}: {
  active: boolean;
  table: PageTable;
  onSelect: () => void;
  onRename: (v: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(table.label);

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
        active
          ? 'border-blue bg-blue-lt font-semibold text-blue'
          : 'border-transparent text-text-2 hover:bg-sur-2 hover:text-navy'
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            onRename(value.trim() || table.label);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRename(value.trim() || table.label);
              setEditing(false);
            } else if (e.key === 'Escape') {
              setValue(table.label);
              setEditing(false);
            }
          }}
          className="rounded border border-blue bg-sur px-1 py-0.5 text-[12px] text-navy focus:outline-none"
        />
      ) : (
        <>
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setValue(table.label);
              setEditing(true);
            }}
            title="ორმაგი click → სახელის რედაქტ."
          >
            {table.label}
          </span>
          <span className="font-mono text-[9.5px] text-text-3">{table.columns.length}</span>
          {active && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:bg-red-lt hover:text-red group-hover:opacity-100"
              title="წაშლა"
            >
              <X size={11} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ColumnCard — the main schema-editor unit
// ════════════════════════════════════════════════════════════════
function ColumnCard(props: {
  column: PageColumn;
  varSets: VarSet[];
  expanded: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onExpand: () => void;
  onPatch: (patch: Partial<PageColumn>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPromote: () => void;
  onBrowseSet: (id: string) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const {column, varSets, expanded, isDragging, isDragOver} = props;
  const KindIcon = KIND_META[column.kind].Icon;
  const linkedSet =
    column.kind === 'select' && column.scope === 'universal' && column.varSetId
      ? varSets.find((s) => s.id === column.varSetId) ?? null
      : null;
  const previewOptions =
    column.kind === 'select'
      ? column.scope === 'universal'
        ? linkedSet?.options ?? []
        : column.options ?? []
      : [];

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(column.label);

  return (
    <div
      draggable={!editingLabel}
      onDragStart={(e) => {
        if (editingLabel) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', column.id);
        props.onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        props.onDragOver();
      }}
      onDragEnd={props.onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        props.onDrop();
      }}
      className={`group rounded-[10px] border bg-sur shadow-sm transition-all ${
        isDragging ? 'opacity-40' : ''
      } ${
        isDragOver
          ? 'border-blue ring-2 ring-blue/20'
          : expanded
            ? 'border-blue-bd'
            : 'border-bdr hover:border-bdr-2'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="cursor-grab text-text-3 opacity-30 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
          <GripVertical size={14} />
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sur-2 text-text-2">
          <KindIcon size={13} />
        </span>

        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              props.onPatch({label: labelDraft.trim() || column.label});
              setEditingLabel(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                props.onPatch({label: labelDraft.trim() || column.label});
                setEditingLabel(false);
              } else if (e.key === 'Escape') {
                setLabelDraft(column.label);
                setEditingLabel(false);
              }
            }}
            className="flex-1 rounded-md border border-blue bg-sur px-2 py-1 text-[13px] font-semibold text-navy focus:outline-none"
          />
        ) : (
          <button
            onClick={props.onExpand}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setLabelDraft(column.label);
              setEditingLabel(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title="click → გახსნა · ორმაგი click → სახელის რედაქტ."
          >
            <span className="truncate text-[13px] font-semibold text-navy">{column.label}</span>
            <span className="shrink-0 rounded-full bg-sur-2 px-2 py-[1px] font-mono text-[9.5px] font-semibold text-text-3">
              {KIND_META[column.kind].label}
            </span>
            {column.required && (
              <span className="shrink-0 rounded-full bg-red-lt px-1.5 py-[1px] font-mono text-[9px] font-semibold text-red">
                required
              </span>
            )}
            {column.kind === 'select' &&
              (column.scope === 'universal' ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-1.5 py-[1px] font-mono text-[9.5px] font-semibold text-blue"
                  title="Universal — ბმული VarSet-ზე"
                >
                  <Link2 size={9} /> U
                </span>
              ) : (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] font-mono text-[9.5px] font-semibold text-text-3"
                  title="Fixed — ამ column-ში მხოლოდ"
                >
                  <Lock size={9} /> F
                </span>
              ))}
          </button>
        )}

        {/* Preview pills */}
        {column.kind === 'select' && previewOptions.length > 0 && (
          <div className="hidden min-w-0 items-center gap-1 sm:flex">
            {previewOptions.slice(0, 3).map((o) => {
              const st = COLOR_STYLES[o.color];
              return (
                <span
                  key={o.id}
                  className="max-w-[90px] truncate rounded-full border px-1.5 py-[1px] text-[10px] font-semibold"
                  style={{color: st.color, background: st.bg, borderColor: st.border}}
                >
                  {o.label}
                </span>
              );
            })}
            {previewOptions.length > 3 && (
              <span className="font-mono text-[9.5px] text-text-3">
                +{previewOptions.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={props.onDuplicate}
            className="rounded p-1.5 text-text-3 hover:bg-sur-2 hover:text-navy"
            title="დუბლირება"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={props.onRemove}
            className="rounded p-1.5 text-text-3 hover:bg-red-lt hover:text-red"
            title="წაშლა"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <button
          onClick={props.onExpand}
          className="shrink-0 rounded p-1 text-text-3 hover:bg-sur-2"
          aria-label={expanded ? 'კეცვა' : 'გაშლა'}
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-bdr bg-sur-2/40 px-3 py-3">
          {/* Kind + meta */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] text-text-2">
              <span className="font-mono text-[9.5px] uppercase text-text-3">ტიპი</span>
              <select
                value={column.kind}
                onChange={(e) => {
                  const kind = e.target.value as ColumnKind;
                  const patch: Partial<PageColumn> = {kind};
                  if (kind !== 'select') {
                    patch.scope = undefined;
                    patch.varSetId = undefined;
                    patch.options = undefined;
                  } else if (!column.scope) {
                    patch.scope = 'fixed';
                    patch.options = [];
                  }
                  props.onPatch(patch);
                }}
                className="rounded-md bg-transparent text-[12px] font-semibold text-navy focus:outline-none"
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KIND_META[k].label}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] text-text-2">
              <input
                type="checkbox"
                checked={!!column.required}
                onChange={(e) => props.onPatch({required: e.target.checked})}
              />
              required
            </label>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-2 py-1 font-mono text-[10px] text-text-3">
              ID: <code className="text-navy">{column.id}</code>
            </div>
          </div>

          {column.kind === 'select' && (
            <>
              {/* Source toggle */}
              <div className="mb-3 inline-flex rounded-md border border-bdr bg-sur p-0.5">
                <button
                  onClick={() =>
                    props.onPatch({
                      scope: 'universal',
                      varSetId: column.varSetId ?? varSets[0]?.id,
                      options: undefined
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                    column.scope === 'universal'
                      ? 'bg-blue text-white'
                      : 'text-text-2 hover:bg-sur-2 hover:text-navy'
                  }`}
                >
                  <Link2 size={11} /> Universal
                </button>
                <button
                  onClick={() =>
                    props.onPatch({
                      scope: 'fixed',
                      options: column.options ?? [],
                      varSetId: undefined
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                    column.scope === 'fixed'
                      ? 'bg-blue text-white'
                      : 'text-text-2 hover:bg-sur-2 hover:text-navy'
                  }`}
                >
                  <Lock size={11} /> Fixed
                </button>
              </div>

              {column.scope === 'universal' ? (
                <div className="rounded-md border border-bdr bg-sur">
                  <div className="flex items-center gap-2 border-b border-bdr px-3 py-2">
                    <Link2 size={12} className="text-blue" />
                    <select
                      value={column.varSetId ?? ''}
                      onChange={(e) => props.onPatch({varSetId: e.target.value})}
                      className="flex-1 rounded-md border border-bdr bg-sur px-2 py-1 text-[12px] text-navy focus:border-blue focus:outline-none"
                    >
                      <option value="">— აირჩიე VarSet —</option>
                      {varSets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.options.length})
                        </option>
                      ))}
                    </select>
                    {column.varSetId && (
                      <button
                        onClick={() => props.onBrowseSet(column.varSetId!)}
                        className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[10.5px] font-semibold text-text-2 hover:border-blue-bd hover:text-blue"
                        title="გახსენი ბიბლიოთეკაში"
                      >
                        <ExternalLink size={10} /> ბიბლ.
                      </button>
                    )}
                  </div>
                  {linkedSet && linkedSet.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3">
                      {linkedSet.options.map((o) => {
                        const st = COLOR_STYLES[o.color];
                        return (
                          <span
                            key={o.id}
                            className="rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{color: st.color, background: st.bg, borderColor: st.border}}
                          >
                            {o.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-bdr bg-sur">
                  <div className="flex items-center justify-between border-b border-bdr px-3 py-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                      Fixed ოპციები ({column.options?.length ?? 0})
                    </span>
                    <div className="flex items-center gap-2">
                      {(column.options?.length ?? 0) > 0 && (
                        <button
                          onClick={props.onPromote}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 py-1 text-[10.5px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white"
                          title="გადაიტანე ბიბლიოთეკაში → Universal-ად გახდება"
                        >
                          <Sparkles size={10} /> → Universal
                        </button>
                      )}
                      <button
                        onClick={() =>
                          props.onPatch({
                            options: [
                              ...(column.options ?? []),
                              {id: randomId('opt'), label: 'ახალი', color: 'gray'}
                            ]
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-2 py-1 text-[10.5px] font-semibold text-white hover:bg-navy-2"
                      >
                        <Plus size={10} /> ოფცია
                      </button>
                    </div>
                  </div>
                  {(column.options?.length ?? 0) === 0 ? (
                    <div className="px-4 py-6 text-center text-[11.5px] text-text-3">
                      ცარიელია — დააჭირე "+ ოფცია"
                    </div>
                  ) : (
                    <div className="p-2">
                      {column.options!.map((o) => (
                        <MiniOptionRow
                          key={o.id}
                          opt={o}
                          onPatch={(patch) =>
                            props.onPatch({
                              options: (column.options ?? []).map((x) =>
                                x.id === o.id ? {...x, ...patch} : x
                              )
                            })
                          }
                          onRemove={() =>
                            props.onPatch({
                              options: (column.options ?? []).filter((x) => x.id !== o.id)
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {column.kind !== 'select' && (
            <div className="rounded-md border border-dashed border-bdr bg-sur/60 px-3 py-2 text-[11.5px] text-text-3">
              ამ ტიპს არ აქვს dropdown-ის ვარიანტები · <b>{KIND_META[column.kind].label}</b> ველი.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MiniOptionRow — compact inline option editor
// ════════════════════════════════════════════════════════════════
function MiniOptionRow({
  opt,
  onPatch,
  onRemove
}: {
  opt: VarOption;
  onPatch: (patch: Partial<VarOption>) => void;
  onRemove: () => void;
}) {
  const st = COLOR_STYLES[opt.color];
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="group relative flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sur-2">
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110"
        style={{background: st.color, borderColor: st.border}}
        title="ფერი"
      />
      {pickerOpen && (
        <div
          className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1 rounded-md border border-bdr bg-sur p-1.5 shadow-lg"
          onMouseLeave={() => setPickerOpen(false)}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onPatch({color: c});
                setPickerOpen(false);
              }}
              className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${
                opt.color === c ? 'ring-2 ring-offset-1 ring-navy' : ''
              }`}
              style={{background: COLOR_STYLES[c].color, borderColor: COLOR_STYLES[c].border}}
              title={c}
            />
          ))}
        </div>
      )}
      <input
        value={opt.label}
        onChange={(e) => onPatch({label: e.target.value})}
        className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[12px] text-text hover:border-bdr focus:border-blue focus:bg-sur focus:outline-none"
        placeholder="ლეიბლი…"
      />
      <button
        onClick={onRemove}
        className="rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:bg-red-lt hover:text-red group-hover:opacity-100"
        title="წაშლა"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
