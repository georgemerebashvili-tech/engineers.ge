'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Download,
  GripVertical,
  History,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {
  CONTACT_COLUMN_ORDER,
  SOURCE_META,
  SOURCE_ORDER as CONTACT_SOURCE_ORDER,
  convertContactToLead,
  createContact,
  deleteContact,
  emptyContact,
  fmtDate,
  loadColumnOrder,
  loadColumnWidths,
  loadContacts,
  loadContactsAudit,
  saveColumnOrder,
  saveColumnWidths,
  unlinkLeadFromContact,
  updateContact,
  type Contact,
  type ContactAuditEntry,
  type ContactColumnKey,
  type ContactSource
} from '@/lib/dmt/contacts-store';
import {getActor} from '@/lib/dmt/leads-store';

const MIN_W = 80;
const MAX_W = 640;

type Column = {
  key: ContactColumnKey;
  label: string;
  width: number;
  readonly?: boolean;
  align?: 'right';
};

const COLUMNS: Record<ContactColumnKey, Column> = {
  id: {key: 'id', label: 'ID', width: 92, readonly: true},
  name: {key: 'name', label: 'სახელი', width: 170},
  company: {key: 'company', label: 'კომპანია', width: 180},
  position: {key: 'position', label: 'თანამდებობა', width: 150},
  phone: {key: 'phone', label: 'ტელეფონი', width: 150},
  email: {key: 'email', label: 'Email', width: 210},
  tags: {key: 'tags', label: 'თეგები', width: 250},
  source: {key: 'source', label: 'წყარო', width: 120},
  convertedTo: {key: 'convertedTo', label: 'ლიდი თუ არა', width: 180, readonly: true},
  notes: {key: 'notes', label: 'შენიშვნა', width: 220},
  createdAt: {key: 'createdAt', label: 'დამატებულია', width: 150, readonly: true},
  createdBy: {key: 'createdBy', label: 'ვინ დაამატა', width: 140, readonly: true},
  updatedBy: {key: 'updatedBy', label: 'რედ. ავტორი', width: 140, readonly: true},
  updatedAt: {key: 'updatedAt', label: 'ბოლო დრო', width: 150, readonly: true}
};

type EditableKey = 'name' | 'company' | 'position' | 'phone' | 'email' | 'notes';
type LeadFilter = 'all' | 'lead' | 'not';

const LEAD_FILTER_KEY = 'dmt_contacts_lead_filter_v1';

function loadLeadFilter(): LeadFilter {
  if (typeof window === 'undefined') return 'all';
  const saved = window.localStorage.getItem(LEAD_FILTER_KEY);
  return saved === 'lead' || saved === 'not' ? saved : 'all';
}

function saveLeadFilter(value: LeadFilter) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEAD_FILTER_KEY, value);
}

