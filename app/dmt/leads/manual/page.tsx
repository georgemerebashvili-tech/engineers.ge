'use client';

import {useEffect, useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import Link from 'next/link';
import {
  Building2,
  User,
  Phone,
  DollarSign,
  Star,
  Shuffle,
  UserCog,
  Calendar,
  UserRound,
  Clock,
  ChevronDown,
  Plus,
  Trash2,
  Type,
  Hash,
  List,
  X,
  Palette,
  Columns3,
  Download
} from 'lucide-react';
import {COLOR_STYLES, loadSets, type VarSet} from '@/lib/dmt/variables';

type Status = 'ახალი' | 'მოლაპარაკების პროცესი' | 'შეთავაზება გაცემული' | 'დახურული-მოგება' | 'დახურული-დაკარგვა';
type Role = 'End user' | 'Consultant' | 'Contractor' | 'Designer' | 'Supplier';

type Row = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  contract: number | null;
  status: Status;
  role: Role | '';
  owner: string;
  period: string;
  editedBy: string;
  editedAt: string;
  createdBy: string;
};

const STATUS_ORDER: Status[] = [
  'ახალი',
  'მოლაპარაკების პროცესი',
  'შეთავაზება გაცემული',
  'დახურული-მოგება',
  'დახურული-დაკარგვა'
];

