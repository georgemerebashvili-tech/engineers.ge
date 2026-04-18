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
    purpose: 'email verification sender (Resend)'
  },
  {
    key: 'MAIL_FROM',
    required: false,
    purpose: 'from-address for verification emails'
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
