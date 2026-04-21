import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

/**
 * Admin backup/export. Dumps selected tables as JSON so the admin can:
 *   1. Back up before a risky migration (`npm run db:migrate` on prod)
 *   2. Archive data before deletion
 *   3. Fulfil data-export requests (GDPR Article 15)
 *
 * Only curated tables are exportable — raw Supabase `auth.*` schemas and
 * internal rate_limits/_schema_migrations are intentionally excluded.
 */

export type BackupTable = {
  key: string;
  table: string;
  label: string;
  description: string;
  /** Omit from exports if null — table might not exist in all envs. */
  optional?: boolean;
};

export const BACKUPABLE_TABLES: BackupTable[] = [
  {
    key: 'users',
    table: 'users',
    label: 'Users',
    description: 'რეგისტრირებული user-ები (email, name, language, country_id).'
  },
  {
    key: 'referred_contacts',
    table: 'referred_contacts',
    label: 'Referred contacts',
    description: 'მოწვეული კონტაქტები + referral attribution.',
    optional: true
  },
  {
    key: 'bug_reports',
    table: 'bug_reports',
    label: 'Bug reports',
    description: 'ხარვეზის შეტყობინებები test-mode banner-იდან.'
  },
  {
    key: 'error_events',
    table: 'error_events',
    label: 'Frontend errors',
    description: 'Client-side crash-ების log.'
  },
  {
    key: 'not_found_events',
    table: 'not_found_events',
    label: '404 events',
    description: 'Broken URL tracking.'
  },
  {
    key: 'consent_log',
    table: 'consent_log',
    label: 'Cookie consent log',
    description: 'GDPR audit trail — ვინ რას დაეთანხმა.'
  },
  {
    key: 'admin_audit_log',
    table: 'admin_audit_log',
    label: 'Admin audit log',
    description: 'ყოველი admin action — actor/target/metadata/ip.'
  },
  {
    key: 'feature_flags',
    table: 'feature_flags',
    label: 'Feature flags',
    description: 'Active/test/hidden state per feature.'
  },
  {
    key: 'redirects',
    table: 'redirects',
    label: 'URL redirects',
    description: 'Admin-editable redirect map.'
  },
  {
    key: 'hero_ad_slots',
    table: 'hero_ad_slots',
    label: 'Hero ad slots',
    description: 'Landing page treemap ads (image, link, client, price).'
  },
  {
    key: 'hero_ad_payments',
    table: 'hero_ad_payments',
    label: 'Hero ad payments',
    description: 'Ad finance ledger — invoices, due dates, paid-through periods.',
    optional: true
  },
  {
    key: 'hero_ad_upload_requests',
    table: 'hero_ad_upload_requests',
    label: 'Hero ad upload requests',
    description: 'Public client banner submissions pending admin approval.',
    optional: true
  },
  {
    key: 'page_views',
    table: 'page_views',
    label: 'Page views (analytics)',
    description: '⚠ დიდი ცხრილი — ათასობით row-ი.',
    optional: true
  },
  {
    key: 'calc_events',
    table: 'calc_events',
    label: 'Calculator events',
    description: 'Per-calc usage tracking.',
    optional: true
  },
  {
    key: 'web_vitals',
    table: 'web_vitals',
    label: 'Web Vitals',
    description: 'Performance metrics (LCP/CLS/INP…).'
  },
  {
    key: 'csp_violations',
    table: 'csp_violations',
    label: 'CSP violations',
    description: 'Browser-reported CSP blocks.'
  }
];

export async function exportTable(table: string): Promise<Record<string, unknown>[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from(table)
      .select('*')
      .limit(50000);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export type BackupPayload = {
  exported_at: string;
  site: string;
  tables: Record<string, {count: number; rows: Record<string, unknown>[]}>;
};

export async function buildBackup(tableKeys: string[]): Promise<BackupPayload> {
  const known = new Set(BACKUPABLE_TABLES.map((t) => t.key));
  const selected = tableKeys.filter((k) => known.has(k));

  const out: BackupPayload = {
    exported_at: new Date().toISOString(),
    site: process.env.NEXT_PUBLIC_SITE_URL ?? 'engineers.ge',
    tables: {}
  };

  for (const key of selected) {
    const def = BACKUPABLE_TABLES.find((t) => t.key === key)!;
    const rows = await exportTable(def.table);
    out.tables[def.table] = {count: rows.length, rows};
  }
  return out;
}

/** Row-count per backupable table for admin UI preview. */
export async function getTableCounts(): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  await Promise.all(
    BACKUPABLE_TABLES.map(async (def) => {
      try {
        const {count, error} = await supabaseAdmin()
          .from(def.table)
          .select('*', {count: 'exact', head: true});
        if (error) throw error;
        out[def.key] = count ?? 0;
      } catch {
        out[def.key] = null; // table missing or DB offline
      }
    })
  );
  return out;
}
