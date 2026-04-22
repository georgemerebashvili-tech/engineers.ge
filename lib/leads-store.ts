// Client-side Leads CRM store — localStorage-based MVP.
// All reads/writes must run in the browser.

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'meeting'
  | 'pilot'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  meeting: 'Meeting Scheduled',
  pilot: 'Pilot Offered',
  proposal: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

export const STATUS_ORDER: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'meeting',
  'pilot',
  'proposal',
  'negotiation',
  'won',
  'lost'
];

export const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'border-blue-bd bg-blue-lt text-blue',
  contacted: 'border-ora-bd bg-ora-lt text-ora',
  qualified: 'border-bdr-2 bg-sur-2 text-navy',
  meeting: 'border-bdr-2 bg-sur-2 text-navy',
  pilot: 'border-blue-bd bg-blue-lt text-blue',
  proposal: 'border-bdr-2 bg-sur-2 text-navy',
  negotiation: 'border-ora-bd bg-ora-lt text-ora',
  won: 'border-grn-bd bg-grn-lt text-grn',
  lost: 'border-red-bd bg-red-lt text-red'
};

// Legacy → new stage mapping for existing localStorage rows
const LEGACY_STATUS: Record<string, LeadStatus> = {
  potential: 'new',
  negotiating: 'negotiation',
  client: 'won',
  awaiting: 'negotiation'
};

export type LeadPriority = 'high' | 'medium' | 'low' | '';

export const PRIORITY_LABELS: Record<Exclude<LeadPriority, ''>, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export const PRIORITY_STYLES: Record<Exclude<LeadPriority, ''>, string> = {
  high: 'border-red-bd bg-red-lt text-red',
  medium: 'border-ora-bd bg-ora-lt text-ora',
  low: 'border-bdr bg-sur-2 text-text-2'
};

export type ColumnType =
  | 'text'
  | 'url'
  | 'email'
  | 'phone'
  | 'status'
  | 'priority'
  | 'money'
  | 'number'
  | 'date'
  | 'computed'
  | 'custom';

export type Column = {
  key: string;                  // stable id
  label: string;                // displayed header (editable for custom)
  type: ColumnType;
  fixed: boolean;               // user cannot delete fixed columns
  width?: number;               // px
};

export const INDUSTRY_OPTIONS = [
  'Retail',
  'Hospital',
  'Office',
  'School',
  'Industrial',
  'Hotel',
  'Residential',
  'Other'
];

export const LEAD_SOURCE_OPTIONS = [
  'Referral',
  'Facebook',
  'Exhibition',
  'Cold Outreach',
  'Website',
  'LinkedIn',
  'Event',
  'Other'
];

export const FIXED_COLUMNS: Column[] = [
  // Core contact
  {key: 'company', label: 'Company', type: 'text', fixed: true, width: 180},
  {key: 'name', label: 'Contact Person', type: 'text', fixed: true, width: 170},
  {key: 'position', label: 'Position', type: 'text', fixed: true, width: 150},
  {key: 'phone', label: 'Phone', type: 'phone', fixed: true, width: 130},
  {key: 'email', label: 'Email', type: 'email', fixed: true, width: 190},
  {key: 'website', label: 'Website', type: 'url', fixed: true, width: 170},
  // Company profile (DMT-specific)
  {key: 'industry', label: 'Industry', type: 'text', fixed: true, width: 130},
  {key: 'location', label: 'Location', type: 'text', fixed: true, width: 150},
  {key: 'buildingType', label: 'Building Type', type: 'text', fixed: true, width: 140},
  {key: 'buildingSize', label: 'Size (m²)', type: 'number', fixed: true, width: 100},
  {key: 'buildingCount', label: '# Buildings', type: 'number', fixed: true, width: 100},
  // Opportunity
  {key: 'leadSource', label: 'Lead Source', type: 'text', fixed: true, width: 140},
  {key: 'painPoint', label: 'Pain Point', type: 'text', fixed: true, width: 220},
  {key: 'dealSize', label: 'Deal Size (₾)', type: 'money', fixed: true, width: 120},
  {key: 'priority', label: 'Priority', type: 'priority', fixed: true, width: 110},
  // DMT energy fields
  {key: 'monthlyEnergyCost', label: 'Monthly Energy (₾)', type: 'money', fixed: true, width: 140},
  {key: 'savingsPct', label: 'Savings %', type: 'number', fixed: true, width: 100},
  {key: 'monthlySavings', label: 'Monthly Savings', type: 'computed', fixed: true, width: 130},
  {key: 'roiMonths', label: 'ROI (months)', type: 'computed', fixed: true, width: 110},
  // Pipeline
  {key: 'status', label: 'Stage', type: 'status', fixed: true, width: 160},
  // Activities
  {key: 'responsible', label: 'Responsible', type: 'text', fixed: true, width: 150},
  {key: 'lastContactAt', label: 'Last Contact', type: 'date', fixed: true, width: 130},
  {key: 'nextFollowUpAt', label: 'Next Follow-up', type: 'date', fixed: true, width: 130},
  {key: 'nextAction', label: 'Next Action', type: 'text', fixed: true, width: 200},
  {key: 'comment', label: 'Notes', type: 'text', fixed: true, width: 260}
];

