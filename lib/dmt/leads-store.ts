// Client-side store for DMT leads grid — persists to localStorage.
// - Fully editable rows with per-row create/update audit metadata
// - Column registry drives table rendering + filters + audit labels (single source of truth)
// - Column order, widths, and filter state persisted per user/browser
//
// The rows live in localStorage today (matching the `/dmt/leads/manual` page).
// When we wire this to Supabase later, only the storage layer here needs to change.

import {STAGE_META, type Source, type Stage} from '@/lib/dmt/leads-data';

export {STAGE_META};
export type {Source, Stage};

export const STAGE_ORDER: Stage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost'
];

export const SOURCE_ORDER: Source[] = [
  'website',
  'referral',
  'cold',
  'social',
  'facebook',
  'linkedin'
];

export type OfferStatus = 'offer_in_progress' | 'offer_accepted' | 'offer_rejected';

export const OFFER_STATUS_ORDER: OfferStatus[] = [
  'offer_in_progress',
  'offer_accepted',
  'offer_rejected'
];

export const OFFER_STATUS_META: Record<
  OfferStatus,
  {label: string; color: string; bg: string; border: string; icon: 'play' | 'check' | 'x'}
> = {
  offer_in_progress: {label: 'ოფერის გაკეთება', color: 'var(--ora)', bg: 'var(--ora-lt)', border: 'var(--ora-bd)', icon: 'play'},
  offer_accepted: {label: 'მიღებულია', color: 'var(--grn)', bg: 'var(--grn-lt)', border: 'var(--grn-bd)', icon: 'check'},
  offer_rejected: {label: 'უარყოფილი', color: 'var(--red)', bg: 'var(--red-lt)', border: '#f0b8b4', icon: 'x'},
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: Source;
  stage: Stage;
  owner: string;
  value: number;
  /** ISO date (UTC). */
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  fromContactId: string | null;
  offerStatus: OfferStatus;
  labels: string[];
  inventoryChecked: boolean;
  inventoryCheckedAt: string | null;
  inventoryCheckedBy: string | null;
  invoiceId: string | null;
  invoiceIssuedAt: string | null;
  offerDecidedAt: string | null;
  offerDecidedBy: string | null;
};

export type ColumnKind =
  | 'id'
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'stage'
  | 'offerStatus'
  | 'labels'
  | 'source'
  | 'owner'
  | 'author';

export type LeadColumn = {
  key: keyof Lead;
  label: string;
  kind: ColumnKind;
  width: number;
  align?: 'right';
  /** read-only column — user cannot edit the cell directly. */
  readonly?: boolean;
};

export const LEAD_COLUMNS: Record<string, LeadColumn> = {
  id:         {key: 'id',         label: 'ID',           kind: 'id',     width: 90,  readonly: true},
  name:       {key: 'name',       label: 'კონტაქტი',     kind: 'text',   width: 170},
  company:    {key: 'company',    label: 'კომპანია',     kind: 'text',   width: 180},
  labels:     {key: 'labels',     label: 'იარლიყები',    kind: 'labels', width: 190},
  phone:      {key: 'phone',      label: 'ტელეფონი',     kind: 'phone',  width: 160},
  email:      {key: 'email',      label: 'Email',        kind: 'email',  width: 200},
  source:     {key: 'source',     label: 'წყარო',        kind: 'source', width: 120},
  stage:      {key: 'stage',      label: 'სტადია',       kind: 'stage',  width: 140},
  offerStatus: {key: 'offerStatus', label: 'სტატუსი',     kind: 'offerStatus', width: 190},
  owner:      {key: 'owner',      label: 'მფლ.',         kind: 'owner',  width: 110},
  value:      {key: 'value',      label: 'ღირებ. ₾',     kind: 'number', width: 120, align: 'right'},
  createdAt:  {key: 'createdAt',  label: 'დამატებულია',  kind: 'date',   width: 140, readonly: true},
  createdBy:  {key: 'createdBy',  label: 'ვინ დაამატა',  kind: 'author', width: 140, readonly: true},
  updatedAt:  {key: 'updatedAt',  label: 'ბოლო რედ.',    kind: 'date',   width: 140, readonly: true},
  updatedBy:  {key: 'updatedBy',  label: 'რედ. ავტორი',  kind: 'author', width: 140, readonly: true}
};

export const DEFAULT_COLUMN_ORDER: (keyof Lead)[] = [
  'id',
  'name',
  'company',
  'phone',
  'email',
  'source',
  'offerStatus',
  'owner',
  'value',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];

export type AuditAction = 'create' | 'update' | 'delete';

export type LeadAuditEntry = {
  id: string;
  at: string; // ISO
  by: string;
  action: AuditAction;
  leadId: string;
  leadLabel: string;
  /** Column key (from LEAD_COLUMNS) — present on 'update'. */
  column?: string;
  /** Column label snapshot — survives column renames. */
  columnLabel?: string;
  before?: string;
  after?: string;
};

export type FilterState = Partial<Record<keyof Lead, string>>;

const K = {
  leads: 'dmt_leads_v1',
  audit: 'dmt_leads_audit_v1',
  order: 'dmt_leads_col_order_v1',
  widths: 'dmt_leads_col_widths_v1',
  filters: 'dmt_leads_filters_v1',
  me: 'dmt_me_display_v1'
} as const;

export const LEADS_LOCAL_KEY = K.leads;
export const LEADS_AUDIT_LOCAL_KEY = K.audit;
export const LEADS_MIGRATED_KEY = 'dmt_leads_pg_migrated_v1';

// ─── Identity ────────────────────────────────────────────────────────────────
export function getActor(): string {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(K.me);
    if (saved) return saved;
  } catch {}
  return '';
}