export default function DmtContactsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<Contact[]>([]);
  const [audit, setAudit] = useState<ContactAuditEntry[]>([]);
  const [order, setOrder] = useState<ContactColumnKey[]>(CONTACT_COLUMN_ORDER);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [dragKey, setDragKey] = useState<ContactColumnKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<ContactColumnKey | null>(null);
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [actor, setActorState] = useState('მე');
  const [pendingLeadOps, setPendingLeadOps] = useState<Set<string>>(new Set());
  const pendingLeadOpsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setOrder(loadColumnOrder());
    setWidths(loadColumnWidths());
    setLeadFilter(loadLeadFilter());
    setActorState(getActor());

    (async () => {
      try {
        const [contacts, history] = await Promise.all([loadContacts(), loadContactsAudit()]);
        if (cancelled) return;
        setRows(contacts);
        setAudit(history);
        setError('');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'კონტაქტები ვერ ჩაიტვირთა');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) saveColumnOrder(order);
  }, [hydrated, order]);

  useEffect(() => {
    if (hydrated) saveColumnWidths(widths);
  }, [hydrated, widths]);

  useEffect(() => {
    if (hydrated) saveLeadFilter(leadFilter);
  }, [hydrated, leadFilter]);

  const orderedColumns = useMemo(() => order.map((key) => COLUMNS[key]).filter(Boolean), [order]);
  const widthOf = (col: Column) => widths[col.key] ?? col.width;
  const gridTemplate = `${orderedColumns.map((col) => `${widthOf(col)}px`).join(' ')} 48px`;
  const tableMinWidth = orderedColumns.reduce((sum, col) => sum + widthOf(col), 48);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const scrollToContact = (id: string) => {
    const el = document.querySelector(`[data-contact-row="${CSS.escape(id)}"]`);
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
    setHighlightedId(id);
    window.setTimeout(() => setHighlightedId(null), 1500);
  };

  const exportCsv = () => {
    const headers = orderedColumns.map((col) => col.label);
    const lines = filtered.map((row) =>
      orderedColumns.map((col) => csvEscape(displayForColumn(row, col.key))).join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmt-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const addContact = async () => {
    const contact = emptyContact(rows, actor);
    setRows((prev) => [contact, ...prev]);
    try {
      const saved = await createContact(contact);
      setRows((prev) => prev.map((row) => (row.id === contact.id ? saved.contact : row)));
      if (saved.auditEntry) setAudit((prev) => [saved.auditEntry!, ...prev]);
      showToast(`კონტაქტი დაემატა: ${saved.contact.id}`);
    } catch (err) {
      setRows((prev) => prev.filter((row) => row.id !== contact.id));
      showToast(err instanceof Error ? err.message : 'კონტაქტი ვერ შეინახა');
    }
  };

  const patchContact = async (id: string, patch: Partial<Contact>) => {
    const before = rows.find((row) => row.id === id);
    if (!before) return;
    const optimistic = {...before, ...patch, updatedAt: new Date().toISOString(), updatedBy: actor};
    setRows((prev) => prev.map((row) => (row.id === id ? optimistic : row)));
    try {
      const saved = await updateContact(id, patch);
      setRows((prev) => prev.map((row) => (row.id === id ? saved.contact : row)));
      if (saved.auditEntries.length) setAudit((prev) => [...saved.auditEntries, ...prev]);
    } catch (err) {
      setRows((prev) => prev.map((row) => (row.id === id ? before : row)));
      showToast(err instanceof Error ? err.message : 'ცვლილება ვერ შეინახა');
    }
  };

  const removeContact = async (id: string) => {
    const target = rows.find((row) => row.id === id);
    if (!target) return;
    if (!confirm(`წავშალო კონტაქტი ${target.id}?`)) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
    try {
      const deleted = await deleteContact(id);
      if (deleted.auditEntry) setAudit((prev) => [deleted.auditEntry!, ...prev]);
      showToast('კონტაქტი წაიშალა');
    } catch (err) {
      setRows((prev) => [target, ...prev]);
      showToast(err instanceof Error ? err.message : 'კონტაქტი ვერ წაიშალა');
    }
  };

  const beginLeadOp = (id: string) => {
    if (pendingLeadOpsRef.current.has(id)) return false;
    const next = new Set(pendingLeadOpsRef.current);
    next.add(id);
    pendingLeadOpsRef.current = next;
    setPendingLeadOps(next);
    return true;
  };

  const endLeadOp = (id: string) => {
    const next = new Set(pendingLeadOpsRef.current);
    next.delete(id);
    pendingLeadOpsRef.current = next;
    setPendingLeadOps(next);
  };

  const convertToLead = async (contact: Contact) => {
    if (!beginLeadOp(contact.id)) return;
    const nowIso = new Date().toISOString();
    const optimistic: Contact = {
      ...contact,
      convertedToLeadId: '__pending__',
      convertedAt: nowIso,
      convertedBy: actor,
      updatedAt: nowIso,
      updatedBy: actor
    };
    setRows((prev) => prev.map((row) => (row.id === contact.id ? optimistic : row)));

    try {
      const converted = await convertContactToLead(contact.id, {
        stage: 'new',
        source: 'manual',
        owner: '',
        value: 0
      });
      setRows((prev) => prev.map((row) => (row.id === contact.id ? converted.contact : row)));
      if (converted.contactAuditEntry) setAudit((prev) => [converted.contactAuditEntry!, ...prev]);
      showToast(`ლიდი შეიქმნა: ${converted.lead.id}`);
    } catch (err) {
      setRows((prev) => prev.map((row) => (row.id === contact.id ? contact : row)));
      showToast(err instanceof Error ? err.message : 'ლიდად გადაყვანა ვერ დასრულდა');
    } finally {
      endLeadOp(contact.id);
    }
  };

  const unlinkLead = async (contact: Contact) => {
    if (!contact.convertedToLeadId) return;
    if (!beginLeadOp(contact.id)) return;
    const nowIso = new Date().toISOString();
    const optimistic: Contact = {
      ...contact,
      convertedToLeadId: null,
      convertedAt: null,
      convertedBy: null,
      updatedAt: nowIso,
      updatedBy: actor
    };
    setRows((prev) => prev.map((row) => (row.id === contact.id ? optimistic : row)));

    try {
      const result = await unlinkLeadFromContact(contact.id);
      setRows((prev) => prev.map((row) => (row.id === contact.id ? result.contact : row)));
      if (result.contactAuditEntry) setAudit((prev) => [result.contactAuditEntry!, ...prev]);
      showToast('ლიდი ამოშლილია');
    } catch (err) {
      setRows((prev) => prev.map((row) => (row.id === contact.id ? contact : row)));
      showToast(err instanceof Error ? err.message : 'ლიდი ვერ ამოიშალა');
    } finally {
      endLeadOp(contact.id);
    }
  };

  const onDragStart = (key: ContactColumnKey) => () => setDragKey(key);
  const onDragOver = (key: ContactColumnKey) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragKey && dragKey !== key) setDragOverKey(key);
  };
  const onDrop = (key: ContactColumnKey) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragKey || dragKey === key) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    setOrder((prev) => {
      const next = prev.slice();
      const from = next.indexOf(dragKey);
      const to = next.indexOf(key);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragKey(null);
    setDragOverKey(null);
  };

  const startResize = (key: string, startWidth: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingKey(key);
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(MAX_W, Math.max(MIN_W, startWidth + ev.clientX - startX));
      setWidths((prev) => ({...prev, [key]: next}));
    };
    const onUp = () => {
      setResizingKey(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (leadFilter === 'lead' && !row.convertedToLeadId) return false;
      if (leadFilter === 'not' && row.convertedToLeadId) return false;
      if (q) {
        const hit = [
          row.id,
          row.name,
          row.company,
          row.phone,
          row.email,
          row.tags.join(' '),
          row.notes
        ].some((value) => value.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [leadFilter, query, rows]);

  return (
    <DmtPageShell
      kicker="DMT · CRM"
      title="კონტაქტები"
      subtitle="ყველა კონტაქტი — ცოცხალი grid, ცვლილებები ავტომატურად ინახება"
      searchPlaceholder="ძიება სახელი / კომპანია / email / ID…"
      onQueryChange={setQuery}
      filterSlot={
        <div className="inline-flex items-center rounded-md border border-bdr bg-sur-2 p-0.5 text-[11.5px] font-semibold">
          <button
            onClick={() => setLeadFilter('all')}
            className={leadFilter === 'all'
              ? 'rounded bg-blue px-2.5 py-1 text-white'
              : 'px-2.5 py-1 text-text-2 hover:text-blue'}
          >
            ყველა
          </button>
          <button
            onClick={() => setLeadFilter('lead')}
            className={leadFilter === 'lead'
              ? 'rounded bg-grn px-2.5 py-1 text-white'
              : 'px-2.5 py-1 text-text-2 hover:text-grn'}
          >
            ლიდი
          </button>
          <button
            onClick={() => setLeadFilter('not')}
            className={leadFilter === 'not'
              ? 'rounded bg-text-3 px-2.5 py-1 text-white'
              : 'px-2.5 py-1 text-text-2 hover:text-text'}
          >
            არ არის ლიდი
          </button>
        </div>
      }
      actions={
        <>
          <button
            onClick={() => setShowHistory((value) => !value)}
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
            onClick={() => void addContact()}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი
          </button>
        </>
      }
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12px] font-semibold text-grn shadow-card">
          {toast}
        </div>
      )}

      <div className="flex h-full gap-4 px-6 py-5 md:px-8">
        <div className="min-w-0 flex-1">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="ნაჩვენები" value={String(filtered.length)} />
            <StatCard label="ლიდად კონვერტ." value={String(rows.filter((row) => row.convertedToLeadId).length)} accent="grn" />
            <StatCard label="გაუხსნელი" value={String(rows.filter((row) => !row.convertedToLeadId).length)} accent="blue" />
          </div>

          <div className="dmt-scroll rounded-[10px] border border-bdr bg-sur">
            <div style={{minWidth: tableMinWidth}}>
              <div
                className="sticky top-0 z-20 grid border-b border-bdr bg-sur-2 text-[11px] font-bold text-text-3"
                style={{gridTemplateColumns: gridTemplate}}
              >
                {orderedColumns.map((col) => (
                  <HeaderCell
                    key={col.key}
                    col={col}
                    width={widthOf(col)}
                    dragging={dragKey === col.key}
                    dragOver={dragOverKey === col.key}
                    resizing={resizingKey === col.key}
                    onDragStart={onDragStart(col.key)}
                    onDragOver={onDragOver(col.key)}
                    onDrop={onDrop(col.key)}
                    onResizeStart={startResize(col.key, widthOf(col))}
                  />
                ))}
                <div />
              </div>

              {!hydrated ? (
                <div className="px-4 py-10 text-center text-[13px] text-text-3">იტვირთება...</div>
              ) : error ? (
                <div className="px-4 py-10 text-center text-[13px] text-red">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-text-3">კონტაქტი არ მოიძებნა.</div>
              ) : (
                filtered.map((row) => (
                  <div
                    key={row.id}
                    data-contact-row={row.id}
                    className={`grid border-b border-bdr text-[12px] text-text last:border-b-0 hover:bg-blue-lt/20 ${
                      row.convertedToLeadId ? 'border-l-4 border-l-grn' : 'border-l-4 border-l-transparent'
                    } ${highlightedId === row.id ? 'bg-blue-lt ring-2 ring-blue-bd' : ''}`}
                    style={{gridTemplateColumns: gridTemplate}}
                  >
                    {orderedColumns.map((col) => (
                      <Cell
                        key={col.key}
                        col={col.key}
                        row={row}
                        pending={pendingLeadOps.has(row.id)}
                        onPatch={(patch) => void patchContact(row.id, patch)}
                        onConvert={() => void convertToLead(row)}
                        onUnlink={() => void unlinkLead(row)}
                      />
                    ))}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => void removeContact(row.id)}
                        className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                        title="წაშლა"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {showHistory && (
          <AuditPanel audit={audit} onClose={() => setShowHistory(false)} onSelect={scrollToContact} />
        )}
      </div>
      <style jsx global>{`
        .dmt-scroll {
          overflow-x: scroll;
          overflow-y: auto;
          max-height: calc(100vh - 280px);
          scrollbar-width: thin;
          scrollbar-color: var(--bdr-2) transparent;
        }
        .dmt-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .dmt-scroll::-webkit-scrollbar-track {
          background: var(--sur-2);
          border-radius: 5px;
        }
        .dmt-scroll::-webkit-scrollbar-thumb {
          background: var(--bdr-2);
          border-radius: 5px;
        }
        .dmt-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-3);
        }
        .dmt-scroll::-webkit-scrollbar-corner {
          background: var(--sur-2);
        }
      `}</style>
    </DmtPageShell>
  );
}

function HeaderCell({
  col,
  width,
  dragging,
  dragOver,
  resizing,
  onDragStart,
  onDragOver,
  onDrop,
  onResizeStart
}: {
  col: Column;
  width: number;
  dragging: boolean;
  dragOver: boolean;
  resizing: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative flex items-center gap-1 border-r border-bdr px-2 py-2 ${
        dragging ? 'opacity-50' : ''
      } ${dragOver ? 'bg-blue-lt' : ''}`}
      style={{width}}
    >
      <GripVertical size={12} className="shrink-0 text-text-3 opacity-0 group-hover:opacity-100" />
      <span className="min-w-0 flex-1 truncate" title={col.label}>{col.label}</span>
      <span
        onMouseDown={onResizeStart}
        className={`absolute right-0 top-0 h-full w-[6px] cursor-col-resize ${resizing ? 'bg-blue' : 'hover:bg-blue-bd'}`}
      />
    </div>
  );
}

function Cell({
  col,
  row,
  pending,
  onPatch,
  onConvert,
  onUnlink
}: {
  col: ContactColumnKey;
  row: Contact;
  pending: boolean;
  onPatch: (patch: Partial<Contact>) => void;
  onConvert: () => void;
  onUnlink: () => void;
}) {
  if (col === 'id') return <ContactIdCell id={row.id} isLead={row.convertedToLeadId != null} />;
  if (col === 'createdBy') return <AuthorCell name={row.createdBy} />;
  if (col === 'updatedBy') return <AuthorCell name={row.updatedBy} />;
  if (col === 'createdAt') return <ReadCell mono>{fmtDate(row.createdAt)}</ReadCell>;
  if (col === 'updatedAt') return <ReadCell mono>{fmtDate(row.updatedAt)}</ReadCell>;
  if (col === 'source') {
    return (
      <div className="border-r border-bdr px-2 py-1.5">
        <select
          value={row.source}
          onChange={(e) => onPatch({source: e.target.value as ContactSource})}
          className="h-7 w-full rounded-[5px] border border-bdr bg-sur-2 px-2 text-[11.5px] text-text focus:border-blue focus:outline-none"
        >
          {CONTACT_SOURCE_ORDER.map((source) => (
            <option key={source} value={source}>{SOURCE_META[source].label}</option>
          ))}
        </select>
      </div>
    );
  }
  if (col === 'convertedTo') {
    return (
      <ContactLeadToggle row={row} pending={pending} onConvert={onConvert} onUnlink={onUnlink} />
    );
  }
  if (col === 'tags') return <TagsCell tags={row.tags} onChange={(tags) => onPatch({tags})} />;
  return (
    <EditableText
      key={`${row.id}:${col}:${String(row[col as EditableKey] ?? '')}`}
      value={String(row[col as EditableKey] ?? '')}
      placeholder="—"
      multiline={col === 'notes'}
      onCommit={(value) => onPatch({[col]: value} as Partial<Contact>)}
    />
  );
}

function ContactIdCell({id, isLead}: {id: string; isLead: boolean}) {
  return (
    <div className="relative h-full overflow-hidden border-r border-bdr">
      <div className="px-3 py-2 font-mono text-[11.5px] font-semibold text-navy">
        {id}
      </div>
      {isLead && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[14px] top-[6px] w-[56px] rotate-45 select-none bg-grn text-center font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-white shadow-[0_1px_0_0_var(--navy-2)]"
        >
          ლიდი
        </span>
      )}
    </div>
  );
}

function ContactLeadToggle({
  row,
  pending,
  onConvert,
  onUnlink
}: {
  row: Contact;
  pending: boolean;
  onConvert: () => void;
  onUnlink: () => void;
}) {
  const isLead = row.convertedToLeadId != null;
  const onToggle = () => {
    if (isLead) {
      if (!confirm('ამოვშალო ლიდი?')) return;
      onUnlink();
      return;
    }
    onConvert();
  };

  return (
    <div className="flex items-center gap-2 border-r border-bdr px-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={isLead}
        onClick={onToggle}
        disabled={pending}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-grn focus:ring-offset-2 ${
          isLead ? 'bg-grn' : 'bg-text-3/40'
        } ${pending ? 'cursor-wait opacity-60' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
            isLead ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
      <span className={`text-[11.5px] font-semibold ${isLead ? 'text-grn' : 'text-text-3'}`}>
        ლიდი
      </span>
    </div>
  );
}

function AuthorCell({name}: {name: string}) {
  const label = name || '—';
  return (
    <div className="flex items-center gap-2 border-r border-bdr px-3 py-2 text-text-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-lt text-[10px] font-bold text-blue">
        {label.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function ReadCell({children, mono}: {children: React.ReactNode; mono?: boolean}) {
  return (
    <div className={`border-r border-bdr px-3 py-2 text-text-2 ${mono ? 'font-mono text-[11px] text-text-3' : ''}`}>
      {children}
    </div>
  );
}

function EditableText({
  value,
  onCommit,
  placeholder,
  multiline
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);

  const commit = () => {
    if (local !== value) onCommit(local);
  };

  if (multiline) {
    return (
      <div className="border-r border-bdr px-2 py-1.5">
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          rows={1}
          placeholder={placeholder}
          className="h-7 w-full resize-none border-0 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3 focus:bg-sur"
        />
      </div>
    );
  }

  return (
    <div className="border-r border-bdr px-2 py-1.5">
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder={placeholder}
        className="h-7 w-full border-0 bg-transparent text-[12px] text-text outline-none placeholder:text-text-3 focus:bg-sur"
      />
    </div>
  );
}

const PRESET_TAGS = ['Manual', 'Import', 'Website', 'Referral', 'Event', 'VIP', 'Follow-up'];

function TagsCell({tags, onChange}: {tags: string[]; onChange: (next: string[]) => void}) {
  const [draft, setDraft] = useState('');
  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean || tags.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    onChange([...tags, clean]);
  };
  return (
    <div className="border-r border-bdr px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-bdr bg-sur-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-text-2">
            {tag}
            <button onClick={() => onChange(tags.filter((item) => item !== tag))} className="rounded-full p-0.5 hover:bg-red-lt hover:text-red">
              <X size={9} strokeWidth={3} />
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => {
            addTag(e.target.value);
            e.currentTarget.value = '';
          }}
          className="h-6 rounded-full border border-dashed border-bdr-2 bg-sur px-1.5 text-[10.5px] text-text-3 focus:border-blue focus:outline-none"
        >
          <option value="">+</option>
          {PRESET_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(draft);
              setDraft('');
            }
          }}
          placeholder="თეგი"
          className="h-6 w-16 border-0 bg-transparent text-[10.5px] text-text outline-none placeholder:text-text-3"
        />
      </div>
    </div>
  );
}

function AuditPanel({
  audit,
  onClose,
  onSelect
}: {
  audit: ContactAuditEntry[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="w-[360px] shrink-0 overflow-auto border-l border-bdr bg-sur p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-bold text-navy">Contacts audit</div>
        <button onClick={onClose} className="rounded p-1 text-text-3 hover:bg-sur-2">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {audit.length === 0 ? (
          <div className="text-[12px] text-text-3">Audit ცარიელია.</div>
        ) : audit.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.contactId)}
            className="block w-full rounded-md border border-bdr bg-sur-2 p-2 text-left text-[11.5px] hover:border-blue-bd hover:bg-blue-lt"
          >
            <div className="font-semibold text-navy">{entry.action} · {entry.contactLabel}</div>
            <div className="mt-0.5 text-text-3">{fmtDate(entry.at)} · {entry.by}</div>
            {entry.column && (
              <div className="mt-1 text-text-2">
                {entry.columnLabel ?? entry.column}: {entry.before ?? ''} → {entry.after ?? ''}
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

function valuesForColumn(row: Contact, key: ContactColumnKey): string[] {
  switch (key) {
    case 'id':
      return [row.id];
    case 'name':
      return [row.name];
    case 'company':
      return [row.company];
    case 'position':
      return [row.position];
    case 'phone':
      return [row.phone];
    case 'email':
      return [row.email];
    case 'tags':
      return row.tags;
    case 'source':
      return [row.source];
    case 'convertedTo':
      return [row.convertedToLeadId ? 'lead' : 'not-lead'];
    case 'notes':
      return [row.notes];
    case 'createdBy':
      return [row.createdBy];
    case 'createdAt':
      return [fmtDate(row.createdAt)];
    case 'updatedBy':
      return [row.updatedBy];
    case 'updatedAt':
      return [fmtDate(row.updatedAt)];
    default:
      return [];
  }
}

function displayForColumn(row: Contact, key: ContactColumnKey): string {
  if (key === 'convertedTo') return row.convertedToLeadId ? `ლიდი ${row.convertedToLeadId}` : 'არ არის ლიდი';
  if (key === 'source') return SOURCE_META[row.source]?.label ?? row.source;
  if (key === 'createdAt') return fmtDate(row.createdAt);
  if (key === 'updatedAt') return fmtDate(row.updatedAt);
  return valuesForColumn(row, key).join('; ');
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'blue' | 'grn'}) {
  const tone = accent === 'grn'
    ? 'text-grn'
    : accent === 'blue'
      ? 'text-blue'
      : 'text-navy';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur px-4 py-3 shadow-card">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
