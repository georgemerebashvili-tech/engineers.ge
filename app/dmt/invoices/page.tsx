'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {Calendar, ChevronDown, ChevronUp, Filter, FileText, GripVertical, Plus, RotateCcw, Trash2, X} from 'lucide-react';
import {OfferEditor, type OfferLeadRef} from '@/components/dmt/offer-editor';
import {deleteOffer, type DmtOffer, type OfferStatus} from '@/lib/dmt/offers-store';
import {DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent} from '@dnd-kit/core';
import {SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

type ManualLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
};

const STATUS_META: Record<OfferStatus, {label: string; color: string; bg: string; border: string}> = {
  draft:     {label: 'მოლოდინში',  color: 'var(--text-2)', bg: 'var(--sur-2)',    border: 'var(--bdr)'},
  sent:      {label: 'გაგზავნილი', color: 'var(--blue)',   bg: 'var(--blue-lt)',  border: 'var(--blue-bd)'},
  approved:  {label: 'დადასტ.',     color: 'var(--grn)',    bg: 'var(--grn-lt)',   border: 'var(--grn-bd)'},
  rejected:  {label: 'უარყოფ.',     color: 'var(--red)',    bg: 'var(--red-lt)',   border: '#f0b8b4'},
  cancelled: {label: 'გაუქმ.',     color: 'var(--text-3)', bg: 'var(--sur-2)',    border: 'var(--bdr)'},
};

const FILTER_STORAGE_KEY = 'dmt:invoices:filter';
const COLUMNS_STORAGE_KEY = 'dmt:invoices:columns';
const STATUS_ORDER = Object.keys(STATUS_META) as OfferStatus[];

type ColumnId = 'id' | 'client' | 'lead' | 'total' | 'status' | 'pdf' | 'date' | 'action';
type ColumnDef = {
  id: ColumnId;
  label: string;
  align?: 'left' | 'right';
  thClass?: string;
  tdClass?: string;
};

const COLUMN_DEFS: ColumnDef[] = [
  {id: 'id',     label: 'ID',         align: 'left'},
  {id: 'client', label: 'კლიენტი',    align: 'left'},
  {id: 'lead',   label: 'ლიდი',       align: 'left'},
  {id: 'total',  label: 'ჯამი',       align: 'right'},
  {id: 'status', label: 'სტატუსი',    align: 'left'},
  {id: 'pdf',    label: 'PDF',        align: 'left'},
  {id: 'date',   label: 'თარიღი',     align: 'left'},
  {id: 'action', label: 'მოქმედება',  align: 'right'},
];

const DEFAULT_COLUMN_ORDER: ColumnId[] = COLUMN_DEFS.map((c) => c.id);
const COLUMN_DEF_BY_ID = Object.fromEntries(COLUMN_DEFS.map((c) => [c.id, c])) as Record<ColumnId, ColumnDef>;

type DatePreset = 'last7' | 'last30' | 'thisMonth' | 'prevMonth';
type SortKey = 'date' | 'status' | 'total' | null;
type SortDir = 'asc' | 'desc';

const STATUS_SORT_ORDER: Record<OfferStatus, number> = {
  draft: 0,
  sent: 1,
  approved: 2,
  rejected: 3,
  cancelled: 4,
};

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateFilterLabel(date: string) {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ka-GE', {month: 'short', day: '2-digit'});
}

function getPresetRange(preset: DatePreset) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);

  if (preset === 'last7') {
    start.setDate(end.getDate() - 6);
  } else if (preset === 'last30') {
    start.setDate(end.getDate() - 29);
  } else if (preset === 'thisMonth') {
    start.setDate(1);
  } else {
    start.setMonth(end.getMonth() - 1, 1);
    end.setDate(0);
  }

  return {from: toDateInputValue(start), to: toDateInputValue(end)};
}

