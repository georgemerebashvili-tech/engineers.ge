import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type CspViolation = {
  id: number;
  document_uri: string | null;
  blocked_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  original_policy: string | null;
  source_file: string | null;
  line_number: number | null;
  column_number: number | null;
  sample: string | null;
  disposition: string | null;
  user_agent: string | null;
  visitor_id: string | null;
  created_at: string;
};

/**
 * Payload shape for both classic `report-uri` (legacy CSP) and newer
 * `report-to` (Reporting API). We accept either since browser support is
 * mixed — both are coalesced into the same table row.
 */
export type CspReportPayload = {
  'document-uri'?: string;
  documentURL?: string;
  'blocked-uri'?: string;
  blockedURL?: string;
  'violated-directive'?: string;
  'effective-directive'?: string;
  effectiveDirective?: string;
  'original-policy'?: string;
  originalPolicy?: string;
  'source-file'?: string;
  sourceFile?: string;
  'line-number'?: number;
  lineNumber?: number;
  'column-number'?: number;
  columnNumber?: number;
  'script-sample'?: string;
  sample?: string;
  disposition?: string;
};

export async function createCspViolation(
  raw: CspReportPayload,
  context: {user_agent?: string | null; visitor_id?: string | null}
): Promise<void> {
  try {
    await supabaseAdmin()
      .from('csp_violations')
      .insert({
        document_uri: raw['document-uri'] ?? raw.documentURL ?? null,
        blocked_uri: raw['blocked-uri'] ?? raw.blockedURL ?? null,
        violated_directive: raw['violated-directive'] ?? null,
        effective_directive:
          raw['effective-directive'] ?? raw.effectiveDirective ?? null,
        original_policy:
          (raw['original-policy'] ?? raw.originalPolicy ?? null)?.slice(0, 4000) ??
          null,
        source_file: raw['source-file'] ?? raw.sourceFile ?? null,
        line_number: raw['line-number'] ?? raw.lineNumber ?? null,
        column_number: raw['column-number'] ?? raw.columnNumber ?? null,
        sample: (raw['script-sample'] ?? raw.sample ?? null)?.slice(0, 500) ?? null,
        disposition: raw.disposition ?? null,
        user_agent: context.user_agent?.slice(0, 500) ?? null,
        visitor_id: context.visitor_id?.slice(0, 100) ?? null
      });
  } catch {
    // swallow — CSP reporter must never cascade
  }
}

export async function listCspViolations(limit = 500): Promise<CspViolation[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('csp_violations')
      .select('*')
      .order('created_at', {ascending: false})
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as CspViolation[];
  } catch {
    return [];
  }
}

export type CspGroup = {
  directive: string;
  blocked_uri: string;
  count: number;
  latest_at: string;
};

/** Aggregated view: violations grouped by (directive, blocked_uri) for triage. */
export async function groupCspViolations(): Promise<CspGroup[]> {
  const rows = await listCspViolations(1000);
  const map = new Map<string, CspGroup>();
  for (const r of rows) {
    const directive = r.violated_directive ?? r.effective_directive ?? 'unknown';
    const blocked = r.blocked_uri ?? 'inline';
    const key = `${directive}::${blocked}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      if (r.created_at > existing.latest_at) existing.latest_at = r.created_at;
    } else {
      map.set(key, {
        directive,
        blocked_uri: blocked,
        count: 1,
        latest_at: r.created_at
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
