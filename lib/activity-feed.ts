import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

/**
 * Unified activity feed for /admin/activity. Merges recent events from every
 * log table into a single chronological stream with normalized shape.
 *
 * Each source is fetched in parallel with a small limit; results are merged
 * and sorted by created_at DESC. Any source that fails silently returns [].
 */

export type ActivityKind =
  | 'bug'
  | 'error'
  | 'not-found'
  | 'consent'
  | 'audit'
  | 'user-registered';

export type ActivityEntry = {
  kind: ActivityKind;
  id: string;
  title: string;
  detail?: string;
  pathname?: string | null;
  actor?: string | null;
  created_at: string;
  link?: string;
  severity: 'info' | 'warn' | 'error' | 'success';
};

async function fetchBugs(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('bug_reports')
      .select('id,pathname,message,status,created_at')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: string;
      pathname: string;
      message: string;
      status: string;
      created_at: string;
    }[]).map((r) => ({
      kind: 'bug' as const,
      id: `bug:${r.id}`,
      title: r.message.slice(0, 120),
      pathname: r.pathname,
      created_at: r.created_at,
      link: '/admin/bug-reports',
      severity: r.status === 'resolved' ? 'success' : 'warn'
    }));
  } catch {
    return [];
  }
}

async function fetchErrors(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('error_events')
      .select('id,pathname,message,kind,resolved,created_at')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: number;
      pathname: string;
      message: string;
      kind: string;
      resolved: boolean;
      created_at: string;
    }[]).map((r) => ({
      kind: 'error' as const,
      id: `error:${r.id}`,
      title: r.message.slice(0, 120),
      detail: `${r.kind}${r.resolved ? ' · resolved' : ''}`,
      pathname: r.pathname,
      created_at: r.created_at,
      link: '/admin/errors',
      severity: r.resolved ? 'success' : 'error'
    }));
  } catch {
    return [];
  }
}

async function fetchNotFounds(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('not_found_events')
      .select('id,pathname,referrer,created_at')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: number;
      pathname: string;
      referrer: string | null;
      created_at: string;
    }[]).map((r) => ({
      kind: 'not-found' as const,
      id: `404:${r.id}`,
      title: `404 ${r.pathname}`,
      detail: r.referrer ? `ref: ${r.referrer}` : undefined,
      pathname: r.pathname,
      created_at: r.created_at,
      link: '/admin/404s',
      severity: 'warn'
    }));
  } catch {
    return [];
  }
}

async function fetchConsent(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('consent_log')
      .select('id,analytics,marketing,action,pathname,created_at')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: number;
      analytics: boolean;
      marketing: boolean;
      action: string;
      pathname: string | null;
      created_at: string;
    }[]).map((r) => {
      const levels = [r.analytics && 'analytics', r.marketing && 'marketing']
        .filter(Boolean)
        .join(' + ') || 'essential-only';
      return {
        kind: 'consent' as const,
        id: `consent:${r.id}`,
        title: `Consent: ${levels}`,
        detail: r.action,
        pathname: r.pathname,
        created_at: r.created_at,
        link: '/admin/consent-log',
        severity: 'info' as const
      };
    });
  } catch {
    return [];
  }
}

async function fetchAudit(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('admin_audit_log')
      .select('id,actor,action,target_type,target_id,created_at')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: number;
      actor: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      created_at: string;
    }[]).map((r) => ({
      kind: 'audit' as const,
      id: `audit:${r.id}`,
      title: r.action,
      detail: [r.target_type, r.target_id].filter(Boolean).join(':'),
      actor: r.actor,
      created_at: r.created_at,
      link: '/admin/audit-log',
      severity: 'info'
    }));
  } catch {
    return [];
  }
}

async function fetchNewUsers(limit: number): Promise<ActivityEntry[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('users')
      .select('id,email,name,registered_at,source')
      .order('registered_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as {
      id: string;
      email: string;
      name: string | null;
      registered_at: string;
      source: string | null;
    }[]).map((r) => ({
      kind: 'user-registered' as const,
      id: `user:${r.id}`,
      title: `ახალი user: ${r.name ?? r.email}`,
      detail: r.source ?? 'self',
      created_at: r.registered_at,
      link: '/admin/users',
      severity: 'success'
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch a unified activity stream. `perSource` caps individual fetches (so a
 * single noisy source doesn't dominate); total stream will be at most
 * 6 × perSource entries after merge.
 */
export async function getActivityFeed(perSource = 50): Promise<ActivityEntry[]> {
  const sources = await Promise.all([
    fetchBugs(perSource),
    fetchErrors(perSource),
    fetchNotFounds(perSource),
    fetchConsent(perSource),
    fetchAudit(perSource),
    fetchNewUsers(perSource)
  ]);
  return sources
    .flat()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/** Per-kind counts for filter badges. */
export function groupByKind(entries: ActivityEntry[]): Record<ActivityKind, number> {
  const out: Record<ActivityKind, number> = {
    bug: 0,
    error: 0,
    'not-found': 0,
    consent: 0,
    audit: 0,
    'user-registered': 0
  };
  for (const e of entries) out[e.kind]++;
  return out;
}
