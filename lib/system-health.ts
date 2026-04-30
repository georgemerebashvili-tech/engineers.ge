import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type EnvCheck = {
  key: string;
  set: boolean;
  required: boolean;
  purpose: string;
};

export type MigrationCheck = {
  file: string;
  probeTable: string | null;
  columns: string[];
  missingColumns: string[];
  tableExists: boolean | null; // null = could not probe
  note: string;
};

export type ProbeResult = {
  ok: boolean;
  detail: string;
};

const ENV_SPECS: Array<Omit<EnvCheck, 'set'>> = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    purpose: 'Supabase project URL (clients + server)'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    purpose: 'server-side admin client for DB + Storage'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: false,
    purpose: 'anon key — not used server-side currently'
  },
  {
    key: 'AUTH_SECRET',
    required: true,
    purpose: 'admin JWT signing secret'
  },
  {
    key: 'ADMIN_USER',
    required: true,
    purpose: 'admin username'
  },
  {
    key: 'ADMIN_PASS_HASH',
    required: true,
    purpose: 'admin bcrypt hash'
  },
  {
    key: 'RESEND_API_KEY',
    required: false,
    purpose: 'email sender (verification + admin bug notifications)'
  },
  {
    key: 'MAIL_FROM',
    required: false,
    purpose: 'from-address for outgoing emails'
  },
  {
    key: 'ADMIN_EMAIL',
    required: false,
    purpose: 'recipient for admin alerts (bug reports, incidents)'
  },
  {
    key: 'CRON_SECRET',
    required: false,
    purpose: 'auth token for /api/cron/* jobs'
  },
  {
    key: 'VERCEL_DEPLOY_HOOK_URL',
    required: false,
    purpose: 'admin → one-click production deploy'
  },
  {
    key: 'ANTHROPIC_API_KEY',
    required: false,
    purpose: 'Claude wall-detection / AI features'
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    required: false,
    purpose: 'canonical origin for sitemap/robots (prod)'
  },
  {
    key: 'CLAUDE_HOOK_SECRET',
    required: false,
    purpose: 'Bearer token for Claude Code hook → /api/claude-sessions'
  }
];

export function checkEnv(): EnvCheck[] {
  return ENV_SPECS.map((s) => ({
    ...s,
    set: Boolean(process.env[s.key] && process.env[s.key]!.length > 0)
  }));
}

/** Heuristic: each migration names the primary table + columns it expects.
 *  We probe Supabase by selecting those columns; if the query fails we flag it. */
const MIGRATION_PROBES: Array<
  Pick<MigrationCheck, 'file' | 'probeTable' | 'columns' | 'note'>
