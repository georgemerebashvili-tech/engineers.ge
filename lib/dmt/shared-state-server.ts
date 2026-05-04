import 'server-only';
import {NextResponse} from 'next/server';
import {getCurrentDmtUser, type DmtUser} from '@/lib/dmt/auth';

export type DmtRouteAuth =
  | {me: DmtUser; response?: never}
  | {me?: never; response: NextResponse};

export async function requireDmtUser(): Promise<DmtRouteAuth> {
  const me = await getCurrentDmtUser();
  if (!me) return {response: NextResponse.json({error: 'unauthorized'}, {status: 401})};
  return {me};
}

export function dmtActor(me: DmtUser) {
  return (me.name || me.email || 'DMT').trim();
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error || 'server_error');
  return NextResponse.json({error: message}, {status});
}

export function parseNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatEditedAt(value: unknown): string {
  if (!value) return '';
  const raw = String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-GB').replace(',', '');
}

export function leadFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    company: String(row.company ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    source: String(row.source ?? 'website'),
    stage: String(row.stage ?? 'new'),
    owner: String(row.owner ?? ''),
    value: parseNumber(row.value),
    createdAt: String(row.created_at ?? ''),
    createdBy: String(row.created_by ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    updatedBy: String(row.updated_by ?? ''),
    fromContactId: row.from_contact_id ? String(row.from_contact_id) : null,
    offerStatus: String(row.offer_status ?? 'offer_in_progress'),
    labels: Array.isArray(row.labels) ? row.labels.map(String) : [],
    inventoryChecked: Boolean(row.inventory_checked),
    inventoryCheckedAt: row.inventory_checked_at ? String(row.inventory_checked_at) : null,
    inventoryCheckedBy: row.inventory_checked_by ? String(row.inventory_checked_by) : null,
    invoiceId: row.invoice_id ? String(row.invoice_id) : null,
    invoiceIssuedAt: row.invoice_issued_at ? String(row.invoice_issued_at) : null,
    offerDecidedAt: row.offer_decided_at ? String(row.offer_decided_at) : null,
    offerDecidedBy: row.offer_decided_by ? String(row.offer_decided_by) : null
  };
}

export function leadToDb(row: Record<string, unknown>, actor: string) {
  const now = new Date().toISOString();
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    company: String(row.company ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    source: String(row.source ?? 'website'),
    stage: String(row.stage ?? 'new'),
    owner: String(row.owner ?? ''),
    value: parseNumber(row.value),
    created_at: String(row.createdAt ?? row.created_at ?? now),
    created_by: String(row.createdBy ?? row.created_by ?? actor),
    updated_at: String(row.updatedAt ?? row.updated_at ?? now),
    updated_by: String(row.updatedBy ?? row.updated_by ?? actor),
    from_contact_id: row.fromContactId ? String(row.fromContactId) : null,
    offer_status: String(row.offerStatus ?? row.offer_status ?? 'offer_in_progress'),
    labels: Array.isArray(row.labels) ? row.labels.map(String) : [],
    inventory_checked: Boolean(row.inventoryChecked ?? row.inventory_checked),
    inventory_checked_at: toIsoOrNullable(row.inventoryCheckedAt ?? row.inventory_checked_at),
    inventory_checked_by: row.inventoryCheckedBy ? String(row.inventoryCheckedBy) : null,
    invoice_id: row.invoiceId ? String(row.invoiceId) : null,
    invoice_issued_at: toIsoOrNullable(row.invoiceIssuedAt ?? row.invoice_issued_at),
    offer_decided_at: toIsoOrNullable(row.offerDecidedAt ?? row.offer_decided_at),
    offer_decided_by: row.offerDecidedBy ? String(row.offerDecidedBy) : null
  };
}

export function contactFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    company: String(row.company ?? ''),
    position: String(row.position ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    source: String(row.source ?? 'manual'),
    notes: String(row.notes ?? ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    convertedToLeadId: row.converted_to_lead_id ? String(row.converted_to_lead_id) : null,
    convertedAt: row.converted_at ? String(row.converted_at) : null,
    convertedBy: row.converted_by ? String(row.converted_by) : null,
    createdAt: String(row.created_at ?? ''),
    createdBy: String(row.created_by ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    updatedBy: String(row.updated_by ?? '')
  };
}

export function contactToDb(row: Record<string, unknown>, actor: string) {
  const now = new Date().toISOString();
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    company: String(row.company ?? ''),
    position: String(row.position ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    source: String(row.source ?? 'manual'),
    notes: String(row.notes ?? ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    converted_to_lead_id: row.convertedToLeadId ? String(row.convertedToLeadId) : null,
    converted_at: row.convertedAt ? String(row.convertedAt) : null,
    converted_by: row.convertedBy ? String(row.convertedBy) : null,
    created_at: String(row.createdAt ?? row.created_at ?? now),
    created_by: String(row.createdBy ?? row.created_by ?? actor),
    updated_at: String(row.updatedAt ?? row.updated_at ?? now),
    updated_by: String(row.updatedBy ?? row.updated_by ?? actor)
  };
}

export function contactAuditFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    at: String(row.at ?? ''),
    by: String(row.by ?? ''),
    action: String(row.action ?? 'update'),
    contactId: String(row.contact_id ?? ''),
    contactLabel: String(row.contact_label ?? ''),
    column: row.column_key ? String(row.column_key) : undefined,
    columnLabel: row.column_label ? String(row.column_label) : undefined,
    before: row.before_val ? String(row.before_val) : undefined,
    after: row.after_val ? String(row.after_val) : undefined
  };
}

