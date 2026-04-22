'use client';

import {useEffect, useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  Plus,
  Download,
  Trash2,
  History,
  Filter,
  X,
  User,
  Search,
  GripVertical,
  Eraser,
  UserRound,
  ArrowUpRight
} from 'lucide-react';
import {
  DEFAULT_COLUMN_ORDER,
  LEAD_COLUMNS,
  STAGE_META,
  STAGE_ORDER,
  SOURCE_ORDER,
  appendAudit,
  diffLead,
  emptyLead,
  fmtDate,
  getActor,
  loadAudit,
  loadColumnOrder,
  loadColumnWidths,
  loadFilters,
  loadLeads,
  saveColumnOrder,
  saveColumnWidths,
  saveFilters,
  saveLeads,
  setActor,
  type FilterState,
  type Lead,
  type LeadAuditEntry,
  type LeadColumn,
  type Source,
  type Stage
} from '@/lib/dmt/leads-store';

const MIN_W = 80;
const MAX_W = 640;

export default function LeadsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<Lead[]>([]);
  const [order, setOrder] = useState<(keyof Lead)[]>(DEFAULT_COLUMN_ORDER);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<FilterState>({});
  const [q, setQ] = useState('');
  const [actor, setActorState] = useState('მე');
  const [showHistory, setShowHistory] = useState(false);
  const [audit, setAudit] = useState<LeadAuditEntry[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [filterPopover, setFilterPopover] = useState<keyof Lead | null>(null);
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const scrollToLead = (id: string) => {
    const el = document.querySelector(`[data-lead-row="${id}"]`);
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1500);
  };

  useEffect(() => {
    setRows(loadLeads());
    setOrder(loadColumnOrder());
    setWidths(loadColumnWidths());
    setFilters(loadFilters());
    setActorState(getActor());
    setAudit(loadAudit());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLeads(rows);
  }, [rows, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveColumnOrder(order);
  }, [order, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveColumnWidths(widths);
  }, [widths, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveFilters(filters);
  }, [filters, hydrated]);

  // ─── Mutators ─────────────────────────────────────────────────────────────
  const addLead = () => {
    const lead = emptyLead(rows, actor);
    setRows((prev) => [lead, ...prev]);
    const entry = appendAudit({
      by: actor,
      action: 'create',
      leadId: lead.id,
      leadLabel: lead.id
    });
    setAudit((prev) => [entry, ...prev]);
    setShowHistory(true);
  };

  const updateField = <K extends keyof Lead>(id: string, key: K, value: Lead[K]) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const before = prev[idx];
      if (before[key] === value) return prev;
      const after: Lead = {
        ...before,
        [key]: value,
        updatedAt: new Date().toISOString(),
        updatedBy: actor
      };
      const copy = prev.slice();
      copy[idx] = after;
      const col = LEAD_COLUMNS[key as string];
      const entry = appendAudit({
        by: actor,
        action: 'update',
        leadId: after.id,
        leadLabel: after.name || after.company || after.id,
        column: key as string,
        columnLabel: col?.label ?? (key as string),
        before: formatValue(before[key]),
        after: formatValue(after[key])
      });
      setAudit((prevA) => [entry, ...prevA]);
      return copy;
    });
  };

  const deleteLead = (id: string) => {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    if (!confirm(`წავშალო ლიდი ${target.id}?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    const entry = appendAudit({
      by: actor,
      action: 'delete',
      leadId: target.id,
      leadLabel: target.name || target.company || target.id
    });
    setAudit((prev) => [entry, ...prev]);
  };

  const clearAll = () => {
    if (rows.length === 0) return;
    if (!confirm(`გავასუფთავო ${rows.length} ჩანაწერი? audit log დარჩება.`)) return;
    for (const r of rows) {
      appendAudit({
        by: actor,
        action: 'delete',
        leadId: r.id,
        leadLabel: r.name || r.company || r.id,
        column: 'bulk',
        columnLabel: 'მასობრივი წაშლა'
      });
    }
    setRows([]);
    setAudit(loadAudit());
  };

  const changeActor = () => {
    const next = prompt('რა სახელი ჩაიწეროს audit log-ში?', actor);
    if (!next) return;
    setActorState(next.trim());
    setActor(next.trim());
  };

  // ─── Column drag/drop reorder ────────────────────────────────────────────
  const onDragStart = (key: string) => () => setDragKey(key);
  const onDragOver = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragKey && dragKey !== key) setDragOverKey(key);
  };
  const onDrop = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragKey || dragKey === key) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    setOrder((prev) => {
      const from = prev.indexOf(dragKey as keyof Lead);
      const to = prev.indexOf(key as keyof Lead);
      if (from === -1 || to === -1) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setDragKey(null);
    setDragOverKey(null);
  };

  // ─── Column resize ───────────────────────────────────────────────────────
  const widthOf = (c: LeadColumn) => widths[c.key as string] ?? c.width;
  const startResize = (key: string, startWidth: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingKey(key);
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, startWidth + (ev.clientX - startX)));
      setWidths((prev) => ({...prev, [key]: w}));
    };
    const onUp = () => {
      setResizingKey(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ─── Filter ──────────────────────────────────────────────────────────────
  const setFilter = (key: keyof Lead, value: string) => {
    setFilters((prev) => {
      const next = {...prev};
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  };
  const clearFilters = () => setFilters({});

  const activeFilterCount = Object.keys(filters).length;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (t) {
        const hit =
          r.name.toLowerCase().includes(t) ||
          r.company.toLowerCase().includes(t) ||
          r.email.toLowerCase().includes(t) ||
          r.phone.toLowerCase().includes(t) ||
          r.id.toLowerCase().includes(t) ||
          r.owner.toLowerCase().includes(t);
        if (!hit) return false;
      }
      for (const [key, needle] of Object.entries(filters)) {
        if (!needle) continue;
        const val = String((r as unknown as Record<string, unknown>)[key] ?? '').toLowerCase();
        if (!val.includes(needle.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, filters]);

  // ─── Export CSV ──────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (filtered.length === 0) {
      alert('ცარიელი ცხრილი — გაექსპორტებელი არაფერია.');
      return;
    }
    const cols = order.map((k) => LEAD_COLUMNS[k as string]).filter(Boolean);
    const headers = cols.map((c) => c.label);
    const body = filtered.map((r) =>
      cols
        .map((c) => formatValue(r[c.key]))
        .map((s) => `"${String(s).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...body].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const won = filtered.filter((l) => l.stage === 'won').length;
  const active = filtered.filter((l) => !['won', 'lost'].includes(l.stage)).length;

  const orderedCols = order
    .map((k) => LEAD_COLUMNS[k as string])
    .filter(Boolean);

  const gridTemplate = `${orderedCols.map((c) => widthOf(c) + 'px').join(' ')} 40px`;
  const tableMinWidth = orderedCols.reduce((s, c) => s + widthOf(c), 0) + 40;

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ლიდები"
      subtitle="გაყიდვების pipeline — ცხოვრელი grid, ცვლილებები ავტომატურად ინახება"
      searchPlaceholder="ძიება სახელი / კომპანია / email / ID…"
      onQueryChange={setQ}
      filterSlot={
        <div className="flex items-center gap-2">
          <button
            onClick={changeActor}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
            title="audit log-ში ჩაიწერება ეს სახელი"
          >
            <UserRound size={14} /> {actor}
          </button>
          {activeFilterCount > 0 ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue-lt px-3 py-1.5 text-[12px] font-semibold text-blue hover:border-blue"
            >
              <Filter size={14} /> ფილტრი {activeFilterCount} ×
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-3">
              <Filter size={14} /> სვეტებიდან
            </span>
          )}
        </div>
      }
      actions={
        <>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold ${
              showHistory
                ? 'border-blue bg-blue-lt text-blue'
                : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue'
            }`}
            title="ცვლილებათა ლოგი"
          >
            <History size={14} /> ისტორია · {audit.length}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={addLead}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი
          </button>
        </>
      }
    >
      <div className="flex h-full gap-4 px-6 py-5 md:px-8">
        <div className="min-w-0 flex-1">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="ნაჩვენები" value={String(filtered.length)} />
            <StatCard label="აქტიური" value={String(active)} accent="blue" />
            <StatCard label="მოგებული" value={String(won)} accent="grn" />
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-bdr bg-sur">
            <div style={{minWidth: tableMinWidth}}>
              {/* Header */}
              <div
                className="grid border-b border-bdr bg-sur-2 text-left"
                style={{gridTemplateColumns: gridTemplate}}
              >
                {orderedCols.map((c) => (
                  <HeaderCell
                    key={c.key as string}
                    col={c}
                    width={widthOf(c)}
                    resizing={resizingKey === c.key}
                    dragging={dragKey === c.key}
                    dragOver={dragOverKey === c.key}
                    filterValue={filters[c.key as keyof Lead] ?? ''}
                    popoverOpen={filterPopover === c.key}
                    onTogglePopover={() =>
                      setFilterPopover((p) => (p === c.key ? null : (c.key as keyof Lead)))
                    }
                    onClosePopover={() => setFilterPopover(null)}
                    onSetFilter={(v) => setFilter(c.key as keyof Lead, v)}
                    onDragStart={onDragStart(c.key as string)}
                    onDragOver={onDragOver(c.key as string)}
                    onDrop={onDrop(c.key as string)}
                    onDragEnd={() => {
                      setDragKey(null);
                      setDragOverKey(null);
                    }}
                    onStartResize={startResize(c.key as string, widthOf(c))}
                  />
                ))}
                <div />
              </div>

              {/* Body */}
              {filtered.length === 0 ? (
                <EmptyState hasData={rows.length > 0} onAdd={addLead} />
              ) : (
                filtered.map((r) => (
                  <div
                    key={r.id}
                    data-lead-row={r.id}
                    className={`group grid border-b border-bdr/70 last:border-b-0 text-[12px] transition-colors hover:bg-sur-2 ${highlightedId === r.id ? 'bg-blue-lt/70' : ''}`}
                    style={{gridTemplateColumns: gridTemplate}}
                  >
                    {orderedCols.map((c) =>
                      renderCell(c, r, (k, v) => updateField(r.id, k, v as never))
                    )}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => deleteLead(r.id)}
                        className="rounded p-1 text-text-3 opacity-0 transition-opacity hover:bg-red-lt hover:text-red group-hover:opacity-100"
                        title="წაშლა"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11.5px] text-text-3">
              💡 Header-ზე drag — სვეტის გადალაგება · ფუნელი — ფილტრი · მარჯვენა კიდეზე drag — ზომა.
              ცვლილებები ავტომატურად ინახება browser-ში.
            </div>
            {rows.length > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur px-2.5 py-1 text-[11px] font-semibold text-text-3 hover:border-red hover:text-red"
                title="ყველა ჩანაწერი წავშალო (audit log რჩება)"
              >
                <Eraser size={12} /> ცხრილის გასუფთავება
              </button>
            )}
          </div>
        </div>

        {showHistory && (
          <HistoryPanel
            entries={audit}
            onClose={() => setShowHistory(false)}
            onScrollToLead={scrollToLead}
          />
        )}
      </div>
    </DmtPageShell>
  );
}

// ─── Cell renderers ─────────────────────────────────────────────────────────
function renderCell(
  c: LeadColumn,
  r: Lead,
  onChange: (key: keyof Lead, value: unknown) => void
) {
  const align = c.align === 'right' ? 'text-right' : '';
  const v = r[c.key];

  if (c.kind === 'id') {
    return (
      <div key={c.key as string} className="px-3 py-2 font-mono text-[11px] font-semibold text-navy">
        {String(v)}
      </div>
    );
  }

  if (c.kind === 'stage') {
    const st = STAGE_META[r.stage];
    return (
      <div key={c.key as string} className="px-2 py-1.5">
        <select
          value={r.stage}
          onChange={(e) => onChange('stage', e.target.value as Stage)}
          className="w-full cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
          style={{color: st.color, background: st.bg, borderColor: st.border}}
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_META[s].label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (c.kind === 'source') {
    return (
      <div key={c.key as string} className="px-2 py-1.5">
        <select
          value={r.source}
          onChange={(e) => onChange('source', e.target.value as Source)}
          className="w-full cursor-pointer appearance-none rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2 hover:border-bdr-2 focus:outline-none"
        >
          {SOURCE_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (c.kind === 'author') {
    const name = String(v ?? '');
    const initial = name.trim()[0] || '—';
    return (
      <div key={c.key as string} className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-text-2">
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy text-[9px] font-bold uppercase text-white">
          {initial}
        </span>
        <span className="truncate">{name || '—'}</span>
      </div>
    );
  }

  if (c.kind === 'date') {
    return (
      <div key={c.key as string} className="px-3 py-2 font-mono text-[10.5px] text-text-3">
        {fmtDate(String(v ?? ''))}
      </div>
    );
  }

  if (c.kind === 'number') {
    return (
      <EditableNumberCell
        key={c.key as string}
        col={c}
        value={typeof v === 'number' ? v : 0}
        onChange={onChange}
      />
    );
  }

  return (
    <EditableTextCell
      key={c.key as string}
      col={c}
      value={String(v ?? '')}
      onChange={onChange}
    />
  );
}

// ─── Header cell ─────────────────────────────────────────────────────────────
type HeaderProps = {
  col: LeadColumn;
  width: number;
  resizing: boolean;
  dragging: boolean;
  dragOver: boolean;
  filterValue: string;
  popoverOpen: boolean;
  onTogglePopover: () => void;
  onClosePopover: () => void;
  onSetFilter: (v: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onStartResize: (e: React.MouseEvent) => void;
};

function HeaderCell(p: HeaderProps) {
  const {col} = p;
  const align = col.align === 'right' ? 'justify-end text-right' : '';
  return (
    <div
      draggable
      onDragStart={p.onDragStart}
      onDragOver={p.onDragOver}
      onDrop={p.onDrop}
      onDragEnd={p.onDragEnd}
      className={`group relative flex items-center gap-1 px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 transition-colors ${align} ${
        p.resizing ? 'bg-blue-lt/50' : ''
      } ${p.dragging ? 'opacity-40' : ''} ${p.dragOver ? 'bg-blue-lt/70' : ''}`}
    >
      <GripVertical
        size={10}
        strokeWidth={2}
        className="cursor-grab text-text-3 opacity-0 group-hover:opacity-100"
      />
      <span className="flex-1 truncate">{col.label}</span>
      <button
        onClick={p.onTogglePopover}
        className={`shrink-0 rounded p-0.5 transition-opacity ${
          p.filterValue
            ? 'text-blue opacity-100'
            : 'text-text-3 opacity-0 group-hover:opacity-100'
        } hover:bg-blue-lt`}
        title="სვეტის ფილტრი"
      >
        <Filter size={11} />
      </button>
      {p.popoverOpen && (
        <FilterPopover
          col={col}
          value={p.filterValue}
          onChange={p.onSetFilter}
          onClose={p.onClosePopover}
        />
      )}
      <span
        role="separator"
        aria-orientation="vertical"
        onMouseDown={p.onStartResize}
        className="absolute right-0 top-0 z-10 h-full w-[6px] cursor-col-resize select-none"
        title="Drag — სვეტის ზომა"
      >
        <span
          className={`ml-auto block h-full w-[2px] transition-colors ${
            p.resizing ? 'bg-blue' : 'bg-transparent hover:bg-blue-bd'
          }`}
        />
      </span>
    </div>
  );
}

// ─── Filter popover ──────────────────────────────────────────────────────────
function FilterPopover({
  col,
  value,
  onChange,
  onClose
}: {
  col: LeadColumn;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-filter-popover]')) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div
      data-filter-popover
      className="absolute right-0 top-full z-30 mt-1 w-60 rounded-md border border-bdr bg-sur p-3 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
          {col.label} — ფილტრი
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-text-3 hover:bg-sur-2"
        >
          <X size={12} />
        </button>
      </div>
      {col.kind === 'stage' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
        >
          <option value="">ყველა</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_META[s].label}
            </option>
          ))}
        </select>
      ) : col.kind === 'source' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
        >
          <option value="">ყველა</option>
          {SOURCE_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-3"
          />
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="შეიცავს…"
            className="w-full rounded-md border border-bdr bg-sur-2 py-1 pl-7 pr-2 text-[12px] focus:border-blue focus:outline-none"
          />
        </div>
      )}
      <div className="mt-2 flex items-center justify-end">
        <button
          onClick={() => {
            onChange('');
            onClose();
          }}
          disabled={!value}
          className="rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3 hover:bg-sur-2 disabled:opacity-30"
        >
          გასუფთავება
        </button>
      </div>
    </div>
  );
}

// ─── History (audit) panel ──────────────────────────────────────────────────
function HistoryPanel({
  entries,
  onClose,
  onScrollToLead
}: {
  entries: LeadAuditEntry[];
  onClose: () => void;
  onScrollToLead: (id: string) => void;
}) {
  const [filterCol, setFilterCol] = useState('');
  const [filterAct, setFilterAct] = useState('');

  const filtered = entries.filter((e) => {
    if (filterCol && e.column !== filterCol) return false;
    if (filterAct && e.action !== filterAct) return false;
    return true;
  });

  const columnOptions = Array.from(
    new Set(entries.map((e) => e.column).filter(Boolean) as string[])
  );

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-bdr bg-sur">
      <div className="flex items-center justify-between border-b border-bdr bg-sur-2 px-3 py-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-2">
          <History size={12} /> ისტორია · {entries.length}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-3 hover:bg-sur"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-bdr bg-sur px-3 py-2">
        <select
          value={filterAct}
          onChange={(e) => setFilterAct(e.target.value)}
          className="flex-1 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px] focus:border-blue focus:outline-none"
        >
          <option value="">ყველა ქმედება</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
        </select>
        <select
          value={filterCol}
          onChange={(e) => setFilterCol(e.target.value)}
          className="flex-1 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[11px] focus:border-blue focus:outline-none"
        >
          <option value="">ყველა სვეტი</option>
          {columnOptions.map((col) => (
            <option key={col} value={col}>
              {LEAD_COLUMNS[col]?.label ?? col}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11.5px] text-text-3">
            ლოგი ცარიელია
          </div>
        ) : (
          filtered.map((e) => <AuditRow key={e.id} entry={e} onScrollToLead={onScrollToLead} />)
        )}
      </div>
    </aside>
  );
}

function AuditRow({entry, onScrollToLead}: {entry: LeadAuditEntry; onScrollToLead: (id: string) => void}) {
  const actionStyle =
    entry.action === 'create'
      ? {bg: 'var(--grn-lt)', color: 'var(--grn)', border: 'var(--grn-bd)'}
      : entry.action === 'delete'
      ? {bg: 'var(--red-lt)', color: 'var(--red)', border: '#f0b8b4'}
      : {bg: 'var(--blue-lt)', color: 'var(--blue)', border: 'var(--blue-bd)'};
  return (
    <div className="border-b border-bdr/70 px-3 py-2.5 text-[11.5px] last:border-b-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em]"
          style={{
            background: actionStyle.bg,
            color: actionStyle.color,
            borderColor: actionStyle.border
          }}
        >
          {entry.action}
        </span>
        <span className="font-mono text-[10px] text-text-3">{fmtDate(entry.at)}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-text-2">
        <User size={10} className="text-text-3" />
        <span className="font-semibold">{entry.by}</span>
        <span className="text-text-3">·</span>
        <button
          onClick={() => onScrollToLead(entry.leadId)}
          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10.5px] text-navy hover:bg-blue-lt hover:text-blue"
          title="ლიდზე გადასვლა"
        >
          {entry.leadId}
          <ArrowUpRight size={10} className="shrink-0" />
        </button>
        {entry.leadLabel !== entry.leadId && (
          <span className="truncate text-text-3">· {entry.leadLabel}</span>
        )}
      </div>
      {entry.columnLabel && (
        <div className="mt-1 text-[11px] text-text-2">
          <span className="font-mono text-[10px] uppercase text-text-3">{entry.columnLabel}:</span>{' '}
          <span className="font-mono text-text-3 line-through">{entry.before || '—'}</span>
          {' → '}
          <span className="font-semibold text-text">{entry.after || '—'}</span>
        </div>
      )}
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return String(v);
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: 'blue' | 'grn';
}) {
  const color =
    accent === 'blue' ? 'var(--blue)' : accent === 'grn' ? 'var(--grn)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}

// ─── Blur-commit cell components ─────────────────────────────────────────────
// Audit fires only when user leaves the field (blur) or presses Enter,
// not on every keystroke.

function EditableTextCell({col, value, onChange}: {
  col: LeadColumn;
  value: string;
  onChange: (key: keyof Lead, value: unknown) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const commit = (cur: string) => {
    if (cur !== value) onChange(col.key, cur);
  };

  return (
    <input
      type={col.kind === 'email' ? 'email' : col.kind === 'phone' ? 'tel' : 'text'}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = (e.target as HTMLInputElement).value;
          commit(v);
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          setLocal(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full border-0 bg-transparent px-3 py-2 text-[12px] text-text focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue"
      placeholder="—"
    />
  );
}

function EditableNumberCell({col, value, onChange}: {
  col: LeadColumn;
  value: number;
  onChange: (key: keyof Lead, value: unknown) => void;
}) {
  const [local, setLocal] = useState(value === 0 ? '' : String(value));
  useEffect(() => { setLocal(value === 0 ? '' : String(value)); }, [value]);

  const commit = (raw: string) => {
    const n = raw === '' ? 0 : Number(raw);
    if (!Number.isNaN(n) && n !== value) onChange(col.key, n);
  };

  return (
    <input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = (e.target as HTMLInputElement).value;
          commit(v);
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          setLocal(value === 0 ? '' : String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full border-0 bg-transparent px-3 py-2 font-mono text-[11.5px] text-navy text-right focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue"
      placeholder="0"
    />
  );
}

function EmptyState({hasData, onAdd}: {hasData: boolean; onAdd: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-text-3">
        {hasData ? 'ფილტრს ემთხვევა 0 ჩანაწერი' : 'ლიდები ცარიელია'}
      </div>
      <div className="text-[12px] text-text-3">
        {hasData
          ? 'გაასუფთავე ფილტრები ან ცვალე ძიება.'
          : 'დაიწყე ახალი ლიდის დამატებით — ყველა მოქმედება აისახება ისტორიის პანელში.'}
      </div>
      {!hasData && (
        <button
          onClick={onAdd}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={14} /> ახალი ლიდი
        </button>
      )}
    </div>
  );
}