> = [
  {
    file: '0001_page_views.sql',
    probeTable: 'page_views',
    columns: ['id', 'path', 'visited_at'],
    note: 'traffic analytics'
  },
  {
    file: '0002_donation_settings.sql',
    probeTable: 'donation_settings',
    columns: ['id', 'recipient_name', 'banks'],
    note: 'donate modal'
  },
  {
    file: '0003_share_settings.sql',
    probeTable: 'share_settings',
    columns: ['id', 'facebook', 'x', 'copy_link'],
    note: 'share bar toggles'
  },
  {
    file: '0004_hero_ad_slots.sql',
    probeTable: 'hero_ad_slots',
    columns: ['slot_key', 'label', 'image_url'],
    note: 'hero treemap tiles'
  },
  {
    file: '0005_calc_events.sql',
    probeTable: 'calc_events',
    columns: ['id', 'slug', 'event_at'],
    note: 'calculator analytics'
  },
  {
    file: '0006_hero_ad_slots_link_url.sql',
    probeTable: 'hero_ad_slots',
    columns: ['link_url'],
    note: 'adds link_url to hero tiles'
  },
  {
    file: '0007_users_and_countries.sql',
    probeTable: 'users',
    columns: ['id', 'email', 'email_verified'],
    note: 'user registrations'
  },
  {
    file: '0008_ai_settings.sql',
    probeTable: 'ai_settings',
    columns: ['id'],
    note: 'Claude settings'
  },
  {
    file: '0009_admin_editable_copy.sql',
    probeTable: 'share_settings',
    columns: ['visible', 'intro_text', 'facebook_url'],
    note: 'admin-editable share/donate/ad copy + per-platform URLs'
  },
  {
    file: '0010_users_referrals_trash.sql',
    probeTable: 'users',
    columns: ['source', 'referred_by_user_id', 'ref_code', 'interests'],
    note: 'referral attribution + soft-delete trash'
  },
  {
    file: '0011_referral_verification.sql',
    probeTable: 'users',
    columns: ['verified_engineer', 'disposable_email', 'fraud_score'],
    note: 'ref_code auto-gen + email-verify + engineer verify'
  },
  {
    file: '0012_rate_limits.sql',
    probeTable: 'rate_limits',
    columns: ['bucket', 'key', 'fail_count', 'locked_until'],
    note: 'durable login/resend/register throttle (DB-backed)'
  },
  {
    file: '0013_password_reset.sql',
    probeTable: 'password_reset_tokens',
    columns: ['token', 'user_id', 'expires_at'],
    note: 'password reset tokens (1h TTL)'
  },
  {
    file: '0014_claude_sessions.sql',
    probeTable: 'claude_session_events',
    columns: ['id', 'session_id', 'kind', 'event_at'],
    note: 'Claude Code hook events → admin dashboard'
  },
  {
    file: '0015_feature_flags.sql',
    probeTable: 'feature_flags',
    columns: ['key', 'status', 'updated_at'],
    note: 'admin → feature visibility toggles (active/test/hidden)'
  },
  {
    file: '0016_bug_reports.sql',
    probeTable: 'bug_reports',
    columns: ['id', 'feature_key', 'pathname', 'message', 'status'],
    note: 'user-submitted bug reports from test-mode banner'
  },
  {
    file: '0017_admin_audit_log.sql',
    probeTable: 'admin_audit_log',
    columns: ['id', 'actor', 'action', 'target_type', 'metadata'],
    note: 'admin action forensic trail (who did what when)'
  },
  {
    file: '0018_error_events.sql',
    probeTable: 'error_events',
    columns: ['id', 'message', 'stack', 'digest', 'pathname', 'kind', 'resolved'],
    note: 'frontend runtime errors captured via sendBeacon'
  },
  {
    file: '0019_not_found_events.sql',
    probeTable: 'not_found_events',
    columns: ['id', 'pathname', 'referrer', 'user_agent', 'visitor_id'],
    note: '404 tracking — broken inbound links + referrer breakdown'
  },
  {
    file: '0020_redirects.sql',
    probeTable: 'redirects',
    columns: ['id', 'source', 'destination', 'status_code', 'enabled', 'hit_count'],
    note: 'admin-editable redirects (consulted by proxy, 60s cache)'
  },
  {
    file: '0021_consent_log.sql',
    probeTable: 'consent_log',
    columns: ['id', 'visitor_id', 'analytics', 'marketing', 'action', 'pathname'],
    note: 'cookie consent decisions — GDPR audit trail'
  },
  {
    file: '0022_csp_violations.sql',
    probeTable: 'csp_violations',
    columns: ['id', 'document_uri', 'blocked_uri', 'violated_directive'],
    note: 'CSP violation reports posted by browsers'
  },
  {
    file: '0023_web_vitals.sql',
    probeTable: 'web_vitals',
    columns: ['id', 'metric', 'value', 'rating', 'pathname'],
    note: 'Core Web Vitals (LCP/CLS/INP/FCP/TTFB) from visitors'
  },
  {
    file: '0027_regulation_sources.sql',
    probeTable: 'regulation_sources',
    columns: ['id', 'key', 'status', 'last_checked_at'],
    note: 'admin regulations monitor + cron source registry'
  },
  {
    file: '0028_hero_ad_slots_marketing_meta.sql',
    probeTable: 'hero_ad_slots',
    columns: ['contact_phone', 'promo_badge'],
    note: 'hero ads WhatsApp contact + promo badge metadata'
  },
  {
    file: '0029_hero_ad_payments.sql',
    probeTable: 'hero_ad_payments',
    columns: ['id', 'slot_key', 'invoice_no', 'amount_gel', 'status', 'due_date'],
    note: 'hero ads invoice/payment ledger'
  },
  {
    file: '0030_hero_ad_upload_requests.sql',
    probeTable: 'hero_ad_upload_requests',
    columns: ['id', 'slot_key', 'company_name', 'asset_url', 'status'],
    note: 'public ad uploads pending admin approval'
  },
  {
    file: '0031_regulation_publish_workflow.sql',
    probeTable: 'regulation_sources',
    columns: ['published_hash', 'published_excerpt', 'published_snapshot_id', 'published_at'],
    note: 'regulations approve/publish workflow metadata'
  }
];

export async function probeMigrations(): Promise<MigrationCheck[]> {
  const results: MigrationCheck[] = [];
  let client;
  try {
    client = supabaseAdmin();
  } catch {
    return MIGRATION_PROBES.map((p) => ({
      ...p,
      tableExists: null,
      missingColumns: [],
      note: p.note + ' · ⚠ Supabase env არ არის დაყენებული'
    }));
  }

  for (const probe of MIGRATION_PROBES) {
    if (!probe.probeTable || probe.columns.length === 0) {
      results.push({...probe, tableExists: null, missingColumns: []});
      continue;
    }
    const select = probe.columns.join(',');
    const {error} = await client.from(probe.probeTable).select(select).limit(0);
    if (!error) {
      results.push({...probe, tableExists: true, missingColumns: []});
      continue;
    }
    // Parse PostgREST error to detect missing-column ("column X does not exist")
    const msg = (error.message || '').toLowerCase();
    const missing: string[] = [];
    for (const c of probe.columns) {
      if (msg.includes(`column ${probe.probeTable}.${c}`) || msg.includes(`'${c}'`)) {
        missing.push(c);
      }
    }
    const tableMissing =
      msg.includes('relation') && msg.includes('does not exist');
    results.push({
      ...probe,
      tableExists: tableMissing ? false : true,
      missingColumns: missing.length > 0 ? missing : probe.columns
    });
  }
  return results;
}