export function setActor(name: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(K.me, name);
  } catch {}
}

// ─── Persistence helpers ─────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── Leads ────────────────────────────────────────────────────────────────────
async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'content-type': 'application/json', ...(init?.headers ?? {})},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(String(body?.error ?? `Request failed: ${res.status}`));
  }
  return res.json() as Promise<T>;
}

export async function loadLeads(): Promise<Lead[]> {
  const data = await apiJson<{leads: Lead[]}>('/api/dmt/leads');
  return data.leads ?? [];
}

export async function createLead(lead: Lead): Promise<{lead: Lead; auditEntry: LeadAuditEntry | null}> {
  return apiJson('/api/dmt/leads', {method: 'POST', body: JSON.stringify(lead)});
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>
): Promise<{lead: Lead; auditEntries: LeadAuditEntry[]}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteLead(id: string): Promise<{ok: boolean; auditEntry: LeadAuditEntry | null}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}`, {method: 'DELETE'});
}

export async function checkLeadInventory(id: string): Promise<{lead: Lead; auditEntry: LeadAuditEntry | null}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}/inventory-check`, {method: 'POST'});
}

export async function decideLeadOffer(
  id: string,
  outcome: 'accepted' | 'rejected'
): Promise<{lead: Lead; auditEntry: LeadAuditEntry | null; missing?: string[]}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}/decide`, {
    method: 'POST',
    body: JSON.stringify({outcome}),
  });
}

export async function setLeadLabels(
  id: string,
  labels: string[]
): Promise<{lead: Lead; auditEntry: LeadAuditEntry | null}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}/labels`, {
    method: 'PATCH',
    body: JSON.stringify({labels}),
  });
}

export async function generateLeadInvoice(id: string): Promise<{lead: Lead; auditEntry: LeadAuditEntry | null}> {
  return apiJson(`/api/dmt/leads/${encodeURIComponent(id)}/invoice`, {method: 'POST'});
}

export async function loadLabelSuggestions(): Promise<string[]> {
  const data = await apiJson<{labels: string[]}>('/api/dmt/leads/labels/suggestions');
  return data.labels ?? [];
}

export async function importLocalLeadsOnce() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(LEADS_MIGRATED_KEY)) return;
  const leads = load<Lead[]>(K.leads, []);
  const audit = load<LeadAuditEntry[]>(K.audit, []);
  if (leads.length || audit.length) {
    await apiJson('/api/dmt/leads/bulk-import', {
      method: 'POST',
      body: JSON.stringify({leads, audit}),
    });
    localStorage.removeItem(K.leads);
    localStorage.removeItem(K.audit);
  }
  localStorage.setItem(LEADS_MIGRATED_KEY, '1');
}

export function nextLeadId(rows: Lead[]): string {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function emptyLead(rows: Lead[], actor: string): Lead {
  const now = new Date().toISOString();
  return {
    id: nextLeadId(rows),
    name: '',
    company: '',
    phone: '',
    email: '',
    source: 'website',
    stage: 'new',
    owner: '',
    value: 0,
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    fromContactId: null,
    offerStatus: 'offer_in_progress',
    labels: [],
    inventoryChecked: false,
    inventoryCheckedAt: null,
    inventoryCheckedBy: null,
    invoiceId: null,
    invoiceIssuedAt: null,
    offerDecidedAt: null,
    offerDecidedBy: null
  };
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export async function loadAudit(): Promise<LeadAuditEntry[]> {
  const data = await apiJson<{audit: LeadAuditEntry[]}>('/api/dmt/leads/audit');
  return data.audit ?? [];
}

export async function appendAudit(entry: Omit<LeadAuditEntry, 'id' | 'at'>) {
  const data = await apiJson<{entry: LeadAuditEntry}>('/api/dmt/leads/audit', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  return data.entry;
}

export async function clearAudit() {
  return;
}

// ─── Column order / widths / filters ────────────────────────────────────────
export function loadColumnOrder(): (keyof Lead)[] {
  const saved = load<string[]>(K.order, []);
  const valid = saved.filter((k) => k in LEAD_COLUMNS && k !== 'labels') as (keyof Lead)[];
  if (valid.length === 0) return [...DEFAULT_COLUMN_ORDER];
  // Append any column that was added after the order was saved.
  for (const k of DEFAULT_COLUMN_ORDER) {
    if (!valid.includes(k)) valid.push(k);
  }
  return valid;
}

export function saveColumnOrder(order: (keyof Lead)[]) {
  save(K.order, order);
}

export function loadColumnWidths(): Record<string, number> {
  return load<Record<string, number>>(K.widths, {});
}

export function saveColumnWidths(w: Record<string, number>) {
  save(K.widths, w);
}

export function loadFilters(): FilterState {
  return load<FilterState>(K.filters, {});
}

export function saveFilters(f: FilterState) {
  save(K.filters, f);
}

// ─── Diff helper ─────────────────────────────────────────────────────────────
export function diffLead(
  before: Lead,
  after: Lead
): Array<{key: keyof Lead; before: unknown; after: unknown}> {
  const keys = Object.keys(after) as (keyof Lead)[];
  const out: Array<{key: keyof Lead; before: unknown; after: unknown}> = [];
  for (const k of keys) {
    if (k === 'updatedAt' || k === 'updatedBy') continue;
    if (before[k] !== after[k]) out.push({key: k, before: before[k], after: after[k]});
  }
  return out;
}

// ─── Formatting ──────────────────────────────────────────────────────────────
export function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB').replace(',', '');
  } catch {
    return iso;
  }
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