export function auditFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    at: String(row.at ?? ''),
    by: String(row.by ?? ''),
    action: String(row.action ?? 'update'),
    leadId: String(row.lead_id ?? ''),
    leadLabel: String(row.lead_label ?? ''),
    column: row.column_key ? String(row.column_key) : undefined,
    columnLabel: row.column_label ? String(row.column_label) : undefined,
    before: row.before_val ? String(row.before_val) : undefined,
    after: row.after_val ? String(row.after_val) : undefined
  };
}

export function manualLeadFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    company: String(row.company ?? ''),
    contact: String(row.contact ?? ''),
    phone: String(row.phone ?? ''),
    contract: row.contract === null || row.contract === undefined ? null : parseNumber(row.contract),
    status: String(row.status ?? 'ახალი'),
    role: String(row.role ?? ''),
    owner: String(row.owner ?? ''),
    period: String(row.period ?? ''),
    editedBy: String(row.edited_by ?? ''),
    editedAt: formatEditedAt(row.edited_at),
    createdBy: String(row.created_by ?? '')
  };
}

export function manualLeadToDb(row: Record<string, unknown>, actor: string) {
  return {
    id: String(row.id ?? ''),
    company: String(row.company ?? ''),
    contact: String(row.contact ?? ''),
    phone: String(row.phone ?? ''),
    contract: row.contract === null || row.contract === undefined || row.contract === ''
      ? null
      : parseNumber(row.contract),
    status: String(row.status ?? 'ახალი'),
    role: String(row.role ?? ''),
    owner: String(row.owner ?? ''),
    period: String(row.period ?? ''),
    edited_by: String(row.editedBy ?? row.edited_by ?? actor),
    edited_at: toIsoOrNow(row.editedAt ?? row.edited_at),
    created_by: String(row.createdBy ?? row.created_by ?? actor)
  };
}

export function extraColFromDb(row: Record<string, unknown>) {
  return {
    key: String(row.id ?? ''),
    label: String(row.label ?? ''),
    kind: String(row.kind ?? 'text'),
    width: parseNumber(row.width, 140),
    varSetId: row.var_set_id ? String(row.var_set_id) : undefined
  };
}

export function extraColToDb(col: Record<string, unknown>, position = 0) {
  return {
    id: String(col.key ?? col.id ?? ''),
    label: String(col.label ?? ''),
    kind: String(col.kind ?? 'text'),
    width: Math.round(parseNumber(col.width, 140)),
    var_set_id: col.varSetId ? String(col.varSetId) : null,
    options: Array.isArray(col.options) ? col.options : [],
    position
  };
}

export function variableSetFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    type: String(row.type ?? 'single'),
    options: Array.isArray(row.options) ? row.options : []
  };
}

export function variableSetToDb(set: Record<string, unknown>, position = 0) {
  return {
    id: String(set.id ?? ''),
    name: String(set.name ?? ''),
    type: String(set.type ?? 'single'),
    options: Array.isArray(set.options) ? set.options : [],
    position,
    updated_at: new Date().toISOString()
  };
}

export function pageScopeFromDb(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    label: String(row.label ?? ''),
    route: String(row.route ?? ''),
    icon: row.icon ? String(row.icon) : undefined,
    tables: Array.isArray(row.tables) ? row.tables : []
  };
}

export function pageScopeToDb(page: Record<string, unknown>, position = 0) {
  return {
    id: String(page.id ?? ''),
    label: String(page.label ?? ''),
    route: String(page.route ?? ''),
    icon: page.icon ? String(page.icon) : null,
    tables: Array.isArray(page.tables) ? page.tables : [],
    position,
    updated_at: new Date().toISOString()
  };
}

function toIsoOrNow(value: unknown) {
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toIsoOrNullable(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
