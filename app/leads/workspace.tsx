'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {
  addCustomColumn,
  computedValue,
  createRow,
  createTab,
  deleteColumn,
  deleteManager,
  deleteRow,
  deleteTab,
  downloadFile,
  exportTabCsv,
  exportTabJson,
  FIXED_COLUMNS,
  followUpUrgency,
  loadManagers,
  loadTabs,
  renameColumn,
  renameTab,
  resetPassword,
  rowsFor,
  setCell,
  setManagerPermission,
  createManager,
  updateRow,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  type Column,
  type LeadRow,
  type LeadStatus,
  type LeadTab,
  type Manager,
  type Session
} from '@/lib/leads-store';
import {
  Plus,
  X,
  Trash2,
  Pencil,
  FileJson,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Shield,
  Key,
  Search,
  ChevronLeft,
  LogOut,
  Briefcase,
  Table as TableIcon,
  LayoutGrid,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell as RechartsCell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type Props = {
  session: Session;
  onLogout: () => void;
};

type View = 'table' | 'kanban' | 'dashboard';
type SortKey = 'order' | 'nextFollowUpAt' | 'dealSize';

export function LeadsWorkspace({session, onLogout}: Props) {
  const [tabs, setTabs] = useState<LeadTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [view, setView] = useState<View>('table');
  const [showManagers, setShowManagers] = useState(false);
  const [_, bump] = useState(0);
  const reload = () => bump((x) => x + 1);

  useEffect(() => {
    const t = loadTabs();
    setTabs(t);
    if (t[0] && !activeTabId) setActiveTabId(t[0].id);
  }, [activeTabId]);

  useEffect(() => {
    if (activeTabId) setRows(rowsFor(activeTabId));
  }, [activeTabId, _]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? null, [tabs, activeTabId]);
  const canEdit = session.role === 'admin' || managerCanAddRemove(session.username);

  const responsibleOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = r.values.responsible?.trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterResponsible && (r.values.responsible || '').trim() !== filterResponsible) return false;
      if (filterPriority !== 'all' && (r.values.priority || '') !== filterPriority) return false;
      if (!needle) return true;
      const hay = Object.values(r.values).join(' ').toLowerCase();
      return hay.includes(needle);
    });
    if (sortKey === 'nextFollowUpAt') {
      return [...out].sort((a, b) => {
        const av = a.values.nextFollowUpAt || '9999-12-31';
        const bv = b.values.nextFollowUpAt || '9999-12-31';
        return av.localeCompare(bv);
      });
    }
    if (sortKey === 'dealSize') {
      return [...out].sort((a, b) => {
        const av = parseFloat(a.values.dealSize || '0') || 0;
        const bv = parseFloat(b.values.dealSize || '0') || 0;
        return bv - av;
      });
    }
    return out;
  }, [rows, q, filterStatus, filterResponsible, filterPriority, sortKey]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <TopBar session={session} onLogout={onLogout} onToggleManagers={() => setShowManagers((v) => !v)} />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 md:px-6">
        {showManagers ? (
          <ManagersPanel session={session} onClose={() => setShowManagers(false)} onChange={reload} />
        ) : (
          <>
            <TabsBar
              tabs={tabs}
              activeId={activeTabId}
              canEdit={session.role === 'admin'}
              onSelect={setActiveTabId}
              onCreate={(name) => {
                const t = createTab(name);
                setTabs(loadTabs());
                setActiveTabId(t.id);
              }}
              onRename={(id, name) => {
                renameTab(id, name);
                setTabs(loadTabs());
              }}
              onDelete={(id) => {
                if (!confirm('წავშალო ტაბი და მისი ყველა ჩანაწერი?')) return;
                deleteTab(id);
                const fresh = loadTabs();
                setTabs(fresh);
                setActiveTabId(fresh[0]?.id ?? null);
              }}
            />

            {activeTab && (
              <>
                <ViewSwitcher view={view} setView={setView} />

                {view === 'table' && (
                  <>
                    <Toolbar
                      tab={activeTab}
                      canEdit={canEdit}
                      q={q}
                      setQ={setQ}
                      filterStatus={filterStatus}
                      setFilterStatus={setFilterStatus}
                      filterResponsible={filterResponsible}
                      setFilterResponsible={setFilterResponsible}
                      filterPriority={filterPriority}
                      setFilterPriority={setFilterPriority}
                      sortKey={sortKey}
                      setSortKey={setSortKey}
                      responsibleOptions={responsibleOptions}
                      onAddRow={() => {
                        createRow(activeTab.id, session.username);
                        reload();
                      }}
                      onAddColumn={(label) => {
                        addCustomColumn(activeTab.id, label);
                        setTabs(loadTabs());
                      }}
                      onExport={(fmt) => {
                        const safe = activeTab.name.replace(/[^a-z0-9_\-ა-ჰ]/gi, '_');
                        if (fmt === 'json')
                          downloadFile(`leads_${safe}.json`, exportTabJson(activeTab.id), 'application/json');
                        else downloadFile(`leads_${safe}.csv`, exportTabCsv(activeTab.id), 'text/csv;charset=utf-8');
                      }}
                    />
                    <LeadsTable
                      tab={activeTab}
                      rows={filtered}
                      totalRows={rows.length}
                      canEdit={canEdit}
                      onCellChange={(rowId, colKey, value) => {
                        setCell(rowId, colKey, value);
                        reload();
                      }}
                      onDeleteRow={(id) => {
                        if (!confirm('წავშალო ეს ჩანაწერი?')) return;
                        deleteRow(id);
                        reload();
                      }}
                      onRenameColumn={(key, label) => {
                        renameColumn(activeTab.id, key, label);
                        setTabs(loadTabs());
                      }}
                      onDeleteColumn={(key) => {
                        if (!confirm('წავშალო ეს სვეტი?')) return;
                        deleteColumn(activeTab.id, key);
                        setTabs(loadTabs());
                        reload();
                      }}
                    />
                  </>
                )}

                {view === 'kanban' && (
                  <KanbanBoard
                    rows={rows}
                    canEdit={canEdit}
                    onStageChange={(rowId, next) => {
                      setCell(rowId, 'status', next);
                      reload();
                    }}
                  />
                )}

                {view === 'dashboard' && <Dashboard rows={rows} />}
              </>
            )}
          </>
        )}
      </main>

      <TableStyle />
    </div>
  );
}