// Compute derived cells (monthlySavings, roiMonths).
export function computedValue(key: string, row: {values: Record<string, string>}): string {
  const cost = parseFloat(row.values.monthlyEnergyCost || '0') || 0;
  const pct = parseFloat(row.values.savingsPct || '0') || 0;
  const deal = parseFloat(row.values.dealSize || '0') || 0;
  if (key === 'monthlySavings') {
    const s = cost * (pct / 100);
    return s > 0 ? s.toFixed(0) : '';
  }
  if (key === 'roiMonths') {
    const s = cost * (pct / 100);
    if (s > 0 && deal > 0) return (deal / s).toFixed(1);
    return '';
  }
  return '';
}

// Classify a follow-up date for coloring.
export type FollowUpUrgency = 'overdue' | 'today' | 'upcoming' | null;

export function followUpUrgency(iso: string | undefined): FollowUpUrgency {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

export type LeadRow = {
  id: string;
  tabId: string;
  order: number;
  values: Record<string, string>; // column key → cell value
  status: LeadStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: string;              // manager username
};

export type LeadTab = {
  id: string;
  name: string;
  order: number;
  columns: Column[];              // fixed + custom
};

export type Manager = {
  username: string;
  name: string;
  passwordHash: string;           // SHA-256 hex
  salt: string;                   // hex
  role: 'admin' | 'manager';
  canAddRemove: boolean;          // permission to add/remove rows
  createdAt: number;
};

// ---- Storage keys --------------------------------------------------------

const K_TABS = 'eng_leads_tabs_v1';
const K_ROWS = 'eng_leads_rows_v1';
const K_MANAGERS = 'eng_leads_managers_v1';
const K_SESSION = 'eng_leads_session_v1';

// ---- IO helpers ----------------------------------------------------------

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Tabs ---------------------------------------------------------------

export function loadTabs(): LeadTab[] {
  const tabs = read<LeadTab[]>(K_TABS, []);
  if (tabs.length === 0) {
    const defaultTab: LeadTab = {
      id: newId('tab'),
      name: 'ძირითადი',
      order: 0,
      columns: [...FIXED_COLUMNS]
    };
    write(K_TABS, [defaultTab]);
    return [defaultTab];
  }
  // Ensure fixed columns exist on every tab (future-proof against schema changes)
  const fixedKeys = new Set(FIXED_COLUMNS.map((c) => c.key));
  for (const tab of tabs) {
    const existingKeys = new Set(tab.columns.map((c) => c.key));
    for (const fc of FIXED_COLUMNS) {
      if (!existingKeys.has(fc.key)) tab.columns.push(fc);
    }
    // Move fixed columns to the front, custom columns after
    tab.columns.sort((a, b) => {
      const aFixed = fixedKeys.has(a.key) ? 0 : 1;
      const bFixed = fixedKeys.has(b.key) ? 0 : 1;
      if (aFixed !== bFixed) return aFixed - bFixed;
      if (aFixed === 0) {
        return (
          FIXED_COLUMNS.findIndex((c) => c.key === a.key) -
          FIXED_COLUMNS.findIndex((c) => c.key === b.key)
        );
      }
      return 0;
    });
  }
  return tabs.sort((a, b) => a.order - b.order);
}

export function saveTabs(tabs: LeadTab[]) {
  write(K_TABS, tabs);
}

export function createTab(name: string): LeadTab {
  const tabs = loadTabs();
  const tab: LeadTab = {
    id: newId('tab'),
    name: name.trim() || 'ახალი ტაბი',
    order: tabs.length,
    columns: [...FIXED_COLUMNS]
  };
  saveTabs([...tabs, tab]);
  return tab;
}

export function renameTab(id: string, name: string) {
  const tabs = loadTabs().map((t) => (t.id === id ? {...t, name: name.trim()} : t));
  saveTabs(tabs);
}

export function deleteTab(id: string) {
  const tabs = loadTabs().filter((t) => t.id !== id);
  saveTabs(tabs.map((t, i) => ({...t, order: i})));
  // also delete rows belonging to this tab
  const rows = loadRows().filter((r) => r.tabId !== id);
  saveRows(rows);
}

export function reorderTabs(orderedIds: string[]) {
  const byId = new Map(loadTabs().map((t) => [t.id, t]));
  const next = orderedIds
    .map((id, i) => {
      const t = byId.get(id);
      return t ? {...t, order: i} : null;
    })
    .filter(Boolean) as LeadTab[];
  saveTabs(next);
}

export function addCustomColumn(tabId: string, label: string): Column | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const tabs = loadTabs();
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return null;
  const col: Column = {
    key: newId('col'),
    label: trimmed,
    type: 'custom',
    fixed: false,
    width: 160
  };
  tab.columns = [...tab.columns, col];
  saveTabs(tabs);
  return col;
}

