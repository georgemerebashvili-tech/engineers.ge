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
