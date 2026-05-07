
import {apiJson} from '@/lib/dmt/api';

export type ContactSource = 'manual' | 'import' | 'website' | 'referral' | 'event' | 'cold-call';
export type ManualOfferStatus = 'offer_in_progress' | 'offer_accepted' | 'offer_rejected';
export type TagCategory = 'funnel' | 'quality' | 'industry' | 'channel' | 'priority' | 'general';
export type TagSuggestion = {
  tag: string;
  emoji: string;
  category: TagCategory;
  description: string;
  useCount: number;
  pinned: boolean;
};

export type Contact = {
  id: string;
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  source: ContactSource;
  notes: string;
  tags: string[];
  convertedToLeadId: string | null;
  convertedAt: string | null;
  convertedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type ContactAuditEntry = {
  id: string;
  at: string;
  by: string;
  action: 'create' | 'update' | 'delete' | 'convert';
  contactId: string;
  contactLabel: string;
  column?: string;
  columnLabel?: string;
  before?: string;
  after?: string;
};

export type ConvertContactBody = {
  stage?: string;
  source?: string;
  owner?: string;
  value?: number;
};

export type ContactColumnKey =
  | 'id'
  | 'name'
  | 'company'
  | 'position'
  | 'phone'
  | 'email'
  | 'tags'
  | 'source'
  | 'convertedTo'
  | 'notes'
  | 'createdAt'
  | 'createdBy'
  | 'updatedBy'
  | 'updatedAt';

export const CONTACT_COLUMN_ORDER: ContactColumnKey[] = [
  'id',
  'name',
  'company',
  'position',
  'phone',
  'email',
  'tags',
  'source',
  'convertedTo',
  'notes',
  'createdAt',
  'createdBy',
  'updatedBy',
  'updatedAt'
];

const K = {
  order: 'dmt_contacts_col_order_v1',
  widths: 'dmt_contacts_col_widths_v1'
} as const;

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const SOURCE_ORDER: ContactSource[] = ['manual', 'import', 'website', 'referral', 'event', 'cold-call'];

export const SOURCE_META: Record<ContactSource, {label: string; bg: string; color: string; border: string}> = {
  manual: {label: 'Manual', bg: 'var(--sur-2)', color: 'var(--text-2)', border: 'var(--bdr)'},
  import: {label: 'Import', bg: 'var(--blue-lt)', color: 'var(--blue)', border: 'var(--blue-bd)'},
  website: {label: 'Website', bg: 'var(--grn-lt)', color: 'var(--grn)', border: 'var(--grn-bd)'},
  referral: {label: 'Referral', bg: 'var(--ora-lt)', color: 'var(--ora)', border: 'var(--ora-bd)'},
  event: {label: 'Event', bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd'},
  'cold-call': {label: 'Cold call', bg: 'var(--sur-2)', color: 'var(--navy)', border: 'var(--bdr-2)'},
};

export async function loadContacts(): Promise<Contact[]> {
  const data = await apiJson<{contacts: Contact[]}>('/api/dmt/contacts');
  return data.contacts ?? [];
}

export async function loadContactsAudit(): Promise<ContactAuditEntry[]> {
  const data = await apiJson<{audit: ContactAuditEntry[]}>('/api/dmt/contacts/audit');
  return data.audit ?? [];
}

export async function createContact(contact: Contact): Promise<{contact: Contact; auditEntry: ContactAuditEntry | null}> {
  return apiJson('/api/dmt/contacts', {method: 'POST', body: JSON.stringify(contact)});
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>,
): Promise<{contact: Contact; auditEntries: ContactAuditEntry[]}> {
  return apiJson(`/api/dmt/contacts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteContact(id: string): Promise<{ok: boolean; auditEntry: ContactAuditEntry | null}> {
  return apiJson(`/api/dmt/contacts/${encodeURIComponent(id)}`, {method: 'DELETE'});
}

export async function convertContactToLead(
  id: string,
  body: ConvertContactBody,
): Promise<{contact: Contact; lead: {id: string; [k: string]: unknown}; contactAuditEntry: ContactAuditEntry | null}> {
  return apiJson(`/api/dmt/contacts/${encodeURIComponent(id)}/convert`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function unlinkLeadFromContact(
  id: string,
): Promise<{contact: Contact; deletedLeadId: string; contactAuditEntry: ContactAuditEntry | null}> {
  return apiJson(`/api/dmt/contacts/${encodeURIComponent(id)}/unlink-lead`, {
    method: 'POST',
  });
}

export function nextContactId(rows: Contact[]) {
  let max = 0;
  for (const row of rows) {
    const n = Number(row.id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function emptyContact(rows: Contact[], actor: string): Contact {
  const now = new Date().toISOString();
  return {
    id: nextContactId(rows),
    name: '',
    company: '',
    position: '',
    phone: '',
    email: '',
    source: 'manual',
    notes: '',
    tags: [],
    convertedToLeadId: null,
    convertedAt: null,
    convertedBy: null,
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
  };
}

export function loadColumnOrder(): ContactColumnKey[] {
  const saved = loadLocal<string[]>(K.order, []);
  const valid = saved.filter((key): key is ContactColumnKey =>
    CONTACT_COLUMN_ORDER.includes(key as ContactColumnKey)
  );
  for (const key of CONTACT_COLUMN_ORDER) {
    if (!valid.includes(key)) valid.push(key);
  }
  return valid.length ? valid : [...CONTACT_COLUMN_ORDER];
}

export function saveColumnOrder(order: ContactColumnKey[]) {
  saveLocal(K.order, order);
}

export function loadColumnWidths(): Record<string, number> {
  return loadLocal<Record<string, number>>(K.widths, {});
}

export function saveColumnWidths(widths: Record<string, number>) {
  saveLocal(K.widths, widths);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB').replace(',', '');
  } catch {
    return iso;
  }
}