export function renameColumn(tabId: string, colKey: string, label: string) {
  const tabs = loadTabs();
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  tab.columns = tab.columns.map((c) =>
    c.key === colKey && !c.fixed ? {...c, label: label.trim() || c.label} : c
  );
  saveTabs(tabs);
}

export function deleteColumn(tabId: string, colKey: string) {
  const tabs = loadTabs();
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const col = tab.columns.find((c) => c.key === colKey);
  if (!col || col.fixed) return;
  tab.columns = tab.columns.filter((c) => c.key !== colKey);
  saveTabs(tabs);
}

// ---- Rows ---------------------------------------------------------------

export function loadRows(): LeadRow[] {
  return read<LeadRow[]>(K_ROWS, []);
}

export function saveRows(rows: LeadRow[]) {
  write(K_ROWS, rows);
}

export function rowsFor(tabId: string): LeadRow[] {
  return loadRows()
    .filter((r) => r.tabId === tabId)
    .map((r) => ({...r, status: normalizeStatus(r.status as string)}))
    .sort((a, b) => a.order - b.order);
}

export function createRow(
  tabId: string,
  by: string,
  values: Record<string, string> = {}
): LeadRow {
  const all = loadRows();
  const maxOrder = all
    .filter((r) => r.tabId === tabId)
    .reduce((m, r) => Math.max(m, r.order), -1);
  const status: LeadStatus = isStatus(values.status ?? '') ? (values.status as LeadStatus) : 'new';
  const row: LeadRow = {
    id: newId('row'),
    tabId,
    order: maxOrder + 1,
    values: {...values},
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: by
  };
  saveRows([...all, row]);
  return row;
}

export function updateRow(id: string, patch: Partial<LeadRow>) {
  const rows = loadRows().map((r) =>
    r.id === id ? {...r, ...patch, values: {...r.values, ...(patch.values ?? {})}, updatedAt: Date.now()} : r
  );
  saveRows(rows);
}

export function setCell(rowId: string, colKey: string, value: string) {
  const rows = loadRows().map((r) =>
    r.id === rowId
      ? {
          ...r,
          values: {...r.values, [colKey]: value},
          status:
            colKey === 'status' && isStatus(value) ? (value as LeadStatus) : r.status,
          updatedAt: Date.now()
        }
      : r
  );
  saveRows(rows);
}

function isStatus(v: string): v is LeadStatus {
  return [
    'new',
    'contacted',
    'qualified',
    'meeting',
    'proposal',
    'negotiation',
    'pilot',
    'awaiting',
    'won',
    'lost'
  ].includes(v);
}