// ---- Top bar -------------------------------------------------------------

function TopBar({
  session,
  onLogout,
  onToggleManagers
}: {
  session: Session;
  onLogout: () => void;
  onToggleManagers: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-bdr bg-sur/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2 text-[11px] text-text-2 hover:border-blue hover:text-blue"
          >
            <ChevronLeft size={12} /> უკან
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-blue-bd bg-blue-lt text-blue">
              <Briefcase size={14} />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-3">
              Leads CRM
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-text-2 md:inline">
            {session.name}{' '}
            <span className="inline-flex items-center gap-0.5 rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] text-text-3">
              {session.role === 'admin' ? <ShieldCheck size={9} /> : <Shield size={9} />}
              {session.role}
            </span>
          </span>
          {session.role === 'admin' && (
            <button
              type="button"
              onClick={onToggleManagers}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11px] text-text-2 hover:border-blue hover:text-blue"
            >
              <Users size={12} /> მენეჯერები
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11px] text-text-2 hover:border-red-bd hover:text-red"
          >
            <LogOut size={12} /> გამოსვლა
          </button>
        </div>
      </div>
    </header>
  );
}

// ---- Tabs bar ------------------------------------------------------------

function TabsBar({
  tabs,
  activeId,
  canEdit,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: {
  tabs: LeadTab[];
  activeId: string | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-bdr">
      {tabs.map((t) => {
        const active = t.id === activeId;
        if (renameId === t.id) {
          return (
            <form
              key={t.id}
              onSubmit={(e) => {
                e.preventDefault();
                onRename(t.id, renameValue);
                setRenameId(null);
              }}
              className="flex h-9 items-center gap-1 border border-blue-bd bg-blue-lt px-2"
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  onRename(t.id, renameValue);
                  setRenameId(null);
                }}
                className="w-[140px] bg-transparent text-[12.5px] outline-none"
              />
            </form>
          );
        }
        return (
          <div key={t.id} className="group relative flex items-stretch">
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              onDoubleClick={() => {
                if (!canEdit) return;
                setRenameId(t.id);
                setRenameValue(t.name);
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'border-bdr bg-sur text-navy -mb-[1px]'
                  : 'border-transparent text-text-3 hover:text-navy'
              }`}
            >
              {t.name}
            </button>
            {canEdit && active && tabs.length > 1 && (
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                title="ტაბის წაშლა"
                className="absolute right-0 top-0 hidden h-4 w-4 items-center justify-center rounded-full bg-red text-white group-hover:flex"
              >
                <X size={9} />
              </button>
            )}
          </div>
        );
      })}

      {canEdit && (
        creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) onCreate(newName);
              setNewName('');
              setCreating(false);
            }}
            className="flex h-9 items-center gap-1 border border-blue-bd bg-blue-lt px-2"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                if (newName.trim()) onCreate(newName);
                setNewName('');
                setCreating(false);
              }}
              placeholder="ახალი ტაბის სახელი"
              className="w-[160px] bg-transparent text-[12.5px] outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1 rounded-t-md px-2 text-[12px] text-text-3 hover:text-blue"
          >
            <Plus size={13} /> ტაბი
          </button>
        )
      )}
    </div>
  );
}

// ---- Toolbar -------------------------------------------------------------

function ViewSwitcher({view, setView}: {view: View; setView: (v: View) => void}) {
  const items: {key: View; label: string; icon: React.ReactNode}[] = [
    {key: 'table', label: 'Table', icon: <TableIcon size={12} />},
    {key: 'kanban', label: 'Pipeline', icon: <LayoutGrid size={12} />},
    {key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={12} />}
  ];
  return (
    <div className="mb-2 inline-flex rounded-md border border-bdr bg-sur p-0.5">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          onClick={() => setView(i.key)}
          className={`inline-flex h-7 items-center gap-1.5 rounded px-3 text-[11.5px] font-semibold transition-colors ${
            view === i.key ? 'bg-blue text-white' : 'text-text-2 hover:text-blue'
          }`}
        >
          {i.icon}
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Toolbar({
  tab,
  canEdit,
  q,
  setQ,
  filterStatus,
  setFilterStatus,
  filterResponsible,
  setFilterResponsible,
  filterPriority,
  setFilterPriority,
  sortKey,
  setSortKey,
  responsibleOptions,
  onAddRow,
  onAddColumn,
  onExport
}: {
  tab: LeadTab;
  canEdit: boolean;
  q: string;
  setQ: (v: string) => void;
  filterStatus: LeadStatus | 'all';
  setFilterStatus: (s: LeadStatus | 'all') => void;
  filterResponsible: string;
  setFilterResponsible: (v: string) => void;
  filterPriority: 'all' | 'high' | 'medium' | 'low';
  setFilterPriority: (v: 'all' | 'high' | 'medium' | 'low') => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  responsibleOptions: string[];
  onAddRow: () => void;
  onAddColumn: (label: string) => void;
  onExport: (fmt: 'json' | 'csv') => void;
}) {
  const [addingCol, setAddingCol] = useState(false);
  const [colLabel, setColLabel] = useState('');
  void tab;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-t-[6px] border border-bdr bg-sur px-3 py-2">
      <div className="flex h-8 min-w-[200px] flex-1 items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-2">
        <Search size={13} className="text-text-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძიება ცხრილში…"
          className="flex-1 bg-transparent text-[12.5px] outline-none"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
        className="h-8 rounded-md border border-bdr bg-sur px-2 text-[12px]"
      >
        <option value="all">All stages</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        value={filterResponsible}
        onChange={(e) => setFilterResponsible(e.target.value)}
        className="h-8 rounded-md border border-bdr bg-sur px-2 text-[12px]"
      >
        <option value="">All responsible</option>
        {responsibleOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        value={filterPriority}
        onChange={(e) => setFilterPriority(e.target.value as 'all' | 'high' | 'medium' | 'low')}
        className="h-8 rounded-md border border-bdr bg-sur px-2 text-[12px]"
      >
        <option value="all">All priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value as SortKey)}
        className="h-8 rounded-md border border-bdr bg-sur px-2 text-[12px]"
        title="Sort"
      >
        <option value="order">Sort: default</option>
        <option value="nextFollowUpAt">Sort: Next Follow-up</option>
        <option value="dealSize">Sort: Deal Size ↓</option>
      </select>

      <div className="mx-1 h-5 w-px bg-bdr" />

      {canEdit && (
        <>
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-blue px-2.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={12} /> ჩანაწერი
          </button>
          {addingCol ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (colLabel.trim()) onAddColumn(colLabel);
                setColLabel('');
                setAddingCol(false);
              }}
              className="flex h-8 items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2"
            >
              <input
                autoFocus
                value={colLabel}
                onChange={(e) => setColLabel(e.target.value)}
                onBlur={() => {
                  if (colLabel.trim()) onAddColumn(colLabel);
                  setColLabel('');
                  setAddingCol(false);
                }}
                placeholder="ახალი სვეტი"
                className="w-[140px] bg-transparent text-[12.5px] outline-none"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCol(true)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[12px] text-text-2 hover:border-blue hover:text-blue"
            >
              <Plus size={12} /> სვეტი
            </button>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => onExport('csv')}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11.5px] text-text-2 hover:border-blue hover:text-blue"
        >
          <FileSpreadsheet size={12} /> CSV
        </button>
        <button
          type="button"
          onClick={() => onExport('json')}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11.5px] text-text-2 hover:border-blue hover:text-blue"
        >
          <FileJson size={12} /> JSON
        </button>
      </div>
    </div>
  );
}

// ---- Table ---------------------------------------------------------------

function LeadsTable({
  tab,
  rows,
  totalRows,
  canEdit,
  onCellChange,
  onDeleteRow,
  onRenameColumn,
  onDeleteColumn
}: {
  tab: LeadTab;
  rows: LeadRow[];
  totalRows: number;
  canEdit: boolean;
  onCellChange: (rowId: string, colKey: string, value: string) => void;
  onDeleteRow: (id: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onDeleteColumn: (key: string) => void;
}) {
  return (
    <div className="rounded-b-[6px] border border-t-0 border-bdr bg-sur">
      <div className="border-b border-bdr bg-sur-2 px-3 py-1.5 font-mono text-[10px] text-text-3">
        ჩანაწერი: <span className="font-semibold">{rows.length}</span> / {totalRows}
      </div>

      <div className="overflow-auto">
        <table className="leads-table">
          <thead>
            <tr>
              {tab.columns.map((c) => (
                <HeaderCell
                  key={c.key}
                  column={c}
                  canEdit={canEdit}
                  onRename={(label) => onRenameColumn(c.key, label)}
                  onDelete={() => onDeleteColumn(c.key)}
                />
              ))}
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tab.columns.length + (canEdit ? 1 : 0)}
                  className="py-10 text-center text-[12px] text-text-3"
                >
                  {totalRows === 0 ? 'დაამატე პირველი ჩანაწერი ღილაკით „ჩანაწერი"' : 'ფილტრს არ შეესაბამება'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  {tab.columns.map((c) => (
                    <Cell
                      key={c.key}
                      column={c}
                      row={r}
                      canEdit={canEdit}
                      onChange={(v) => onCellChange(r.id, c.key, v)}
                    />
                  ))}
                  {canEdit && (
                    <td className="leads-cell leads-cell--action">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(r.id)}
                        title="რიგის წაშლა"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-text-3 hover:text-red"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({
  column,
  canEdit,
  onRename,
  onDelete
}: {
  column: Column;
  canEdit: boolean;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(column.label);

  const canEditLabel = canEdit && !column.fixed;

  return (
    <th style={{minWidth: column.width ?? 160}} className="leads-header">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            onRename(value);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRename(value);
              setEditing(false);
            }
            if (e.key === 'Escape') {
              setValue(column.label);
              setEditing(false);
            }
          }}
          className="h-5 w-full bg-transparent text-[10px] font-semibold uppercase tracking-wider outline-none"
        />
      ) : (
        <span className="inline-flex items-center gap-1">
          {column.label}
          {column.fixed && (
            <span className="font-mono text-[8px] text-text-3" title="ფიქსირებული სვეტი">
              fx
            </span>
          )}
          {canEditLabel && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-text-3 opacity-0 hover:text-blue group-hover:opacity-100"
              >
                <Pencil size={10} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-text-3 opacity-0 hover:text-red group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </>
          )}
        </span>
      )}
    </th>
  );
}

function Cell({
  column,
  row,
  canEdit,
  onChange
}: {
  column: Column;
  row: LeadRow;
  canEdit: boolean;
  onChange: (v: string) => void;
}) {
  if (column.key === 'status' || column.type === 'status') {
    return (
      <td className="leads-cell">
        {canEdit ? (
          <select
            value={row.status}
            onChange={(e) => onChange(e.target.value)}
            className={`h-6 w-full rounded-full border px-1.5 text-[10px] font-semibold outline-none ${STATUS_STYLES[row.status]}`}
          >
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        ) : (
          <span className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold ${STATUS_STYLES[row.status]}`}>
            {STATUS_LABELS[row.status]}
          </span>
        )}
      </td>
    );
  }

  const value = row.values[column.key] ?? '';

  if (column.type === 'priority') {
    type PriorityKey = 'high' | 'medium' | 'low';
    const isPriority = (v: string): v is PriorityKey =>
      v === 'high' || v === 'medium' || v === 'low';
    const p: PriorityKey | null = isPriority(value) ? value : null;
    return (
      <td className="leads-cell">
        {canEdit ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`h-6 w-full rounded-full border px-1.5 text-[10px] font-semibold outline-none ${
              p ? PRIORITY_STYLES[p] : 'border-bdr bg-sur text-text-3'
            }`}
          >
            <option value="">—</option>
            <option value="high">{PRIORITY_LABELS.high}</option>
            <option value="medium">{PRIORITY_LABELS.medium}</option>
            <option value="low">{PRIORITY_LABELS.low}</option>
          </select>
        ) : p ? (
          <span className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold ${PRIORITY_STYLES[p]}`}>
            {PRIORITY_LABELS[p]}
          </span>
        ) : (
          <span className="text-text-3">—</span>
        )}
      </td>
    );
  }

  if (column.type === 'date') {
    const urgency = column.key === 'nextFollowUpAt' ? followUpUrgency(value) : null;
    const urgencyCls =
      urgency === 'overdue'
        ? 'text-red font-semibold'
        : urgency === 'today'
        ? 'text-ora font-semibold'
        : '';
    return (
      <td className="leads-cell">
        {canEdit ? (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`h-6 w-full bg-transparent font-mono text-[11px] outline-none ${urgencyCls}`}
          />
        ) : (
          <span className={`font-mono text-[11px] ${urgencyCls}`}>
            {value || <span className="text-text-3">—</span>}
          </span>
        )}
      </td>
    );
  }

  if (column.type === 'computed') {
    const v = computedValue(column.key, row);
    if (column.key === 'monthlySavings' && v) {
      return (
        <td className="leads-cell">
          <span className="font-mono text-[11.5px] text-grn">₾ {Number(v).toLocaleString('en-US')}</span>
        </td>
      );
    }
    if (column.key === 'roiMonths' && v) {
      return (
        <td className="leads-cell">
          <span className="font-mono text-[11.5px] text-blue">{v} mo</span>
        </td>
      );
    }
    return (
      <td className="leads-cell">
        <span className="text-text-3">—</span>
      </td>
    );
  }

  if (column.type === 'number') {
    return (
      <td className="leads-cell">
        <EditableCell
          value={value}
          column={column}
          canEdit={canEdit}
          onCommit={onChange}
        />
      </td>
    );
  }

  if (column.type === 'money') {
    return (
      <td className="leads-cell">
        <EditableCell
          value={value}
          column={column}
          canEdit={canEdit}
          onCommit={onChange}
        />
      </td>
    );
  }

  return (
    <td className="leads-cell">
      <EditableCell
        value={value}
        column={column}
        canEdit={canEdit}
        onCommit={onChange}
      />
    </td>
  );
}

function EditableCell({
  value,
  column,
  canEdit,
  onCommit
}: {
  value: string;
  column: Column;
  canEdit: boolean;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (!canEdit) {
    return <DisplayCell column={column} value={value} />;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="h-full w-full text-left"
      >
        <DisplayCell column={column} value={value} empty={!value} />
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        onCommit(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onCommit(draft);
          setEditing(false);
        }
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-6 w-full bg-transparent text-[12px] outline-none"
    />
  );
}

function DisplayCell({column, value, empty}: {column: Column; value: string; empty?: boolean}) {
  if (!value) return <span className="text-text-3">{empty ? '—' : ''}</span>;
  if (column.type === 'url' && value.startsWith('http')) {
    return (
      <a href={value} target="_blank" rel="noopener" className="text-blue hover:underline">
        {value.replace(/^https?:\/\//, '').slice(0, 40)}
      </a>
    );
  }
  if (column.type === 'email' && value.includes('@')) {
    return (
      <a href={`mailto:${value}`} className="text-blue hover:underline">
        {value}
      </a>
    );
  }
  if (column.type === 'phone') {
    return <span className="font-mono text-[11.5px]">{value}</span>;
  }
  if (column.type === 'money') {
    const num = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(num) && num > 0) {
      return (
        <span className="font-mono text-[11.5px]">
          ₾ {num.toLocaleString('en-US')}
        </span>
      );
    }
    return <span className="font-mono text-[11.5px]">{value}</span>;
  }
  return <span>{value}</span>;
}

// ---- Managers panel ------------------------------------------------------

function managerCanAddRemove(username: string): boolean {
  const m = loadManagers().find((x) => x.username === username);
  return m?.canAddRemove ?? false;
}

function ManagersPanel({
  session,
  onClose,
  onChange
}: {
  session: Session;
  onClose: () => void;
  onChange: () => void;
}) {
  const [managers, setManagers] = useState<Manager[]>(loadManagers());
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [canAddRemove, setCanAddRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState('');

  const refresh = () => setManagers(loadManagers());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createManager({username, name, password, role: 'manager', canAddRemove});
    if ('error' in result) {
      setError(
        result.error === 'username_taken'
          ? 'მომხმარებელი უკვე არსებობს'
          : result.error === 'short_password'
          ? 'პაროლი მინიმუმ 4 სიმბოლო'
          : 'არასწორი მონაცემები'
      );
      return;
    }
    setUsername('');
    setName('');
    setPassword('');
    setCanAddRemove(false);
    refresh();
    onChange();
  }

  async function doReset(username: string) {
    if (!resetValue) return;
    const ok = await resetPassword(username, resetValue);
    if (ok) {
      alert('პაროლი განახლდა');
      setResetFor(null);
      setResetValue('');
    } else {
      alert('პაროლი მინიმუმ 4 სიმბოლო');
    }
  }

  function remove(username: string) {
    if (username === session.username) {
      alert('საკუთარი ანგარიშის წაშლა შეუძლებელია');
      return;
    }
    if (!confirm(`წავშალო მენეჯერი ${username}?`)) return;
    deleteManager(username);
    refresh();
  }

  function togglePerm(username: string, next: boolean) {
    setManagerPermission(username, next);
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-navy">მენეჯერები</h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            მხოლოდ admin-ს შეუძლია დაამატოს/წაშალოს და აღადგინოს პაროლი.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11px] text-text-2 hover:border-blue hover:text-blue"
        >
          <ChevronLeft size={12} /> უკან ცხრილზე
        </button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-bdr bg-sur">
        <div className="border-b border-bdr bg-sur-2 px-4 py-2 text-[12px] font-semibold text-navy">
          ახალი მენეჯერი
        </div>
        <form onSubmit={add} className="grid gap-3 p-4 md:grid-cols-4">
          <Input label="მომხმარებელი" value={username} onChange={setUsername} placeholder="user_name" />
          <Input label="სახელი, გვარი" value={name} onChange={setName} placeholder="გიორგი მერებაშვილი" />
          <Input label="პაროლი (4+)" value={password} onChange={setPassword} type="password" />
          <label className="flex items-end gap-2 pb-1 text-[12px] text-text-2">
            <input
              type="checkbox"
              checked={canAddRemove}
              onChange={(e) => setCanAddRemove(e.target.checked)}
              className="h-4 w-4 accent-blue"
            />
            დაამატოს/წაშალოს ჩანაწერები
          </label>
          {error && (
            <p className="col-span-full rounded border border-red-bd bg-red-lt px-2.5 py-1.5 text-[12px] text-red">
              {error}
            </p>
          )}
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3.5 text-[12.5px] font-semibold text-white hover:bg-navy-2"
            >
              <Plus size={13} /> დამატება
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[var(--radius-card)] border border-bdr bg-sur">
        <div className="border-b border-bdr bg-sur-2 px-4 py-2 text-[12px] font-semibold text-navy">
          აქტიური მენეჯერები ({managers.length})
        </div>
        <table className="w-full text-[12.5px]">
          <thead className="bg-sur-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
            <tr>
              <th className="px-3 py-2 text-left">სახელი</th>
              <th className="px-3 py-2 text-left">მომხმარებელი</th>
              <th className="px-3 py-2 text-left">როლი</th>
              <th className="px-3 py-2 text-left">უფლება</th>
              <th className="px-3 py-2 text-left">შექმნა</th>
              <th className="px-3 py-2 text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m.username} className="border-t border-bdr">
                <td className="px-3 py-2 font-semibold text-navy">{m.name}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-text-2">{m.username}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-[1px] font-mono text-[9px] font-semibold ${
                      m.role === 'admin'
                        ? 'border-ora-bd bg-ora-lt text-ora'
                        : 'border-bdr bg-sur-2 text-text-2'
                    }`}
                  >
                    {m.role === 'admin' ? <ShieldCheck size={9} /> : <Shield size={9} />}
                    {m.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {m.role === 'admin' ? (
                    <span className="text-[11px] text-text-3">სრული</span>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-text-2">
                      <input
                        type="checkbox"
                        checked={m.canAddRemove}
                        onChange={(e) => togglePerm(m.username, e.target.checked)}
                        className="h-3.5 w-3.5 accent-blue"
                      />
                      ჩანაწერები
                    </label>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                  {new Date(m.createdAt).toLocaleDateString('ka-GE')}
                </td>
                <td className="px-3 py-2 text-right">
                  {resetFor === m.username ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        autoFocus
                        type="password"
                        value={resetValue}
                        onChange={(e) => setResetValue(e.target.value)}
                        placeholder="ახალი პაროლი"
                        className="h-7 w-[140px] rounded border border-bdr bg-sur px-2 text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => doReset(m.username)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-blue px-2 text-[11px] font-semibold text-white"
                      >
                        დადასტურება
                      </button>
                      <button
                        type="button"
                        onClick={() => {setResetFor(null); setResetValue('');}}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur px-2 text-[11px] text-text-3"
                      >
                        უარი
                      </button>
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setResetFor(m.username)}
                        title="პაროლის აღდგენა"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur px-2 text-[11px] text-text-2 hover:border-blue hover:text-blue"
                      >
                        <Key size={11} /> პაროლი
                      </button>
                      {m.username !== session.username && (
                        <button
                          type="button"
                          onClick={() => remove(m.username)}
                          title="წაშლა"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur text-text-3 hover:border-red-bd hover:text-red"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
        {label}
      </span>
      <input
        className="h-9 w-full rounded border border-bdr bg-sur px-2.5 text-[12.5px] outline-none focus:border-blue"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
      />
    </label>
  );
}

// ---- Kanban view ---------------------------------------------------------

function KanbanBoard({
  rows,
  canEdit,
  onStageChange
}: {
  rows: LeadRow[];
  canEdit: boolean;
  onStageChange: (rowId: string, next: LeadStatus) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<LeadStatus | null>(null);

  const byStage = useMemo(() => {
    const m = new Map<LeadStatus, LeadRow[]>();
    STATUS_ORDER.forEach((s) => m.set(s, []));
    rows.forEach((r) => {
      const arr = m.get(r.status) ?? [];
      arr.push(r);
      m.set(r.status, arr);
    });
    return m;
  }, [rows]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {STATUS_ORDER.map((stage) => {
        const items = byStage.get(stage) ?? [];
        const isHover = hoverStage === stage;
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              if (!canEdit || !draggedId) return;
              e.preventDefault();
              setHoverStage(stage);
            }}
            onDragLeave={() => setHoverStage(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (!canEdit || !draggedId) return;
              onStageChange(draggedId, stage);
              setDraggedId(null);
              setHoverStage(null);
            }}
            className={`flex w-[260px] shrink-0 flex-col rounded-[6px] border bg-sur-2 ${
              isHover ? 'border-blue ring-2 ring-blue/20' : 'border-bdr'
            }`}
          >
            <div className={`flex items-center justify-between border-b border-bdr px-3 py-2 ${STATUS_STYLES[stage]}`}>
              <span className="text-[11px] font-bold uppercase tracking-wide">{STATUS_LABELS[stage]}</span>
              <span className="font-mono text-[10px]">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{minHeight: 100, maxHeight: '70vh'}}>
              {items.length === 0 ? (
                <span className="py-2 text-center font-mono text-[10px] text-text-3">—</span>
              ) : (
                items.map((r) => <KanbanCard key={r.id} row={r} canEdit={canEdit} onDragStart={() => setDraggedId(r.id)} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({row, canEdit, onDragStart}: {row: LeadRow; canEdit: boolean; onDragStart: () => void}) {
  const company = row.values.company || '(no company)';
  const contact = row.values.name || '';
  const deal = parseFloat(row.values.dealSize || '0') || 0;
  const priority = row.values.priority as 'high' | 'medium' | 'low' | undefined;
  const urgency = followUpUrgency(row.values.nextFollowUpAt);

  return (
    <div
      draggable={canEdit}
      onDragStart={onDragStart}
      className={`rounded-[5px] border border-bdr bg-sur p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : ''
      } hover:border-blue`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-navy">{company}</p>
          {contact && <p className="truncate text-[11px] text-text-2">{contact}</p>}
        </div>
        {priority && (
          <span className={`shrink-0 rounded-full border px-1.5 py-[1px] font-mono text-[9px] font-semibold ${PRIORITY_STYLES[priority]}`}>
            {PRIORITY_LABELS[priority][0]}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 font-mono text-[10px] text-text-3">
        {deal > 0 ? (
          <span className="text-text-2">₾ {deal.toLocaleString('en-US')}</span>
        ) : (
          <span>—</span>
        )}
        {row.values.nextFollowUpAt && (
          <span
            className={`inline-flex items-center gap-0.5 ${
              urgency === 'overdue'
                ? 'text-red font-semibold'
                : urgency === 'today'
                ? 'text-ora font-semibold'
                : ''
            }`}
          >
            <Calendar size={9} />
            {row.values.nextFollowUpAt.slice(5)}
          </span>
        )}
      </div>
      {row.values.responsible && (
        <p className="mt-1 truncate text-[10px] text-text-3">👤 {row.values.responsible}</p>
      )}
    </div>
  );
}

// ---- Dashboard view ------------------------------------------------------

function Dashboard({rows}: {rows: LeadRow[]}) {
  const stats = useMemo(() => {
    const nonLost = rows.filter((r) => r.status !== 'lost');
    const totalPipeline = nonLost.reduce(
      (sum, r) => sum + (parseFloat(r.values.dealSize || '0') || 0),
      0
    );
    const won = rows.filter((r) => r.status === 'won');
    const wonValue = won.reduce((s, r) => s + (parseFloat(r.values.dealSize || '0') || 0), 0);
    const avgDeal = nonLost.length > 0 ? totalPipeline / nonLost.length : 0;

    const total = rows.length;
    const qualified = rows.filter((r) =>
      ['qualified', 'meeting', 'pilot', 'proposal', 'negotiation', 'won'].includes(r.status)
    ).length;
    const proposal = rows.filter((r) => ['proposal', 'negotiation', 'won'].includes(r.status)).length;
    const conv = {
      leadToQualified: total > 0 ? (qualified / total) * 100 : 0,
      qualifiedToProposal: qualified > 0 ? (proposal / qualified) * 100 : 0,
      proposalToWon: proposal > 0 ? (won.length / proposal) * 100 : 0
    };

    const byStage = STATUS_ORDER.map((s) => ({
      stage: STATUS_LABELS[s],
      count: rows.filter((r) => r.status === s).length,
      color:
        s === 'won' ? '#0f6e3a' : s === 'lost' ? '#c0201a' : s === 'negotiation' ? '#c05010' : '#1f6fd4'
    }));

    const sourceMap = new Map<string, number>();
    rows.forEach((r) => {
      const src = (r.values.leadSource || 'Unknown').trim() || 'Unknown';
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    });
    const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({source, count}));

    const overdue = rows.filter((r) => followUpUrgency(r.values.nextFollowUpAt) === 'overdue').length;

    return {totalPipeline, wonValue, avgDeal, conv, byStage, bySource, won: won.length, overdue, total};
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-[6px] border border-bdr bg-sur p-10 text-center">
        <BarChart3 size={32} className="mx-auto mb-2 text-text-3" />
        <p className="text-[13px] text-text-2">დაამატე ჯერ ჩანაწერი Table view-ში.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<DollarSign size={13} />} label="Pipeline Value" value={`₾ ${stats.totalPipeline.toLocaleString('en-US')}`} />
        <Kpi icon={<TrendingUp size={13} />} label="Won Revenue" value={`₾ ${stats.wonValue.toLocaleString('en-US')}`} accent="grn" />
        <Kpi icon={<Target size={13} />} label="Avg Deal Size" value={`₾ ${Math.round(stats.avgDeal).toLocaleString('en-US')}`} />
        <Kpi
          icon={<AlertTriangle size={13} />}
          label="Overdue Follow-ups"
          value={stats.overdue}
          accent={stats.overdue > 0 ? 'red' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ConversionCard label="Lead → Qualified" pct={stats.conv.leadToQualified} />
        <ConversionCard label="Qualified → Proposal" pct={stats.conv.qualifiedToProposal} />
        <ConversionCard label="Proposal → Won" pct={stats.conv.proposalToWon} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[6px] border border-bdr bg-sur p-3">
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
            Leads by Stage
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byStage} margin={{top: 5, right: 5, bottom: 0, left: -20}}>
              <CartesianGrid stroke="#dde6f2" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="stage" tick={{fontSize: 9, fill: '#7a96b8'}} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{fontSize: 10, fill: '#7a96b8'}} />
              <Tooltip contentStyle={{fontSize: 11, borderRadius: 6}} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {stats.byStage.map((d, i) => (
                  <RechartsCell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[6px] border border-bdr bg-sur p-3">
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
            Leads by Source
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.bySource} layout="vertical" margin={{top: 5, right: 10, bottom: 0, left: 20}}>
              <CartesianGrid stroke="#dde6f2" strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{fontSize: 10, fill: '#7a96b8'}} />
              <YAxis dataKey="source" type="category" tick={{fontSize: 10, fill: '#7a96b8'}} width={90} />
              <Tooltip contentStyle={{fontSize: 11, borderRadius: 6}} />
              <Bar dataKey="count" fill="#1a3a6b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: 'grn' | 'ora' | 'red' | 'blue';
}) {
  const tint =
    accent === 'grn'
      ? 'text-grn'
      : accent === 'ora'
      ? 'text-ora'
      : accent === 'red'
      ? 'text-red'
      : accent === 'blue'
      ? 'text-blue'
      : 'text-navy';
  return (
    <div className="rounded-[6px] border border-bdr bg-sur p-3">
      <div className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        <span className="text-text-2">{icon}</span>
        {label}
      </div>
      <div className={`mt-1 font-mono text-[18px] font-bold ${tint}`}>{value}</div>
    </div>
  );
}

function ConversionCard({label, pct}: {label: string; pct: number}) {
  const pctInt = Math.round(pct);
  return (
    <div className="rounded-[6px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        <span>{label}</span>
        <span className="text-blue">{pctInt}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sur-2">
        <div
          className="h-full rounded-full bg-blue transition-all"
          style={{width: `${Math.min(pctInt, 100)}%`}}
        />
      </div>
    </div>
  );
}

function TableStyle() {
  return (
    <style jsx global>{`
      .leads-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 12.5px;
      }
      .leads-table thead tr {
        background: var(--sur-2);
      }
      .leads-table .leads-header {
        position: sticky;
        top: 0;
        z-index: 5;
        background: var(--sur-2);
        border-bottom: 1px solid var(--bdr-2);
        padding: 8px 10px;
        text-align: left;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-3);
        white-space: nowrap;
      }
      .leads-table .leads-header:hover {
        background: var(--sur);
      }
      .leads-table tbody tr {
        transition: background-color 0.1s;
      }
      .leads-table tbody tr:hover {
        background: color-mix(in srgb, var(--blue) 4%, var(--sur));
      }
      .leads-cell {
        border-bottom: 1px solid var(--bdr);
        border-right: 1px solid var(--bdr);
        padding: 6px 10px;
        min-height: 32px;
        vertical-align: middle;
      }
      .leads-cell--action {
        border-right: 0;
        width: 40px;
        text-align: center;
      }
      .leads-cell input,
      .leads-cell select {
        padding: 0;
        border: 0;
        background: transparent;
      }
    `}</style>
  );
}