function fmtMoney(n: number, currency: string) {
  return `${currency === 'GEL' ? '₾ ' : currency + ' '}${n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function fmtDate(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('en-GB').replace(',', ''); } catch { return iso; }
}

export default function InvoicesPage() {
  const [q, setQ] = useState('');
  const [offers, setOffers] = useState<DmtOffer[]>([]);
  const [leads, setLeads] = useState<ManualLead[]>([]);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [editorLead, setEditorLead] = useState<OfferLeadRef | null>(null);
  const [editorOffer, setEditorOffer] = useState<DmtOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Set<OfferStatus>>(() => new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [shellKey, setShellKey] = useState(0);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [pendingDelete, setPendingDelete] = useState<DmtOffer | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 6}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  const onColumnDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    setColumnOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as ColumnId);
      const newIndex = prev.indexOf(over.id as ColumnId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const resetColumnOrder = () => setColumnOrder(DEFAULT_COLUMN_ORDER);
  const isColumnsCustom = columnOrder.some((id, idx) => id !== DEFAULT_COLUMN_ORDER[idx]);

  const refresh = async () => {
    try {
      const [offersRes, leadsRes] = await Promise.all([
        fetch('/api/dmt/offers').then((r) => r.json()),
        fetch('/api/dmt/manual-leads').then((r) => r.json()),
      ]);
      setOffers(offersRes.offers ?? []);
      setLeads(leadsRes.rows ?? []);
    } catch (err) {
      console.error('refresh failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {status?: unknown; from?: unknown; to?: unknown; sortKey?: unknown; sortDir?: unknown};
      if (Array.isArray(saved.status)) {
        const statuses = saved.status.filter((s): s is OfferStatus => STATUS_ORDER.includes(s as OfferStatus));
        setStatusFilter(new Set(statuses));
      }
      if (typeof saved.from === 'string') setDateFrom(saved.from);
      if (typeof saved.to === 'string') setDateTo(saved.to);
      if (saved.sortKey === 'date' || saved.sortKey === 'status' || saved.sortKey === 'total' || saved.sortKey === null) {
        setSortKey(saved.sortKey);
      }
      if (saved.sortDir === 'asc' || saved.sortDir === 'desc') setSortDir(saved.sortDir);
    } catch {
      // Ignore stale localStorage data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      status: Array.from(statusFilter),
      from: dateFrom,
      to: dateTo,
      sortKey,
      sortDir,
    }));
  }, [statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        const valid = saved.filter((id): id is ColumnId => DEFAULT_COLUMN_ORDER.includes(id as ColumnId));
        // Only apply if it covers exactly the same columns (length match, no dupes).
        if (valid.length === DEFAULT_COLUMN_ORDER.length && new Set(valid).size === valid.length) {
          setColumnOrder(valid);
        }
      }
    } catch {
      // Ignore stale localStorage data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const filtered = useMemo(() => {
    let result = offers;

    // Empty set means "all statuses"; selected statuses are OR-ed together.
    if (statusFilter.size > 0) {
      result = result.filter((o) => statusFilter.has(o.status));
    }

    if (dateFrom) {
      const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
      if (!Number.isNaN(fromMs)) {
        result = result.filter((o) => new Date(o.updatedAt).getTime() >= fromMs);
      }
    }

    if (dateTo) {
      const toMs = new Date(`${dateTo}T23:59:59.999`).getTime();
      if (!Number.isNaN(toMs)) {
        result = result.filter((o) => new Date(o.updatedAt).getTime() <= toMs);
      }
    }

    const t = q.trim().toLowerCase();
    if (t) {
      result = result.filter((o) => {
        const lead = leads.find((l) => l.id === o.leadId);
        const haystack = [
          o.id,
          String(o.docNumber ?? ''),
          o.leadId,
          lead?.company,
          lead?.contact,
          o.status,
          String(o.total)
        ].join(' ').toLowerCase();
        return haystack.includes(t);
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const key = sortKey ?? 'date';
    return [...result].sort((a, b) => {
      if (key === 'status') return ((STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99)) * dir;
      if (key === 'total') return ((a.total || 0) - (b.total || 0)) * dir;
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    });
  }, [offers, leads, q, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  const countByStatus = useMemo(() => {
    return offers.reduce<Record<OfferStatus, number>>((acc, offer) => {
      acc[offer.status] = (acc[offer.status] ?? 0) + 1;
      return acc;
    }, {draft: 0, sent: 0, approved: 0, rejected: 0, cancelled: 0});
  }, [offers]);

  const hasActiveFilters = q.trim().length > 0 || statusFilter.size > 0 || Boolean(dateFrom) || Boolean(dateTo);
  const activeFilterCount = (q.trim() ? 1 : 0) + statusFilter.size + (dateFrom || dateTo ? 1 : 0);
  const dateLabel = dateFrom || dateTo
    ? `თარიღი (${dateFrom ? formatDateFilterLabel(dateFrom) : ''}${dateFrom && dateTo ? ' - ' : dateFrom ? ' →' : '← '}${dateTo ? formatDateFilterLabel(dateTo) : ''})`
    : 'თარიღი';

  const totalAmount = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const sentCount = filtered.filter((o) => o.status === 'sent').length;
  const approvedCount = filtered.filter((o) => o.status === 'approved').length;

  const toggleStatusFilter = (status: OfferStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const applyDatePreset = (preset: DatePreset) => {
    const range = getPresetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const clearFilters = () => {
    setQ('');
    setStatusFilter(new Set());
    setDateFrom('');
    setDateTo('');
    setSortKey(null);
    setSortDir('desc');
    setDatePanelOpen(false);
    setShellKey((v) => v + 1);
  };

  const toggleSort = (key: Exclude<SortKey, null>) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => dir === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  };

  const startNew = () => {
    if (leads.length === 0) {
      alert('ჯერ ერთი manual ლიდი მაინც დაამატე /dmt/leads/manual გვერდიდან.');
      return;
    }
    setShowLeadPicker(true);
  };

  const onLeadSelected = (lead: ManualLead) => {
    setShowLeadPicker(false);
    setEditorLead({id: lead.id, company: lead.company, contact: lead.contact, phone: lead.phone});
    setEditorOffer(null);
  };

  const onEditOffer = (offer: DmtOffer) => {
    const lead = leads.find((l) => l.id === offer.leadId);
    if (!lead) {
      alert('ლიდი ვერ მოიძებნა.');
      return;
    }
    setEditorLead({id: lead.id, company: lead.company, contact: lead.contact, phone: lead.phone});
    setEditorOffer(offer);
  };

  const onEditorClose = () => {
    setEditorLead(null);
    setEditorOffer(null);
  };

  const onEditorSaved = (saved: DmtOffer) => {
    setOffers((prev) => {
      const idx = prev.findIndex((o) => o.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  };

  const confirmDeleteOffer = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await deleteOffer(target.id);
      setOffers((prev) => prev.filter((o) => o.id !== target.id));
      setSelectedIds((prev) => {
        if (!prev.has(target.id)) return prev;
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setPendingDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'წაშლა ვერ მოხერხდა';
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredIds = useMemo(() => filtered.map((o) => o.id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const failed: Array<{id: string; reason: string}> = [];
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteOffer(id)));
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          const reason = res.reason instanceof Error ? res.reason.message : String(res.reason);
          failed.push({id: ids[idx], reason});
        }
      });
      const succeeded = new Set(ids.filter((_, idx) => results[idx].status === 'fulfilled'));
      setOffers((prev) => prev.filter((o) => !succeeded.has(o.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
      setPendingBulkDelete(false);
      if (failed.length > 0) {
        alert(`წაშლა ვერ მოხერხდა ${failed.length} ინვოისზე:\n` + failed.map((f) => `• ${f.id}: ${f.reason}`).join('\n'));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DmtPageShell
      key={shellKey}
      kicker="OPERATIONS"
      title="ინვოისები"
      subtitle="კომერციული წინადადებები — ლიდისთვის გენერირებული PDF-ები"
      searchPlaceholder="ძიება ID / კლიენტი / სტატუსი…"
      initialQuery={q}
      onQueryChange={setQ}
      filterSlot={
        <button
          type="button"
          onClick={() => setFiltersExpanded((v) => !v)}
          aria-expanded={filtersExpanded}
          aria-controls="invoices-filter-row"
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            statusFilter.size > 0 || dateFrom || dateTo
              ? 'border-blue bg-blue-lt text-blue'
              : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue'
          }`}
        >
          <Filter size={14} />
          ფილტრი
          {(statusFilter.size > 0 || dateFrom || dateTo) && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue px-1 text-[9.5px] font-bold text-white">
              {statusFilter.size + (dateFrom || dateTo ? 1 : 0)}
            </span>
          )}
          <ChevronDown size={12} className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
        </button>
      }
      actions={
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={14} /> ახალი ინვოისი
        </button>
      }
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="ნაჩვენები" value={String(filtered.length)} />
          <StatCard label="მთლიანი თანხა" value={fmtMoney(totalAmount, 'GEL')} />
          <StatCard label="გაგზავნილი" value={String(sentCount)} accent="blue" />
          <StatCard label="დადასტურებული" value={String(approvedCount)} accent="grn" />
        </div>

        {filtersExpanded && (
        <div id="invoices-filter-row" className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-bdr bg-sur-2/40 p-2">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3 px-1">
            ფილტრები:
          </span>
          <FilterPill
            label="ყველა"
            active={statusFilter.size === 0}
            count={offers.length}
            onClick={() => setStatusFilter(new Set())}
          />
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            return (
              <FilterPill
                key={status}
                label={meta.label}
                active={statusFilter.has(status)}
                count={countByStatus[status] ?? 0}
                color={meta.color}
                bg={meta.bg}
                border={meta.border}
                onClick={() => toggleStatusFilter(status)}
              />
            );
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setDatePanelOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-bdr bg-sur px-3 text-[11.5px] font-semibold text-text-2 hover:border-blue hover:text-blue"
            >
              <Calendar size={13} />
              {dateLabel}
              <ChevronDown size={13} className={datePanelOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {datePanelOpen && (
              <DateFilterPanel
                dateFrom={dateFrom}
                dateTo={dateTo}
                onFromChange={setDateFrom}
                onToChange={setDateTo}
                onPreset={applyDatePreset}
                onClear={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                onClose={() => setDatePanelOpen(false)}
              />
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-semibold text-text-3 hover:bg-sur-2 hover:text-red"
            >
              <RotateCcw size={13} />
              ფილტრების გასუფთავება ({activeFilterCount})
            </button>
          )}
        </div>
        )}

        {loading ? (
          <div className="rounded-[10px] border border-bdr bg-sur p-6 text-center text-[12px] text-text-3">
            იტვირთება…
          </div>
        ) : filtered.length === 0 ? (
          hasActiveFilters ? <FilteredEmptyState onClear={clearFilters} /> : <EmptyState onCreate={startNew} />
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-blue bg-blue-lt px-3 py-2 text-[12px] text-navy">
                <span className="font-semibold">{selectedIds.size} ინვოისი მონიშნულია</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[11.5px] text-text-3 hover:text-blue"
                >
                  მონიშვნის გაუქმება
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBulkDelete(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-red bg-red px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-red/90"
                >
                  <Trash2 size={12} /> წაშლა ({selectedIds.size})
                </button>
              </div>
            )}
            {isColumnsCustom && (
              <div className="mb-2 flex items-center justify-end gap-2 text-[11px] text-text-3">
                <span>სვეტები გადასრიალდა</span>
                <button
                  type="button"
                  onClick={resetColumnOrder}
                  className="inline-flex items-center gap-1 rounded-md border border-bdr bg-sur px-2 py-0.5 font-semibold text-text-2 hover:border-blue hover:text-blue"
                >
                  <RotateCcw size={11} /> default
                </button>
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColumnDragEnd}>
              <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
            <div className="overflow-x-auto rounded-[10px] border border-bdr bg-sur">
              <table className="w-full">
                    <thead className="border-b border-bdr bg-sur-2 text-left">
                      <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                        <th className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                            }}
                            onChange={toggleSelectAllFiltered}
                            aria-label="ყველას მონიშვნა"
                            className="cursor-pointer"
                          />
                        </th>
                        {columnOrder.map((id) => (
                          <SortableTh
                            key={id}
                            id={id}
                            def={COLUMN_DEF_BY_ID[id]}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={id === 'status' || id === 'total' || id === 'date' ? () => toggleSort(id) : undefined}
                          />
                        ))}
                      </tr>
                    </thead>
                <tbody>
                  {filtered.map((o) => {
                    const lead = leads.find((l) => l.id === o.leadId);
                    const st = STATUS_META[o.status];
                    const isSelected = selectedIds.has(o.id);
                    return (
                      <tr key={o.id} className={`border-b border-bdr/70 last:border-b-0 text-[12px] hover:bg-sur-2 ${isSelected ? 'bg-blue-lt/40' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(o.id)}
                            aria-label={`${o.id} მონიშვნა`}
                            className="cursor-pointer"
                          />
                        </td>
                        {columnOrder.map((id) => {
                          switch (id) {
                            case 'id':
                              return (
                                <td key={id} className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-navy">
                                  {o.docNumber ? String(o.docNumber) : <span className="text-text-3" title={o.id}>—</span>}
                                </td>
                              );
                            case 'client':
                              return <td key={id} className="px-3 py-2 text-text-2">{lead?.company || '—'}</td>;
                            case 'lead':
                              return (
                                <td key={id} className="px-3 py-2 font-mono text-[11px] text-text-3">
                                  <Link href={`/dmt/leads/manual?highlight=${encodeURIComponent(o.leadId)}`} className="hover:text-blue">
                                    {o.leadId}
                                  </Link>
                                </td>
                              );
                            case 'total':
                              return (
                                <td key={id} className="whitespace-nowrap px-3 py-2 text-right font-mono text-navy">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-semibold">{fmtMoney(o.total, o.currency)}</span>
                                    {o.discountPercent != null && o.discountPercent > 0 && (
                                      <span
                                        className="inline-flex shrink-0 items-center rounded-md border border-red bg-red-lt px-1.5 py-0.5 text-[9.5px] font-bold text-red"
                                        title={`ფასდაკლება ${o.discountPercent}%`}
                                      >
                                        −{o.discountPercent}%
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            case 'status':
                              return (
                                <td key={id} className="px-3 py-2">
                                  <span
                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                                    style={{color: st.color, background: st.bg, borderColor: st.border}}
                                  >
                                    {st.label}
                                  </span>
                                </td>
                              );
                            case 'pdf':
                              return (
                                <td key={id} className="px-3 py-2">
                                  {o.pdfUrl ? (
                                    <a href={o.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue hover:underline">
                                      <FileText size={12} /> ნახე
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-text-3">—</span>
                                  )}
                                </td>
                              );
                            case 'date':
                              return <td key={id} className="px-3 py-2 font-mono text-[10.5px] text-text-3">{fmtDate(o.updatedAt)}</td>;
                            case 'action':
                              return (
                                <td key={id} className="px-3 py-2 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => onEditOffer(o)}
                                      className="rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
                                    >
                                      რედაქტ.
                                    </button>
                                    <button
                                      onClick={() => setPendingDelete(o)}
                                      className="rounded-md border border-bdr bg-sur p-1.5 text-text-3 transition-colors hover:border-red hover:bg-red-lt hover:text-red"
                                      title="წაშლა"
                                      aria-label="ინვოისის წაშლა"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {showLeadPicker && (
        <LeadPickerModal
          leads={leads}
          onPick={onLeadSelected}
          onClose={() => setShowLeadPicker(false)}
        />
      )}

      {editorLead && (
        <OfferEditor
          lead={editorLead}
          offer={editorOffer}
          onClose={onEditorClose}
          onSaved={onEditorSaved}
        />
      )}

      {pendingDelete && (
        <DeleteOfferModal
          offer={pendingDelete}
          leadCompany={leads.find((l) => l.id === pendingDelete.leadId)?.company ?? '—'}
          deleting={deleting}
          onConfirm={confirmDeleteOffer}
          onCancel={() => (deleting ? null : setPendingDelete(null))}
        />
      )}

      {pendingBulkDelete && (
        <BulkDeleteModal
          count={selectedIds.size}
          deleting={deleting}
          onConfirm={confirmBulkDelete}
          onCancel={() => (deleting ? null : setPendingBulkDelete(false))}
        />
      )}
    </DmtPageShell>
  );
}

function BulkDeleteModal({count, deleting, onConfirm, onCancel}: {
  count: number;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/45 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-2xl">
        <div className="border-b border-bdr bg-red-lt px-4 py-3">
          <h2 className="inline-flex items-center gap-2 text-[14px] font-bold text-red">
            <Trash2 size={16} /> {count} ინვოისის წაშლა
          </h2>
        </div>
        <div className="space-y-3 px-4 py-4 text-[13px] text-text-2">
          <p>ნამდვილად გსურს მონიშნული {count} ინვოისის წაშლა?</p>
          <p className="text-[11.5px] text-red">⚠️ ეს მოქმედება შეუქცევადია. PDF (თუ გენერირებული იყო) Storage-დან არ წაიშლება.</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-bdr bg-sur-2/40 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-bdr bg-sur px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md border border-red bg-red px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red/90 disabled:opacity-60"
          >
            {deleting ? 'წაშლა…' : <><Trash2 size={12} /> ყველას წაშლა ({count})</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteOfferModal({offer, leadCompany, deleting, onConfirm, onCancel}: {
  offer: DmtOffer;
  leadCompany: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/45 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-2xl">
        <div className="border-b border-bdr bg-red-lt px-4 py-3">
          <h2 className="inline-flex items-center gap-2 text-[14px] font-bold text-red">
            <Trash2 size={16} /> ინვოისის წაშლა
          </h2>
        </div>
        <div className="space-y-3 px-4 py-4 text-[13px] text-text-2">
          <p>ნამდვილად გსურს ამ ინვოისის წაშლა?</p>
          <div className="rounded-md border border-bdr bg-sur-2 p-2.5 font-mono text-[11.5px]">
            <div><span className="text-text-3">ID:</span> <b className="text-navy">{offer.id}</b></div>
            <div><span className="text-text-3">კლიენტი:</span> {leadCompany}</div>
            <div><span className="text-text-3">სტატუსი:</span> {offer.status}</div>
          </div>
          <p className="text-[11.5px] text-red">⚠️ ეს მოქმედება შეუქცევადია. PDF (თუ გენერირებული იყო) Storage-დან არ წაიშლება.</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-bdr bg-sur-2/40 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-bdr bg-sur px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md border border-red bg-red px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red/90 disabled:opacity-60"
          >
            {deleting ? 'წაშლა…' : <><Trash2 size={12} /> წაშლა</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  count,
  color = 'var(--navy)',
  bg = 'var(--sur-2)',
  border = 'var(--bdr)',
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  color?: string;
  bg?: string;
  border?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition-colors"
      style={{
        color: active ? color : 'var(--text-2)',
        background: active ? bg : 'var(--sur)',
        borderColor: active ? border : 'var(--bdr)',
      }}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-text-3">
          {count}
        </span>
      )}
    </button>
  );
}

function DateFilterPanel({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
  onPreset,
  onClear,
  onClose,
}: {
  dateFrom: string;
  dateTo: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPreset: (preset: DatePreset) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close date filter"
        className="fixed inset-0 z-30 cursor-default bg-transparent md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-24 z-40 rounded-lg border border-bdr bg-sur p-3 shadow-xl md:absolute md:left-0 md:right-auto md:top-10 md:w-[292px]">
        <div className="grid gap-2">
          <label className="grid gap-1 text-[11px] font-semibold text-text-3">
            <span>დან</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFromChange(e.target.value)}
              className="h-8 rounded-md border border-bdr bg-sur-2 px-2 text-[12px] text-text focus:border-blue focus:outline-none"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-text-3">
            <span>მდე</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onToChange(e.target.value)}
              className="h-8 rounded-md border border-bdr bg-sur-2 px-2 text-[12px] text-text focus:border-blue focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <DatePresetButton label="ბოლო 7 დღე" onClick={() => onPreset('last7')} />
          <DatePresetButton label="ბოლო 30" onClick={() => onPreset('last30')} />
          <DatePresetButton label="ეს თვე" onClick={() => onPreset('thisMonth')} />
          <DatePresetButton label="წინა თვე" onClick={() => onPreset('prevMonth')} />
        </div>
        <button
          type="button"
          onClick={onClear}
          className="mt-2 w-full rounded-md border border-bdr bg-sur px-2 py-1.5 text-[11.5px] font-semibold text-text-2 hover:border-red hover:text-red"
        >
          გასუფთავება
        </button>
      </div>
    </>
  );
}

function DatePresetButton({label, onClick}: {label: string; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
    >
      {label}
    </button>
  );
}

function LeadPickerModal({leads, onPick, onClose}: {leads: ManualLead[]; onPick: (lead: ManualLead) => void; onClose: () => void}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter((l) => [l.id, l.company, l.contact, l.phone].join(' ').toLowerCase().includes(t));
  }, [leads, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
          <h2 className="text-[14px] font-bold text-navy">აირჩიე ლიდი</h2>
          <button onClick={onClose} className="rounded p-1 text-text-3 hover:bg-sur-2">
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-bdr px-3 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ძიება…"
            autoFocus
            className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[12px] focus:border-blue focus:outline-none"
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-text-3">ლიდი ვერ მოიძებნა</div>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onPick(lead)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-sur-2"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-navy">{lead.company || '—'}</div>
                  <div className="text-[11px] text-text-3">{lead.contact || '—'} · {lead.phone || '—'}</div>
                </div>
                <span className="font-mono text-[10.5px] text-text-3">{lead.id}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SortableTh({
  id,
  def,
  sortKey,
  sortDir,
  onSort,
}: {
  id: ColumnId;
  def: ColumnDef;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort?: () => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`group select-none px-3 py-2.5 ${def.align === 'right' ? 'text-right' : 'text-left'} ${isDragging ? 'bg-blue-lt' : ''}`}
    >
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-flex cursor-grab items-center active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="გადაიტანე"
        >
          <GripVertical size={11} className="text-text-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        {onSort ? (
          <button
            type="button"
            onClick={onSort}
            className={`inline-flex items-center gap-1 rounded px-1 py-0.5 font-bold hover:text-blue ${sortKey === id ? 'text-blue' : ''}`}
          >
            {def.label}
            {sortKey === id ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
          </button>
        ) : (
          <span>{def.label}</span>
        )}
      </span>
    </th>
  );
}

function EmptyState({onCreate}: {onCreate: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">ინვოისი ჯერ არ არსებობს</div>
      <div className="mt-1 max-w-sm text-[12px] text-text-3">
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        შექმენი პირველი ინვოისი „+ ახალი" ღილაკით. აირჩიე ლიდი → შეავსე items + ფასი → PDF გენერაცია.
      </div>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
      >
        <Plus size={14} /> ახალი ინვოისი
      </button>
    </div>
  );
}

function FilteredEmptyState({onClear}: {onClear: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">ფილტრით შესაბამისი ინვოისი არ მოიძებნა</div>
      <div className="mt-1 max-w-sm text-[12px] text-text-3">
        შეცვალე სტატუსი, თარიღი ან ძებნა, ან გაასუფთავე ფილტრები სრული სიის სანახავად.
      </div>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
      >
        <RotateCcw size={14} /> ფილტრების გასუფთავება
      </button>
    </div>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'red' | 'grn' | 'blue'}) {
  const color = accent === 'red' ? 'var(--red)' : accent === 'grn' ? 'var(--grn)' : accent === 'blue' ? 'var(--blue)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>{value}</div>
    </div>
  );
}