export function normalizeStatus(v: string): LeadStatus {
  if (isStatus(v)) return v;
  if (v in LEGACY_STATUS) return LEGACY_STATUS[v];
  return 'new';
}

export function deleteRow(id: string) {
  const rows = loadRows().filter((r) => r.id !== id);
  saveRows(rows);
}

export function reorderRows(tabId: string, orderedIds: string[]) {
  const all = loadRows();
  const byId = new Map(all.map((r) => [r.id, r]));
  const next = all.map((r) => {
    if (r.tabId !== tabId) return r;
    const newOrder = orderedIds.indexOf(r.id);
    return newOrder >= 0 ? {...r, order: newOrder} : r;
  });
  saveRows(next);
  void byId;
}

// ---- Managers & sessions ------------------------------------------------

export function loadManagers(): Manager[] {
  return read<Manager[]>(K_MANAGERS, []);
}

export function saveManagers(list: Manager[]) {
  write(K_MANAGERS, list);
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}:eng-leads-v1`);
}

export async function createManager(input: {
  username: string;
  name: string;
  password: string;
  role?: 'admin' | 'manager';
  canAddRemove?: boolean;
}): Promise<Manager | {error: string}> {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  if (!username || !name) return {error: 'bad_input'};
  if (input.password.length < 4) return {error: 'short_password'};
  const list = loadManagers();
  if (list.some((m) => m.username === username)) return {error: 'username_taken'};
  const salt = randomSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const manager: Manager = {
    username,
    name,
    passwordHash,
    salt,
    role: input.role ?? 'manager',
    canAddRemove: input.canAddRemove ?? false,
    createdAt: Date.now()
  };
  saveManagers([...list, manager]);
  return manager;
}

export async function authenticate(username: string, password: string): Promise<Manager | null> {
  const u = username.trim().toLowerCase();
  const m = loadManagers().find((x) => x.username === u);
  if (!m) return null;
  const expected = await hashPassword(password, m.salt);
  if (expected !== m.passwordHash) return null;
  return m;
}

export async function resetPassword(username: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < 4) return false;
  const list = loadManagers();
  const idx = list.findIndex((m) => m.username === username.trim().toLowerCase());
  if (idx < 0) return false;
  const salt = randomSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  list[idx] = {...list[idx], salt, passwordHash};
  saveManagers(list);
  return true;
}

export function setManagerPermission(username: string, canAddRemove: boolean) {
  const list = loadManagers().map((m) =>
    m.username === username ? {...m, canAddRemove} : m
  );
  saveManagers(list);
}

export function deleteManager(username: string) {
  saveManagers(loadManagers().filter((m) => m.username !== username));
}

// ---- Session ------------------------------------------------------------

export type Session = {username: string; role: 'admin' | 'manager'; name: string};

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(K_SESSION);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) sessionStorage.setItem(K_SESSION, JSON.stringify(session));
    else sessionStorage.removeItem(K_SESSION);
  } catch {}
}

export function currentManager(): Manager | null {
  const s = loadSession();
  if (!s) return null;
  return loadManagers().find((m) => m.username === s.username) ?? null;
}

// ---- Export -------------------------------------------------------------

export function exportTabJson(tabId: string) {
  const tab = loadTabs().find((t) => t.id === tabId);
  if (!tab) return '';
  const rows = rowsFor(tabId);
  return JSON.stringify({tab, rows}, null, 2);
}

export function exportTabCsv(tabId: string) {
  const tab = loadTabs().find((t) => t.id === tabId);
  if (!tab) return '';
  const rows = rowsFor(tabId);
  const escape = (v: string) => {
    const needs = v.includes(',') || v.includes('"') || v.includes('\n');
    const esc = v.replace(/"/g, '""');
    return needs ? `"${esc}"` : esc;
  };
  const header = tab.columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((r) =>
    tab.columns
      .map((c) => {
        if (c.key === 'status') return escape(STATUS_LABELS[r.status] ?? '');
        return escape(r.values[c.key] ?? '');
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export function downloadFile(filename: string, content: string, mime: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
