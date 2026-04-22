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
  Download,
  GripVertical,
  Check,
  LoaderCircle
} from 'lucide-react';
import {
  COLOR_STYLES,
  COLORS,
  loadSets,
  saveSets,
  randomId,
  type VarOption,
  type VarSet
} from '@/lib/dmt/variables';

type Status =
  | 'ახალი'
  | 'მოლაპარაკების პროცესი'
  | 'შეთავაზება გაცემული'
  | 'დახურული-მოგება'
  | 'დახურული-დაკარგვა';
type LeadRole = 'End user' | 'Consultant' | 'Contractor' | 'Designer' | 'Supplier';
type DmtPortalRole = 'owner' | 'admin' | 'member' | 'viewer';
type ManualLeadTabColor = 'blue' | 'navy' | 'green' | 'orange' | 'gray';

type ManualLeadUser = {
  id: string;
  name: string;
  email: string;
  role: DmtPortalRole;
  settings: {
    manualLeadsTabColor: ManualLeadTabColor;
  };
};

type Row = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  contract: number | null;
  status: Status;
  role: LeadRole | '';
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

const TAB_COLOR_STYLES: Record<
  ManualLeadTabColor,
  {color: string; bg: string; border: string; ring: string}
> = {
  blue: {
    color: 'var(--blue)',
    bg: 'var(--blue-lt)',
    border: 'var(--blue-bd)',
    ring: 'var(--blue)'
  },
  navy: {
    color: 'var(--navy)',
    bg: 'var(--sur-2)',
    border: 'var(--bdr-2)',
    ring: 'var(--navy)'
  },
  green: {
    color: 'var(--grn)',
    bg: 'var(--grn-lt)',
    border: 'var(--grn-bd)',
    ring: 'var(--grn)'
  },
  orange: {
    color: 'var(--ora)',
    bg: 'var(--ora-lt)',
    border: 'var(--ora-bd)',
    ring: 'var(--ora)'
  },
  gray: {
    color: 'var(--text-2)',
    bg: 'var(--sur-2)',
    border: 'var(--bdr)',
    ring: 'var(--text-2)'
  }
};

const TAB_COLOR_OPTIONS: {id: ManualLeadTabColor; label: string}[] = [
  {id: 'blue', label: 'ლურჯი'},
  {id: 'navy', label: 'მუქი ლურჯი'},
  {id: 'green', label: 'მწვანე'},
  {id: 'orange', label: 'ნარინჯისფერი'},
  {id: 'gray', label: 'ნეიტრალური'}
];

const STORE_KEY = 'dmt_manual_leads_v2';
const EXTRA_COLS_KEY = 'dmt_manual_extra_cols_v1';
const EXTRA_VALS_KEY = 'dmt_manual_extra_vals_v1';
const COL_WIDTHS_KEY = 'dmt_manual_col_widths_v1';
const COL_ORDER_KEY = 'dmt_manual_col_order_v1';
const STATUS_ORDER_KEY = 'dmt_manual_status_order_v1';

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

type BaseColDef = {
  key: keyof Row;
  label: string;
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  width: number;
  align?: 'right';
  kind?: 'text' | 'number' | 'status' | 'role' | 'owner' | 'date' | 'author';
};

const COLS: BaseColDef[] = [
  {key: 'company',  label: 'კომპ. დასახ.', icon: Building2, width: 180},
  {key: 'contact',  label: 'საკონტაქტო',   icon: User,      width: 150},
  {key: 'phone',    label: 'ტელეფონი',     icon: Phone,     width: 150},
  {key: 'contract', label: 'კონტრ. ღირებ.', icon: DollarSign, width: 120, align: 'right', kind: 'number'},
  {key: 'status',   label: 'სტატუსი',      icon: Star,      width: 180, kind: 'status'},
  {key: 'role',     label: 'როლი',         icon: Shuffle,   width: 120, kind: 'role'},
  {key: 'owner',    label: 'პრ. მენ.',     icon: UserCog,   width: 140, kind: 'owner'},
  {key: 'period',   label: 'პერიოდი',      icon: Calendar,  width: 100},
  {key: 'editedBy', label: 'ბოლო რედაქტ.', icon: UserRound, width: 140, kind: 'author'},
  {key: 'editedAt', label: 'ბოლო დრო',     icon: Clock,     width: 150, kind: 'date'},
  {key: 'createdBy',label: 'ჩანაწ. ავტ.',  icon: UserRound, width: 140, kind: 'author'}
];