const STATUS_META: Record<Status, {color: string; bg: string; border: string}> = {
  'ახალი':                  {color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  'მოლაპარაკების პროცესი':  {color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  'შეთავაზება გაცემული':    {color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  'დახურული-მოგება':        {color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  'დახურული-დაკარგვა':      {color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
};

const STORE_KEY = 'dmt_manual_leads_v2';
const EXTRA_COLS_KEY = 'dmt_manual_extra_cols_v1';
const EXTRA_VALS_KEY = 'dmt_manual_extra_vals_v1';
const COL_WIDTHS_KEY = 'dmt_manual_col_widths_v1';

// ~10 characters at the grid font — minimum width when user dbl-clicks resize handle
const MIN_COL_WIDTH = 90;
const MAX_COL_WIDTH = 640;

type ExtraKind = 'text' | 'number' | 'select';

type ExtraCol = {
  key: string;
  label: string;
  kind: ExtraKind;
  width: number;
  varSetId?: string;
};

type ExtraVals = Record<string, Record<string, string>>;

const COLS: Array<{
  key: keyof Row;
  label: string;
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  width: number;
  align?: 'right';
  kind?: 'text' | 'number' | 'status' | 'role' | 'date' | 'author';
}> = [
  {key: 'company',  label: 'კომპ. დასახ.', icon: Building2, width: 180},
  {key: 'contact',  label: 'საკონტაქტო',   icon: User,      width: 150},
  {key: 'phone',    label: 'ტელეფონი',     icon: Phone,     width: 150},
  {key: 'contract', label: 'კონტრ. ღირებ.', icon: DollarSign, width: 120, align: 'right', kind: 'number'},
  {key: 'status',   label: 'სტატუსი',      icon: Star,      width: 180, kind: 'status'},
  {key: 'role',     label: 'როლი',         icon: Shuffle,   width: 120, kind: 'role'},
  {key: 'owner',    label: 'პრ. მენ.',     icon: UserCog,   width: 110},
  {key: 'period',   label: 'პერიოდი',      icon: Calendar,  width: 100},
  {key: 'editedBy', label: 'ბოლო რედაქტ.', icon: UserRound, width: 140, kind: 'author'},
  {key: 'editedAt', label: 'ბოლო დრო',     icon: Clock,     width: 150, kind: 'date'},
  {key: 'createdBy',label: 'ჩანაწ. ავტ.',  icon: UserRound, width: 140, kind: 'author'}
];

export default function ManualLeadsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<Status, boolean>>({} as Record<Status, boolean>);
  const [extraCols, setExtraCols] = useState<ExtraCol[]>([]);
  const [extraVals, setExtraVals] = useState<ExtraVals>({});
  const [varSets, setVarSets] = useState<VarSet[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizingKey, setResizingKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setRows(JSON.parse(raw));
      const ec = localStorage.getItem(EXTRA_COLS_KEY);
      if (ec) setExtraCols(JSON.parse(ec));
      const ev = localStorage.getItem(EXTRA_VALS_KEY);
      if (ev) setExtraVals(JSON.parse(ev));
      const cw = localStorage.getItem(COL_WIDTHS_KEY);
      if (cw) setColWidths(JSON.parse(cw));
      setVarSets(loadSets());
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(rows));
      localStorage.setItem(EXTRA_COLS_KEY, JSON.stringify(extraCols));
      localStorage.setItem(EXTRA_VALS_KEY, JSON.stringify(extraVals));
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidths));
    } catch {}
  }, [rows, extraCols, extraVals, colWidths, hydrated]);

  const widthOf = (key: string, fallback: number) => colWidths[key] ?? fallback;

  const startResize = (key: string, startWidth: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingKey(key);
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, startWidth + delta));
      setColWidths((prev) => ({...prev, [key]: next}));
    };
    const onUp = () => {
      setResizingKey(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const shrinkCol = (key: string) => () => {
    setColWidths((prev) => ({...prev, [key]: MIN_COL_WIDTH}));
  };

  const addExtraCol = (col: Omit<ExtraCol, 'key'>) => {
    const key = 'x_' + Date.now().toString(36);
    setExtraCols((prev) => [...prev, {...col, key}]);
  };

  const removeExtraCol = (key: string) => {
    if (!confirm('column წავშალო? მონაცემები დაიკარგება.')) return;
    setExtraCols((prev) => prev.filter((c) => c.key !== key));
    setExtraVals((prev) => {
      const next: ExtraVals = {};
      for (const [rid, m] of Object.entries(prev)) {
        const {[key]: _removed, ...rest} = m;
        next[rid] = rest;
      }
      return next;
    });
  };

  const setExtraVal = (rowId: string, colKey: string, value: string) => {
    setExtraVals((prev) => ({
      ...prev,
      [rowId]: {...(prev[rowId] || {}), [colKey]: value}
    }));
  };

  const resolvedColWidth = (c: (typeof COLS)[number]) => widthOf(c.key as string, c.width);
  const resolvedExtraWidth = (c: ExtraCol) => widthOf(c.key, c.width);
  const extraWidth = extraCols.reduce((s, c) => s + resolvedExtraWidth(c), 0);
  const gridTemplate = `40px ${COLS.map((c) => resolvedColWidth(c) + 'px').join(' ')} ${extraCols.map((c) => resolvedExtraWidth(c) + 'px').join(' ')} 44px 40px`;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(t))
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const g: Record<Status, Row[]> = {
      'ახალი': [],
      'მოლაპარაკების პროცესი': [],
      'შეთავაზება გაცემული': [],
      'დახურული-მოგება': [],
      'დახურული-დაკარგვა': []
    };
    for (const r of filtered) g[r.status].push(r);
    return g;
  }, [filtered]);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              editedBy: 'Giorgi merebash',
              editedAt: new Date().toLocaleString('en-GB').replace(',', '')
            }
          : r
      )
    );
  };

  const addRow = (status: Status) => {
    const id = 'r' + Date.now();
    setRows((prev) => [
      ...prev,
      {
        id,
        company: '',
        contact: '',
        phone: '',
        contract: null,
        status,
        role: '',
        owner: '',
        period: '',
        editedBy: 'Giorgi merebash',
        editedAt: new Date().toLocaleString('en-GB').replace(',', ''),
        createdBy: 'Giorgi merebash'
      }
    ]);
    setCollapsed((prev) => ({...prev, [status]: false}));
  };

  const exportCsv = () => {
    const headers = ['#', ...COLS.map((c) => c.label), ...extraCols.map((c) => c.label)];
    const lines: string[] = [headers.map(csvCell).join(',')];
    filtered.forEach((r, i) => {
      const base = COLS.map((c) => {
        const v = r[c.key];
        return v === null || v === undefined ? '' : String(v);
      });
      const extra = extraCols.map((ec) => {
        const raw = extraVals[r.id]?.[ec.key] ?? '';
        if (ec.kind === 'select' && ec.varSetId) {
          const set = varSets.find((s) => s.id === ec.varSetId);
          return set?.options.find((o) => o.id === raw)?.label ?? '';
        }
        return raw;
      });
      lines.push([String(i + 1), ...base, ...extra].map(csvCell).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteRow = (id: string) => {
    if (!confirm('ჩანაწერი წავშალო?')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleGroup = (s: Status) => {
    setCollapsed((prev) => ({...prev, [s]: !prev[s]}));
  };

  const totalContract = filtered.reduce((s, r) => s + (r.contract || 0), 0);
  const fullWidth = COLS.reduce((s, c) => s + resolvedColWidth(c), 0) + extraWidth + 40 + 44 + 40;

  return (
    <DmtPageShell
      kicker="ALL LEADS · GRID"
      title="ყველა ლიდი"
      subtitle="Airtable-სტილის grid · ჯგუფდება სტატუსის მიხედვით · უჯრების პირდაპირ რედაქტირება"
      searchPlaceholder="ძიება ნებისმიერ ველში…"
      onQueryChange={setQ}
      actions={
        <>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => addRow('ახალი')}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი
          </button>
        </>
      }
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="სულ ჩანაწერი" value={String(filtered.length)} />
          <StatCard label="მოლაპარ. პროცესში" value={String(grouped['მოლაპარაკების პროცესი'].length)} accent="pur" />
          <StatCard label="მოგება" value={String(grouped['დახურული-მოგება'].length)} accent="grn" />
          <StatCard label="Σ კონტრაქტი" value={`₾ ${fmt(totalContract)}`} />
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-bdr bg-sur">
          <div style={{minWidth: fullWidth}}>
            {/* Column header */}
            <div
              className="grid border-b border-bdr bg-sur-2 text-left"
              style={{gridTemplateColumns: gridTemplate}}
            >
              <div className="px-2 py-2 font-mono text-[10px] text-text-3">#</div>
              {COLS.map((c) => {
                const Icon = c.icon;
                const w = resolvedColWidth(c);
                const isResizing = resizingKey === (c.key as string);
                return (
                  <div
                    key={c.key}
                    className={`relative px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 ${
                      c.align === 'right' ? 'text-right' : ''
                    } ${isResizing ? 'bg-blue-lt/40' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Icon size={11} strokeWidth={1.8} />
                      <span className="truncate">{c.label}</span>
                    </span>
                    <ColResizeHandle
                      onMouseDown={startResize(c.key as string, w)}
                      onDoubleClick={shrinkCol(c.key as string)}
                      active={isResizing}
                    />
                  </div>
                );
              })}
              {extraCols.map((c) => {
                const setName = c.varSetId
                  ? varSets.find((v) => v.id === c.varSetId)?.name
                  : null;
                const Icon = c.kind === 'text' ? Type : c.kind === 'number' ? Hash : List;
                const w = resolvedExtraWidth(c);
                const isResizing = resizingKey === c.key;
                return (
                  <div
                    key={c.key}
                    className={`group relative flex items-center justify-between gap-1 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 ${
                      isResizing ? 'bg-blue-lt/40' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Icon size={11} strokeWidth={1.8} />
                      <span className="truncate">{c.label}</span>
                      {setName && (
                        <span
                          className="ml-1 rounded-full bg-blue-lt px-1.5 py-0.5 font-mono text-[8.5px] text-blue"
                          title={setName}
                        >
                          ref
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => removeExtraCol(c.key)}
                      className="shrink-0 rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:bg-red-lt hover:text-red group-hover:opacity-100"
                      title="column წაშლა"
                    >
                      <X size={11} />
                    </button>
                    <ColResizeHandle
                      onMouseDown={startResize(c.key, w)}
                      onDoubleClick={shrinkCol(c.key)}
                      active={isResizing}
                    />
                  </div>
                );
              })}
              <button
                onClick={() => setShowAddCol(true)}
                className="flex items-center justify-center gap-1 border-l border-bdr text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 hover:bg-sur hover:text-blue"
                title="column-ის დამატება"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
              <div />
            </div>
            {showAddCol && (
              <AddColumnInline
                varSets={varSets}
                onCancel={() => setShowAddCol(false)}
                onSubmit={(col) => {
                  addExtraCol(col);
                  setShowAddCol(false);
                }}
              />
            )}

            {/* Groups */}
            {STATUS_ORDER.map((s) => {
              const items = grouped[s];
              if (items.length === 0 && q) return null;
              const st = STATUS_META[s];
              const isCollapsed = collapsed[s];
              const groupSum = items.reduce((sm, r) => sm + (r.contract || 0), 0);
              return (
                <div key={s} className="border-b border-bdr last:border-b-0">
                  <button
                    onClick={() => toggleGroup(s)}
                    className="flex w-full items-center gap-2 border-b border-bdr bg-sur-2 px-3 py-2 text-left hover:bg-bdr/30"
                  >
                    <ChevronDown
                      size={12}
                      className={`shrink-0 text-text-3 transition-transform ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        addRow(s);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 py-1 font-mono text-[10.5px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white"
                    >
                      <Plus size={11} /> ახალი
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{color: st.color, background: st.bg, borderColor: st.border}}
                    >
                      {s}
                    </span>
                    <span className="font-mono text-[10.5px] text-text-3">{items.length}</span>
                    {groupSum > 0 && (
                      <span className="font-mono text-[10.5px] text-text-3">
                        · Σ ${fmt(groupSum)}
                      </span>
                    )}
                    <div className="flex-1" />
                  </button>

                  {!isCollapsed &&
                    items.map((r, idx) => (
                      <div
                        key={r.id}
                        className="grid border-b border-bdr/60 last:border-b-0 text-[12px] transition-colors hover:bg-sur-2"
                        style={{gridTemplateColumns: gridTemplate}}
                      >
                        <div className="flex items-center justify-center font-mono text-[10px] text-text-3">
                          {idx + 1}
                        </div>
                        {COLS.map((c) => renderCell(c, r, update))}
                        {extraCols.map((ec) =>
                          renderExtraCell(
                            ec,
                            extraVals[r.id]?.[ec.key] ?? '',
                            varSets,
                            (v) => setExtraVal(r.id, ec.key, v)
                          )
                        )}
                        <div />
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => deleteRow(r.id)}
                            className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                            title="წაშლა"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}

            {/* Aggregation footer */}
            <div
              className="grid border-t-2 border-bdr-2 bg-sur-2"
              style={{gridTemplateColumns: gridTemplate}}
            >
              <div />
              {COLS.map((c) => (
                <div
                  key={c.key}
                  className={`px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 ${
                    c.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {c.kind === 'number' ? (
                    <span className="text-navy">SUM ₾ {fmt(totalContract)}</span>
                  ) : (
                    <span>COUNT {filtered.length}</span>
                  )}
                </div>
              ))}
              {extraCols.map((ec) => (
                <div
                  key={ec.key}
                  className="px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3"
                >
                  COUNT {filtered.length}
                </div>
              ))}
              <div />
              <div />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[10px] border border-bdr bg-sur-2 p-3 text-[11.5px] leading-relaxed text-text-2">
          <b>💡 ცოცხალი grid:</b> უჯრედი სადაც text-ია — click-ი + რედაქტირება. Status / როლი — dropdown. <b>სვეტის ზომა:</b> header-ის მარჯვენა კიდეზე drag · ორმაგი click → მინიმუმი (~10 სიმბ.). ცვლილებები ავტომატურად ინახება localStorage-ში.
        </div>
      </div>
    </DmtPageShell>
  );
}

function renderCell(
  c: (typeof COLS)[number],
  r: Row,
  update: (id: string, patch: Partial<Row>) => void
) {
  const align = c.align === 'right' ? 'text-right' : '';
  const v = r[c.key];

  if (c.kind === 'status') {
    const st = STATUS_META[r.status];
    return (
      <select
        key={c.key}
        value={r.status}
        onChange={(e) => update(r.id, {status: e.target.value as Status})}
        className="mx-2 my-1.5 cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
        style={{color: st.color, background: st.bg, borderColor: st.border}}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    );
  }

  if (c.kind === 'role') {
    return (
      <select
        key={c.key}
        value={r.role}
        onChange={(e) => update(r.id, {role: e.target.value as Role | ''})}
        className="mx-2 my-1.5 cursor-pointer appearance-none rounded-md border border-bdr bg-sur-2 px-2 py-0.5 text-[10.5px] font-semibold text-text-2 hover:border-bdr-2 focus:outline-none"
      >
        <option value="">—</option>
        <option value="End user">End user</option>
        <option value="Consultant">Consultant</option>
        <option value="Contractor">Contractor</option>
        <option value="Designer">Designer</option>
        <option value="Supplier">Supplier</option>
      </select>
    );
  }

  if (c.kind === 'author') {
    const name = String(v ?? '');
    const initial = name.trim()[0] || '—';
    return (
      <div key={c.key} className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-text-2">
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy text-[9px] font-bold uppercase text-white">
          {initial}
        </span>
        <span className="truncate">{name}</span>
      </div>
    );
  }

  if (c.kind === 'date') {
    return (
      <div key={c.key} className="px-3 py-2 font-mono text-[10.5px] text-text-3">
        {String(v ?? '')}
      </div>
    );
  }

  if (c.kind === 'number') {
    return (
      <input
        key={c.key}
        type="number"
        value={v ?? ''}
        onChange={(e) =>
          update(r.id, {
            [c.key]: e.target.value === '' ? null : Number(e.target.value)
          } as Partial<Row>)
        }
        className={`w-full border-0 bg-transparent px-3 py-2 font-mono text-[11.5px] text-navy ${align} focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue`}
        placeholder="—"
      />
    );
  }

  return (
    <input
      key={c.key}
      type="text"
      value={String(v ?? '')}
      onChange={(e) => update(r.id, {[c.key]: e.target.value} as Partial<Row>)}
      className={`w-full border-0 bg-transparent px-3 py-2 text-[12px] text-text ${align} focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue`}
      placeholder="—"
    />
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n);
}

function csvCell(v: string) {
  if (v === '' || v == null) return '';
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function ColResizeHandle({
  onMouseDown,
  onDoubleClick,
  active
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  active?: boolean;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      className={`group/rh absolute right-0 top-0 z-10 flex h-full w-[6px] cursor-col-resize items-stretch select-none ${
        active ? 'bg-blue' : ''
      }`}
      title="Drag — ზომა · Dbl-click — მინიმუმი"
    >
      <span
        className={`ml-auto h-full w-[2px] transition-colors ${
          active ? 'bg-blue' : 'bg-transparent group-hover/rh:bg-blue-bd'
        }`}
      />
    </span>
  );
}

function renderExtraCell(
  c: ExtraCol,
  value: string,
  varSets: VarSet[],
  onChange: (v: string) => void
) {
  if (c.kind === 'select' && c.varSetId) {
    const set = varSets.find((s) => s.id === c.varSetId);
    const selected = set?.options.find((o) => o.id === value);
    const bg = selected ? COLOR_STYLES[selected.color].bg : 'transparent';
    const color = selected ? COLOR_STYLES[selected.color].color : 'var(--text-3)';
    const border = selected ? COLOR_STYLES[selected.color].border : 'var(--bdr)';
    return (
      <select
        key={c.key}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mx-2 my-1.5 cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
        style={{color, background: bg, borderColor: border}}
      >
        <option value="">—</option>
        {set?.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (c.kind === 'number') {
    return (
      <input
        key={c.key}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 bg-transparent px-3 py-2 font-mono text-[11.5px] text-navy focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue"
        placeholder="—"
      />
    );
  }
  return (
    <input
      key={c.key}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-0 bg-transparent px-3 py-2 text-[12px] text-text focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue"
      placeholder="—"
    />
  );
}

function AddColumnInline({
  varSets,
  onSubmit,
  onCancel
}: {
  varSets: VarSet[];
  onSubmit: (col: {label: string; kind: ExtraKind; width: number; varSetId?: string}) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<ExtraKind>('text');
  const [varSetId, setVarSetId] = useState(varSets[0]?.id ?? '');
  const [width, setWidth] = useState(140);

  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-bdr bg-blue-lt/50 px-3 py-2.5">
      <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
        <Columns3 size={12} /> ახალი column
      </div>
      <div>
        <label className="block font-mono text-[9.5px] text-text-3">სახელი</label>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. რეგიონი"
          className="w-48 rounded-md border border-bdr bg-sur px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
        />
      </div>
      <div>
        <label className="block font-mono text-[9.5px] text-text-3">ტიპი</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ExtraKind)}
          className="rounded-md border border-bdr bg-sur px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
        >
          <option value="text">text</option>
          <option value="number">number</option>
          <option value="select">select (ცვლადი)</option>
        </select>
      </div>
      {kind === 'select' && (
        <div>
          <label className="flex items-center gap-1 font-mono text-[9.5px] text-text-3">
            <Palette size={10} /> ცვლადი
          </label>
          {varSets.length === 0 ? (
            <Link
              href="/dmt/variables"
              className="inline-flex items-center gap-1 rounded-md border border-ora-bd bg-ora-lt px-2 py-1 text-[11px] font-semibold text-ora"
            >
              ჯერ შექმენი ცვლადი →
            </Link>
          ) : (
            <select
              value={varSetId}
              onChange={(e) => setVarSetId(e.target.value)}
              className="rounded-md border border-bdr bg-sur px-2 py-1 text-[12px] focus:border-blue focus:outline-none"
            >
              {varSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.options.length})
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div>
        <label className="block font-mono text-[9.5px] text-text-3">სიგანე (px)</label>
        <input
          type="number"
          value={width}
          min={60}
          max={400}
          step={10}
          onChange={(e) => setWidth(Number(e.target.value) || 140)}
          className="w-20 rounded-md border border-bdr bg-sur px-2 py-1 font-mono text-[12px] focus:border-blue focus:outline-none"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-bdr bg-sur px-3 py-1 text-[12px] font-semibold text-text-2 hover:border-red hover:text-red"
        >
          გაუქმება
        </button>
        <button
          disabled={!label.trim() || (kind === 'select' && !varSetId)}
          onClick={() =>
            onSubmit({
              label: label.trim(),
              kind,
              width,
              varSetId: kind === 'select' ? varSetId : undefined
            })
          }
          className="rounded-md border border-blue bg-blue px-3 py-1 text-[12px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'grn' | 'red' | 'pur'}) {
  const color =
    accent === 'grn' ? 'var(--grn)' :
    accent === 'red' ? 'var(--red)' :
    accent === 'pur' ? '#7c3aed' :
    'var(--navy)';
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