export type LatencyProbe = ProbeResult & {latency_ms: number | null};

/** Round-trip ping to Supabase via HEAD select. Returns latency in ms. */
export async function probeSupabaseLatency(): Promise<LatencyProbe> {
  let client;
  try {
    client = supabaseAdmin();
  } catch (e) {
    return {
      ok: false,
      latency_ms: null,
      detail: e instanceof Error ? e.message : 'env not set'
    };
  }
  const started = performance.now();
  try {
    const {error} = await client
      .from('users')
      .select('id', {count: 'exact', head: true})
      .limit(0);
    const latency = Math.round(performance.now() - started);
    if (error) {
      return {ok: false, latency_ms: latency, detail: error.message};
    }
    return {ok: true, latency_ms: latency, detail: `${latency}ms round-trip`};
  } catch (e) {
    return {
      ok: false,
      latency_ms: Math.round(performance.now() - started),
      detail: e instanceof Error ? e.message : 'network error'
    };
  }
}

/** Verify Anthropic API key is valid by calling /v1/models (free, no token usage). */
export async function probeAnthropic(): Promise<ProbeResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {ok: false, detail: 'ANTHROPIC_API_KEY not set'};
  }
  if (!key.startsWith('sk-ant-')) {
    return {ok: false, detail: 'key format suspicious (expected sk-ant-…)'};
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) return {ok: true, detail: 'API key valid'};
    if (res.status === 401) return {ok: false, detail: 'invalid key (401)'};
    return {ok: false, detail: `API returned ${res.status}`};
  } catch (e) {
    return {ok: false, detail: e instanceof Error ? e.message : 'network error'};
  }
}

/** Quick counts for admin dashboard at-a-glance. */
export type QuickCounts = {
  bug_reports_open: number;
  features_test: number;
  features_hidden: number;
  errors_open: number;
  today_views: number;
  today_uniques: number;
};

export async function getQuickCounts(): Promise<QuickCounts> {
  const out: QuickCounts = {
    bug_reports_open: 0,
    features_test: 0,
    features_hidden: 0,
    errors_open: 0,
    today_views: 0,
    today_uniques: 0,
  };
  try {
    const client = supabaseAdmin();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [bugs, flags, errors, todayViews] = await Promise.all([
      client
        .from('bug_reports')
        .select('id', {count: 'exact', head: true})
        .in('status', ['open', 'in_progress']),
      client.from('feature_flags').select('status'),
      client
        .from('error_events')
        .select('id', {count: 'exact', head: true})
        .eq('resolved', false),
      client
        .from('page_views')
        .select('visitor_id')
        .gte('entered_at', todayStart.toISOString())
        .eq('bot', false),
    ]);
    if (!bugs.error) out.bug_reports_open = bugs.count ?? 0;
    if (!flags.error) {
      for (const row of (flags.data ?? []) as {status: string}[]) {
        if (row.status === 'test') out.features_test++;
        else if (row.status === 'hidden') out.features_hidden++;
      }
    }
    if (!errors.error) out.errors_open = errors.count ?? 0;
    if (!todayViews.error && todayViews.data) {
      out.today_views = todayViews.data.length;
      out.today_uniques = new Set(todayViews.data.map((r: {visitor_id: string}) => r.visitor_id)).size;
    }
  } catch {
    // Tables may not exist yet — return zeros.
  }
  return out;
}

export async function probeStorageBucket(bucket: string): Promise<ProbeResult> {
  try {
    const client = supabaseAdmin();
    const {error} = await client.storage.getBucket(bucket);
    if (error) {
      if ((error as Error).message.toLowerCase().includes('not found')) {
        return {ok: false, detail: 'bucket არ არსებობს — პირველ upload-ზე ავტომატურად შეიქმნება'};
      }
      return {ok: false, detail: error.message};
    }
    return {ok: true, detail: 'bucket მზადაა'};
  } catch (e) {
    return {ok: false, detail: e instanceof Error ? e.message : 'error'};
  }
}

export function listLocalMigrations(): string[] {
  const dir = path.resolve(process.cwd(), 'supabase/migrations');
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    return [];
  }
}