type OrderedCol =
  | {src: 'base'; key: string; base: BaseColDef}
  | {src: 'extra'; key: string; extra: ExtraCol};

function buildOrderedCols(extra: ExtraCol[], order: string[]): OrderedCol[] {
  const byKey = new Map<string, OrderedCol>();
  for (const c of COLS) byKey.set(c.key as string, {src: 'base', key: c.key as string, base: c});
  for (const c of extra) byKey.set(c.key, {src: 'extra', key: c.key, extra: c});
  const out: OrderedCol[] = [];
  for (const k of order) {
    const c = byKey.get(k);
    if (c) {
      out.push(c);
      byKey.delete(k);
    }
  }
  for (const c of byKey.values()) out.push(c);
  return out;
}

function normalizeOwnerName(value: string) {
  return value.trim().toLowerCase();
}

function findUserByOwnerName(users: ManualLeadUser[], owner: string) {
  const target = normalizeOwnerName(owner);
  if (!target) return null;
  return users.find((user) => normalizeOwnerName(user.name || user.email) === target) ?? null;
}

function displayActorLabel(user: ManualLeadUser | null) {
  if (!user) return 'მე';
  const name = user.name.trim();
  if (name) return name;
  return user.email.split('@')[0] || user.email || 'მე';
}

export default function ManualLeadsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<ManualLeadUser[]>([]);
  const [me, setMe] = useState<ManualLeadUser | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | string>('all');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [savingColor, setSavingColor] = useState<ManualLeadTabColor | null>(null);
  const [collapsed, setCollapsed] = useState<Record<Status, boolean>>({} as Record<Status, boolean>);
  const [extraCols, setExtraCols] = useState<ExtraCol[]>([]);
  const [extraVals, setExtraVals] = useState<ExtraVals>({});
  const [varSets, setVarSets] = useState<VarSet[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const [colOrder, setColOrder] = useState<string[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [statusOrder, setStatusOrder] = useState<Status[]>(STATUS_ORDER);
  const [statusDragKey, setStatusDragKey] = useState<Status | null>(null);
  const [statusDragOverKey, setStatusDragOverKey] = useState<Status | null>(null);

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
      const co = localStorage.getItem(COL_ORDER_KEY);
      if (co) setColOrder(JSON.parse(co));
      const so = localStorage.getItem(STATUS_ORDER_KEY);
      if (so) {
        const parsed = JSON.parse(so) as Status[];
        // Guard against stale persisted orders — must contain every status exactly once
        const valid =
          Array.isArray(parsed) &&
          parsed.length === STATUS_ORDER.length &&
          STATUS_ORDER.every((s) => parsed.includes(s));
        if (valid) setStatusOrder(parsed);
      }
      setVarSets(loadSets());
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      try {
        const res = await fetch('/api/dmt/leads/manual/users', {cache: 'no-store'});
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setUsersError(data.error || 'users_load_failed');
          return;
        }
        if (cancelled) return;
        setUsers(data.users || []);
        setMe(data.me || null);
        setUsersError('');
      } catch (error) {
        if (!cancelled) {
          setUsersError(error instanceof Error ? error.message : 'users_load_failed');
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(rows));
      localStorage.setItem(EXTRA_COLS_KEY, JSON.stringify(extraCols));
      localStorage.setItem(EXTRA_VALS_KEY, JSON.stringify(extraVals));
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidths));
      localStorage.setItem(COL_ORDER_KEY, JSON.stringify(colOrder));
      localStorage.setItem(STATUS_ORDER_KEY, JSON.stringify(statusOrder));
    } catch {}
  }, [rows, extraCols, extraVals, colWidths, colOrder, statusOrder, hydrated]);

  useEffect(() => {
    if (ownerFilter === 'all') return;
    if (users.some((user) => user.id === ownerFilter)) return;
    setOwnerFilter('all');
  }, [ownerFilter, users]);

  const widthOf = (key: string, fallback: number) => colWidths[key] ?? fallback;
  const actorLabel = displayActorLabel(me);

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
        const rest = {...m};
        delete rest[key];
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

  const orderedCols = useMemo(() => buildOrderedCols(extraCols, colOrder), [extraCols, colOrder]);
  const widthOfCol = (c: OrderedCol) =>
    widthOf(c.key, c.src === 'base' ? c.base.width : c.extra.width);
  const totalColsWidth = orderedCols.reduce((s, c) => s + widthOfCol(c), 0);
  const gridTemplate = `40px ${orderedCols.map((c) => widthOfCol(c) + 'px').join(' ')} 44px 40px`;

  const moveCol = (fromKey: string, toKey: string, position: 'before' | 'after') => {
    if (fromKey === toKey) return;
    const current = orderedCols.map((c) => c.key);
    const fromIdx = current.indexOf(fromKey);
    if (fromIdx < 0) return;
    current.splice(fromIdx, 1);
    const toIdx = current.indexOf(toKey);
    if (toIdx < 0) return;
    const insertAt = position === 'before' ? toIdx : toIdx + 1;
    current.splice(insertAt, 0, fromKey);
    setColOrder(current);
  };

  const activeOwnerUser = ownerFilter === 'all' ? null : users.find((user) => user.id === ownerFilter) ?? null;

  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const user of users) counts[user.id] = 0;
    for (const row of rows) {
      const user = findUserByOwnerName(users, row.owner);
      if (user) counts[user.id] = (counts[user.id] || 0) + 1;
    }
    return counts;
  }, [rows, users]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      const activeOwnerName = activeOwnerUser?.name || activeOwnerUser?.email || '';
      if (activeOwnerName && normalizeOwnerName(r.owner) !== normalizeOwnerName(activeOwnerName)) {
        return false;
      }
      if (!t) return true;
      return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(t));
    });
  }, [activeOwnerUser, rows, q]);

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
              editedBy: actorLabel,
              editedAt: new Date().toLocaleString('en-GB').replace(',', '')
            }
          : r
      )
    );
  };

  const saveMyTabColor = async (nextColor: ManualLeadTabColor) => {
    if (!me || savingColor) return;
    setSavingColor(nextColor);
    try {
      const res = await fetch('/api/dmt/leads/manual/users', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({manualLeadsTabColor: nextColor})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.settings) {
        setUsersError(data.error || 'settings_update_failed');
        return;
      }
      setUsers((prev) =>
        prev.map((user) =>
          user.id === me.id ? {...user, settings: data.settings} : user
        )
      );
      setMe((prev) => (prev ? {...prev, settings: data.settings} : prev));
      setUsersError('');
      setShowColorPicker(false);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'settings_update_failed');
    } finally {
      setSavingColor(null);
    }
  };

  const addRow = (status: Status) => {
    const id = 'r' + Date.now();
    const ownerName =
      activeOwnerUser?.name ||
      activeOwnerUser?.email ||
      me?.name ||
      me?.email ||
      '';
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
        owner: ownerName,
        period: '',
        editedBy: actorLabel,
        editedAt: new Date().toLocaleString('en-GB').replace(',', ''),
        createdBy: actorLabel
      }
    ]);
    setCollapsed((prev) => ({...prev, [status]: false}));
  };

  const exportCsv = () => {
    const headers = ['#', ...orderedCols.map((c) => (c.src === 'base' ? c.base.label : c.extra.label))];
    const lines: string[] = [headers.map(csvCell).join(',')];
    filtered.forEach((r, i) => {
      const cells = orderedCols.map((c) => {
        if (c.src === 'base') {
          const v = r[c.base.key];
          return v === null || v === undefined ? '' : String(v);
        }
        const raw = extraVals[r.id]?.[c.extra.key] ?? '';
        if (c.extra.kind === 'select' && c.extra.varSetId) {
          const set = varSets.find((s) => s.id === c.extra.varSetId);
          return set?.options.find((o) => o.id === raw)?.label ?? '';
        }
        return raw;
      });
      lines.push([String(i + 1), ...cells].map(csvCell).join(','));
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
  const fullWidth = totalColsWidth + 40 + 44 + 40;

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
        {usersError && (
          <div className="mb-4 rounded-[10px] border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            {usersError === 'unauthorized'
              ? 'სესია დასრულდა. თავიდან შედი DMT-ში.'
              : `მომხმარებლების ჩატვირთვა ვერ მოხერხდა: ${usersError}`}
          </div>
        )}

        <div className="mb-4 rounded-[10px] border border-bdr bg-sur">
          <div className="flex flex-wrap items-center gap-2 px-3 py-3">
            <div className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              USER TABS
            </div>
            <button
              type="button"
              onClick={() => setOwnerFilter('all')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                ownerFilter === 'all'
                  ? 'border-blue-bd bg-blue-lt text-blue'
                  : 'border-bdr bg-sur-2 text-text-2 hover:border-bdr-2 hover:text-navy'
              }`}
            >
              <span>ყველა</span>
              <span className="font-mono text-[10px]">{rows.length}</span>
            </button>

            {usersLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur-2 px-3 py-1.5 font-mono text-[10.5px] text-text-3">
                <LoaderCircle size={12} className="animate-spin" /> იტვირთება მომხმარებლები
              </span>
            ) : (
              users.map((user) => {
                const style = TAB_COLOR_STYLES[user.settings.manualLeadsTabColor];
                const isActive = ownerFilter === user.id;
                const isMe = user.id === me?.id;
                return (
                  <div key={user.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOwnerFilter(user.id)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors hover:border-bdr-2"
                      style={
                        isActive
                          ? {
                              color: style.color,
                              background: style.bg,
                              borderColor: style.border,
                              boxShadow: `inset 0 -2px 0 ${style.ring}`
                            }
                          : undefined
                      }
                      title={user.email}
                    >
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{background: style.ring}}
                      />
                      <span>{user.name || user.email}</span>
                      <span className="font-mono text-[10px] text-text-3">
                        {ownerCounts[user.id] ?? 0}
                      </span>
                    </button>
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => setShowColorPicker((value) => !value)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                          showColorPicker
                            ? 'border-blue-bd bg-blue-lt text-blue'
                            : 'border-bdr bg-sur-2 text-text-3 hover:border-blue hover:text-blue'
                        }`}
                        title="ჩემი ტაბის ფერი"
                      >
                        <Palette size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {showColorPicker && me && (
            <div className="flex flex-wrap items-center gap-2 border-t border-bdr bg-sur-2 px-3 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                ჩემი ტაბის ფერი
              </span>
              {TAB_COLOR_OPTIONS.map((option) => {
                const style = TAB_COLOR_STYLES[option.id];
                const selected = me.settings.manualLeadsTabColor === option.id;
                const busy = savingColor === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={savingColor !== null}
                    onClick={() => saveMyTabColor(option.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      color: style.color,
                      background: style.bg,
                      borderColor: style.border
                    }}
                  >
                    {busy ? (
                      <LoaderCircle size={12} className="animate-spin" />
                    ) : selected ? (
                      <Check size={12} />
                    ) : (
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{background: style.ring}}
                      />
                    )}
                    {option.label}
                  </button>
                );
              })}
              <span className="text-[11px] text-text-3">
                შენახვის შემდეგ ეს ფერი ყველასთან გამოჩნდება.
              </span>
            </div>
          )}
        </div>

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
              {orderedCols.map((c) => {
                const w = widthOfCol(c);
                const isResizing = resizingKey === c.key;
                const isDragOver = dragOverKey === c.key && dragKey && dragKey !== c.key;
                const isDragging = dragKey === c.key;
                const label = c.src === 'base' ? c.base.label : c.extra.label;
                const Icon =
                  c.src === 'base'
                    ? c.base.icon
                    : c.extra.kind === 'text'
                    ? Type
                    : c.extra.kind === 'number'
                    ? Hash
                    : List;
                const align = c.src === 'base' && c.base.align === 'right' ? 'text-right' : '';
                const setName =
                  c.src === 'extra' && c.extra.varSetId
                    ? varSets.find((v) => v.id === c.extra.varSetId)?.name
                    : null;
                return (
                  <div
                    key={c.key}
                    draggable
                    onDragStart={(e) => {
                      setDragKey(c.key);
                      e.dataTransfer.effectAllowed = 'move';
                      try {
                        e.dataTransfer.setData('text/plain', c.key);
                      } catch {}
                    }}
                    onDragOver={(e) => {
                      if (!dragKey || dragKey === c.key) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverKey(c.key);
                    }}
                    onDragLeave={() => {
                      setDragOverKey((prev) => (prev === c.key ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!dragKey || dragKey === c.key) return;
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const position = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                      moveCol(dragKey, c.key, position);
                      setDragKey(null);
                      setDragOverKey(null);
                    }}
                    onDragEnd={() => {
                      setDragKey(null);
                      setDragOverKey(null);
                    }}
                    className={`group relative flex items-center justify-between gap-1 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 ${align} ${
                      isResizing ? 'bg-blue-lt/40' : ''
                    } ${isDragging ? 'opacity-40' : ''} ${
                      isDragOver ? 'bg-blue-lt shadow-[inset_2px_0_0_0_var(--blue)]' : ''
                    }`}
                    title="დააგდე სხვა column-ზე — გადაადგილდება"
                  >
                    <span className="inline-flex items-center gap-1 truncate cursor-grab active:cursor-grabbing">
                      <GripVertical
                        size={11}
                        className="shrink-0 text-text-3 opacity-40 group-hover:opacity-100"
                      />
                      <Icon size={11} strokeWidth={1.8} />
                      <span className="truncate">{label}</span>
                      {setName && (
                        <span
                          className="ml-1 rounded-full bg-blue-lt px-1.5 py-0.5 font-mono text-[8.5px] text-blue"
                          title={setName}
                        >
                          ref
                        </span>
                      )}
                    </span>
                    {c.src === 'extra' && (
                      <button
                        onClick={() => removeExtraCol(c.key)}
                        className="shrink-0 rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:bg-red-lt hover:text-red group-hover:opacity-100"
                        title="column წაშლა"
                      >
                        <X size={11} />
                      </button>
                    )}
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
                onVarSetCreated={(set) => {
                  setVarSets((prev) => {
                    const next = [...prev, set];
                    saveSets(next);
                    return next;
                  });
                }}
                onCancel={() => setShowAddCol(false)}
                onSubmit={(col) => {
                  addExtraCol(col);
                  setShowAddCol(false);
                }}
              />
            )}

            {/* Groups */}
            {statusOrder.map((s) => {
              const items = grouped[s];
              if (items.length === 0 && q) return null;
              const st = STATUS_META[s];
              const isCollapsed = collapsed[s];
              const groupSum = items.reduce((sm, r) => sm + (r.contract || 0), 0);
              const isDragOver = statusDragOverKey === s && statusDragKey && statusDragKey !== s;
              return (
                <div
                  key={s}
                  className={`border-b border-bdr last:border-b-0 transition-colors ${
                    isDragOver ? 'bg-blue-lt/60' : ''
                  } ${statusDragKey === s ? 'opacity-50' : ''}`}
                  onDragOver={(e) => {
                    if (!statusDragKey) return;
                    e.preventDefault();
                    if (statusDragOverKey !== s) setStatusDragOverKey(s);
                  }}
                  onDragLeave={() => {
                    if (statusDragOverKey === s) setStatusDragOverKey(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = statusDragKey;
                    setStatusDragKey(null);
                    setStatusDragOverKey(null);
                    if (!from || from === s) return;
                    setStatusOrder((prev) => {
                      const next = prev.filter((x) => x !== from);
                      const idx = next.indexOf(s);
                      next.splice(idx, 0, from);
                      return next;
                    });
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', s);
                      setStatusDragKey(s);
                    }}
                    onDragEnd={() => {
                      setStatusDragKey(null);
                      setStatusDragOverKey(null);
                    }}
                    onClick={() => toggleGroup(s)}
                    className="group flex w-full cursor-pointer items-center gap-2 border-b border-bdr bg-sur-2 px-3 py-2 text-left hover:bg-bdr/30"
                  >
                    <GripVertical
                      size={12}
                      className="shrink-0 cursor-grab text-text-3 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                    />
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
                  </div>

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
                        {orderedCols.map((c) =>
                          c.src === 'base'
                            ? renderCell(c.base, r, update, users)
                            : renderExtraCell(
                                c.extra,
                                extraVals[r.id]?.[c.extra.key] ?? '',
                                varSets,
                                (v) => setExtraVal(r.id, c.extra.key, v)
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
              {orderedCols.map((c) => {
                const isNumeric =
                  (c.src === 'base' && c.base.kind === 'number') ||
                  (c.src === 'extra' && c.extra.kind === 'number');
                const isContract = c.src === 'base' && c.base.key === 'contract';
                const align = c.src === 'base' && c.base.align === 'right' ? 'text-right' : '';
                return (
                  <div
                    key={c.key}
                    className={`px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3 ${align}`}
                  >
                    {isContract ? (
                      <span className="text-navy">SUM ₾ {fmt(totalContract)}</span>
                    ) : isNumeric ? (
                      <span>COUNT {filtered.length}</span>
                    ) : (
                      <span>COUNT {filtered.length}</span>
                    )}
                  </div>
                );
              })}
              <div />
              <div />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[10px] border border-bdr bg-sur-2 p-3 text-[11.5px] leading-relaxed text-text-2">
          <b>💡 ცოცხალი grid:</b> უჯრედი სადაც text-ია — click-ი + რედაქტირება. Status / როლი / პრ. მენეჯერი — dropdown. <b>სვეტის ზომა:</b> header-ის მარჯვენა კიდეზე drag · ორმაგი click → მინიმუმი (~10 სიმბ.). <b>თანმიმდევრობა:</b> header-ი აიღე და გადაათრიე სხვა column-ზე → გადაადგილდება. Grid-ის მონაცემები ისევ localStorage-შია, ხოლო user tab ფერები DMT მომხმარებლის ნასტროიკებში ინახება.
        </div>
      </div>
    </DmtPageShell>
  );
}

function renderCell(
  c: (typeof COLS)[number],
  r: Row,
  update: (id: string, patch: Partial<Row>) => void,
  users: ManualLeadUser[]
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
        onChange={(e) => update(r.id, {role: e.target.value as LeadRole | ''})}
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

  if (c.kind === 'owner') {
    if (users.length === 0) {
      return (
        <input
          key={c.key}
          type="text"
          value={String(v ?? '')}
          onChange={(e) => update(r.id, {[c.key]: e.target.value} as Partial<Row>)}
          className="w-full border-0 bg-transparent px-3 py-2 text-[12px] text-text focus:bg-sur focus:outline-none focus:ring-1 focus:ring-blue"
          placeholder="—"
        />
      );
    }

    const owner = String(v ?? '');
    const ownerUser = findUserByOwnerName(users, owner);
    const ownerStyle = ownerUser
      ? TAB_COLOR_STYLES[ownerUser.settings.manualLeadsTabColor]
      : TAB_COLOR_STYLES.gray;
    const options = users
      .map((user) => ({id: user.id, label: user.name.trim() || user.email}))
      .filter((user) => user.label.trim());
    const hasUnknownOwner =
      owner.trim() &&
      !options.some((user) => normalizeOwnerName(user.label) === normalizeOwnerName(owner));

    return (
      <select
        key={c.key}
        value={owner}
        onChange={(e) => update(r.id, {owner: e.target.value})}
        className="mx-2 my-1.5 cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
        style={{
          color: ownerStyle.color,
          background: ownerStyle.bg,
          borderColor: ownerStyle.border
        }}
      >
        <option value="">—</option>
        {hasUnknownOwner && <option value={owner}>{owner}</option>}
        {options.map((user) => (
          <option key={user.id} value={user.label}>
            {user.label}
          </option>
        ))}
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
  onVarSetCreated,
  onSubmit,
  onCancel
}: {
  varSets: VarSet[];
  onVarSetCreated: (set: VarSet) => void;
  onSubmit: (col: {label: string; kind: ExtraKind; width: number; varSetId?: string}) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<ExtraKind>('text');
  const [varSetId, setVarSetId] = useState(varSets[0]?.id ?? '');
  const [width, setWidth] = useState(140);
  const [creatingSet, setCreatingSet] = useState(false);

  const handleSetCreated = (set: VarSet) => {
    onVarSetCreated(set);
    setVarSetId(set.id);
    setCreatingSet(false);
  };

  return (
    <div className="border-b border-bdr bg-blue-lt/50">
      <div className="flex flex-wrap items-end gap-2 px-3 py-2.5">
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
            <div className="flex items-center gap-1">
              {varSets.length > 0 && (
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
              <button
                type="button"
                onClick={() => setCreatingSet((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  creatingSet
                    ? 'border-red bg-red-lt text-red'
                    : 'border-blue bg-sur text-blue hover:bg-blue hover:text-white'
                }`}
                title="ახალი ცვლადი აქვე"
              >
                {creatingSet ? <X size={11} /> : <Plus size={11} />}
                {creatingSet ? 'გაუქმება' : 'ახალი ცვლადი'}
              </button>
              <Link
                href="/dmt/variables"
                className="text-[11px] text-text-3 hover:text-blue"
                title="ცვლადების მართვა ცალკე გვერდზე"
              >
                მართვა →
              </Link>
            </div>
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
      {kind === 'select' && creatingSet && (
        <InlineVarSetCreator
          onSubmit={handleSetCreated}
          onCancel={() => setCreatingSet(false)}
        />
      )}
    </div>
  );
}

function InlineVarSetCreator({
  onSubmit,
  onCancel
}: {
  onSubmit: (set: VarSet) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [options, setOptions] = useState<VarOption[]>([
    {id: randomId('opt'), label: 'ვარიანტი 1', color: 'blue'},
    {id: randomId('opt'), label: 'ვარიანტი 2', color: 'green'}
  ]);

  const patch = (id: string, p: Partial<VarOption>) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? {...o, ...p} : o)));
  const remove = (id: string) =>
    setOptions((prev) => prev.filter((o) => o.id !== id));
  const add = () =>
    setOptions((prev) => [
      ...prev,
      {id: randomId('opt'), label: `ვარიანტი ${prev.length + 1}`, color: 'gray'}
    ]);

  const canSave =
    name.trim().length > 0 &&
    options.length > 0 &&
    options.every((o) => o.label.trim().length > 0);

  const save = () => {
    if (!canSave) return;
    onSubmit({
      id: randomId('set'),
      name: name.trim(),
      type: 'single',
      options: options.map((o) => ({...o, label: o.label.trim()}))
    });
  };

  return (
    <div className="border-t border-blue-bd bg-sur px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
          <Palette size={12} /> ახალი ცვლადი (option set)
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="სახელი — მაგ. რეგიონი"
          className="w-60 rounded-md border border-bdr bg-sur-2 px-2 py-1 text-[12px] font-semibold text-navy focus:border-blue focus:outline-none"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-bdr bg-sur px-2.5 py-1 text-[11.5px] font-semibold text-text-2 hover:border-red hover:text-red"
          >
            გაუქმება
          </button>
          <button
            disabled={!canSave}
            onClick={save}
            className="inline-flex items-center gap-1 rounded-md border border-blue bg-blue px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={11} /> ცვლადის შენახვა
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, idx) => {
          const st = COLOR_STYLES[opt.color];
          return (
            <div
              key={opt.id}
              className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-2 py-1.5"
            >
              <span className="font-mono text-[10px] text-text-3">{idx + 1}</span>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{color: st.color, background: st.bg, borderColor: st.border}}
              >
                {opt.label || '—'}
              </span>
              <input
                value={opt.label}
                onChange={(e) => patch(opt.id, {label: e.target.value})}
                placeholder="ლეიბლი"
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-0.5 text-[12px] hover:bg-sur focus:border-blue focus:bg-sur focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-bdr bg-sur p-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => patch(opt.id, {color: c})}
                    className={`h-3.5 w-3.5 rounded-full border transition-transform hover:scale-125 ${
                      opt.color === c ? 'ring-2 ring-offset-1 ring-navy' : ''
                    }`}
                    style={{
                      background: COLOR_STYLES[c].color,
                      borderColor: COLOR_STYLES[c].border
                    }}
                    title={c}
                    aria-label={c}
                  />
                ))}
              </div>
              <button
                onClick={() => remove(opt.id)}
                disabled={options.length <= 1}
                className="shrink-0 rounded p-1 text-text-3 hover:bg-red-lt hover:text-red disabled:cursor-not-allowed disabled:opacity-30"
                title="ვარიანტის წაშლა"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={add}
        className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-blue-bd px-2 py-1 text-[11px] font-semibold text-blue hover:border-blue hover:bg-blue-lt"
      >
        <Plus size={11} /> ვარიანტი
      </button>
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
