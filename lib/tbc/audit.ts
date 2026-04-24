import 'server-only';
import {headers} from 'next/headers';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type AuditInput = {
  actor: string;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export const TBC_ARCHIVE_RETENTION_DAYS = 360;

export type TbcArchivableRow = Record<string, unknown> & {
  archived_at?: string | null;
};

export type TbcDeviceRow = Record<string, unknown> & {
  archived_at?: string | null;
  archived_by?: string | null;
  archive_expires_at?: string | null;
  archive_reason?: string | null;
};

export function getTbcArchiveExpiry(archivedAt = new Date()): string {
  const next = new Date(archivedAt);
  next.setDate(next.getDate() + TBC_ARCHIVE_RETENTION_DAYS);
  return next.toISOString();
}

export function isArchivedRow(row: TbcArchivableRow | null | undefined): boolean {
  return typeof row?.archived_at === 'string' && row.archived_at.length > 0;
}

export function listActiveDevices(devices: unknown[] | null | undefined): TbcDeviceRow[] {
  return Array.isArray(devices)
    ? devices.filter((device): device is TbcDeviceRow => {
        return Boolean(device && typeof device === 'object' && !isArchivedRow(device as TbcArchivableRow));
      })
    : [];
}

export function listArchivedDevices(devices: unknown[] | null | undefined): TbcDeviceRow[] {
  return Array.isArray(devices)
    ? devices.filter((device): device is TbcDeviceRow => {
        return Boolean(device && typeof device === 'object' && isArchivedRow(device as TbcArchivableRow));
      })
    : [];
}

export function findActiveDeviceEntry(
  devices: unknown[] | null | undefined,
  activeIndex: number
): {rawIndex: number; device: TbcDeviceRow} | null {
  if (!Array.isArray(devices) || activeIndex < 0) return null;
  let seen = -1;
  for (let rawIndex = 0; rawIndex < devices.length; rawIndex += 1) {
    const candidate = devices[rawIndex];
    if (!candidate || typeof candidate !== 'object') continue;
    if (isArchivedRow(candidate as TbcArchivableRow)) continue;
    seen += 1;
    if (seen === activeIndex) {
      return {rawIndex, device: candidate as TbcDeviceRow};
    }
  }
  return null;
}

export function archiveDevice(
  device: TbcDeviceRow,
  actor: string,
  reason: string,
  archivedAt = new Date().toISOString()
): TbcDeviceRow {
  return {
    ...device,
    archived_at: archivedAt,
    archived_by: actor,
    archive_expires_at: getTbcArchiveExpiry(new Date(archivedAt)),
    archive_reason: reason
  };
}

export function mergeBranchDevices(
  incomingDevices: unknown[] | null | undefined,
  existingDevices: unknown[] | null | undefined
): TbcDeviceRow[] {
  const activeIncoming = listActiveDevices(incomingDevices);
  const archivedMerged = [...listArchivedDevices(existingDevices), ...listArchivedDevices(incomingDevices)];
  const archivedSeen = new Set<string>();
  const dedupedArchived = archivedMerged.filter((device) => {
    const key = JSON.stringify(device);
    if (archivedSeen.has(key)) return false;
    archivedSeen.add(key);
    return true;
  });
  return [...activeIncoming, ...dedupedArchived];
}

export async function writeAudit(input: AuditInput) {
  try {
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null;
    const ua = h.get('user-agent') || null;

    await supabaseAdmin().from('tbc_audit_log').insert({
      actor: input.actor,
      action: input.action,
      target_type: input.targetType || null,
      target_id:
        input.targetId === null || input.targetId === undefined
          ? null
          : String(input.targetId),
      summary: input.summary || null,
      metadata: input.metadata || {},
      ip,
      user_agent: ua
    });
  } catch (e) {
    // Never block the actual request on audit failure
    console.error('[tbc audit] write failed', e);
  }
}

/**
 * Compute a shallow diff of user-edited fields between two branch snapshots.
 * Skips device/inventory payloads (too large) and updated_* metadata.
 */
export function diffBranch(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): Record<string, {before: unknown; after: unknown}> {
  const skip = new Set([
    'devices',
    'inventory_items',
    'updated_at',
    'updated_by',
    'id'
  ]);
  const out: Record<string, {before: unknown; after: unknown}> = {};
  if (!before) {
    for (const [k, v] of Object.entries(after)) {
      if (skip.has(k)) continue;
      if (v !== null && v !== '' && v !== 0) out[k] = {before: null, after: v};
    }
    return out;
  }
  for (const k of Object.keys(after)) {
    if (skip.has(k)) continue;
    const a = after[k];
    const b = before[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = {before: b ?? null, after: a ?? null};
    }
  }
  return out;
}

export function truncate(s: string | null | undefined, n = 500): string | null {
  if (!s) return null;
  return s.length > n ? s.slice(0, n) + '…' : s;
}
