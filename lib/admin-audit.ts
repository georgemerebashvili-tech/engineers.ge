import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
};

export type LogInput = {
  actor: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Fire-and-forget logger. Swallows all errors — audit logging must never
 * break the underlying admin action.
 */
export async function logAdminAction(input: LogInput): Promise<void> {
  try {
    await supabaseAdmin()
      .from('admin_audit_log')
      .insert({
        actor: input.actor,
        action: input.action,
        target_type: input.target_type ?? null,
        target_id: input.target_id ?? null,
        metadata: input.metadata ?? {},
        // IPs are truncated (/24 v4, /64 v6) — traceable to network but not host.
        ip: anonymizeIp(input.ip)
      });
  } catch {
    // Migration 0017 not applied, DB offline, etc. — skip silently.
  }
}

export function getIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() ?? null;
}

/**
 * Truncates an IPv4 to /24 (last octet → 0) and IPv6 to /64.
 * Admin audit logs need "who/when approximately" for traceability, but storing
 * raw IPs creates breach-blast-radius risk. Truncation keeps geolocation
 * precision (~same city) while anonymizing the specific host.
 */
export function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const raw = ip.trim();
  if (!raw) return null;
  // IPv4: a.b.c.d → a.b.c.0
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(raw)) {
    const parts = raw.split('.');
    parts[3] = '0';
    return parts.join('.') + '/24';
  }
  // IPv6: keep first 4 hextets (64 bits), zero the rest
  if (raw.includes(':')) {
    const parts = raw.split(':');
    const head = parts.slice(0, 4).join(':');
    return `${head}::/64`;
  }
  return null;
}

export async function listAuditEntries(opts?: {
  actor?: string;
  action?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  try {
    let q = supabaseAdmin()
      .from('admin_audit_log')
      .select('*')
      .order('created_at', {ascending: false})
      .limit(opts?.limit ?? 200);
    if (opts?.actor) q = q.eq('actor', opts.actor);
    if (opts?.action) q = q.ilike('action', `${opts.action}%`);
    const {data, error} = await q;
    if (error) throw error;
    return (data ?? []) as AuditEntry[];
  } catch {
    return [];
  }
}

/** Distinct actions seen — powers filter dropdown. */
export async function listAuditActions(): Promise<string[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('admin_audit_log')
      .select('action')
      .order('action');
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((r: {action: string}) => r.action)));
  } catch {
    return [];
  }
}
