#!/usr/bin/env node
/**
 * Applies Supabase migrations from `supabase/migrations/*.sql` to the remote DB.
 *
 * Auth modes (priority order):
 *   1. SUPABASE_DB_PASSWORD  — direct pg connection via pooler (preferred, fastest)
 *   2. SUPABASE_ACCESS_TOKEN — Management API (slower, rate-limited but works
 *                             without DB password)
 *
 * Usage:
 *   node scripts/db-push.mjs                   # applies ALL migrations (idempotent)
 *   node scripts/db-push.mjs 0022              # applies only files starting with 0022
 *
 * Migrations MUST be idempotent (CREATE TABLE IF NOT EXISTS, etc.) — this
 * script doesn't track what's been applied.
 */

import {readFile, readdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

async function loadEnvLocal() {
  try {
    const raw = await readFile(join(repoRoot, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  } catch {}
}

function extractProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!m) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing or malformed');
  return m[1];
}

async function listMigrations(filter) {
  const dir = join(repoRoot, 'supabase', 'migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  return filter ? files.filter((f) => f.startsWith(filter)) : files;
}

async function readSql(file) {
  return readFile(join(repoRoot, 'supabase', 'migrations', file), 'utf8');
}

async function applyViaManagementApi(projectRef, accessToken, sql, fileName) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({query: sql})
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API ${res.status} on ${fileName}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function applyViaPg(password, projectRef, sql, fileName) {
  // Lazy-import pg so the script still runs for management-API mode without it.
  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error(
      'pg package not installed — run `npm install --save-dev pg` or use SUPABASE_ACCESS_TOKEN path'
    );
  }

  // Try connection paths in order:
  //   1. Direct DB host (`db.<ref>.supabase.co:5432`, user=postgres) — best for
  //      scripts, no region guessing needed. Can fail if IPv4 is deprecated on
  //      the project (Supabase moved direct connections to IPv6-only in 2024).
  //   2. Session pooler (`aws-0-<region>.pooler.supabase.com:5432`) — works for
  //      IPv4 clients. We try common regions; project region isn't exposed via
  //      any public API so we brute-force a small list.
  const attempts = [
    {host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres'},
    ...[
      'eu-central-1',
      'eu-central-2',
      'eu-west-1',
      'eu-west-2',
      'eu-west-3',
      'eu-north-1',
      'us-east-1',
      'us-west-1',
      'ap-southeast-1',
      'ap-northeast-1'
    ].map((region) => ({
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${projectRef}`,
      region
    }))
  ];

  let lastErr;
  for (const attempt of attempts) {
    const client = new pg.default.Client({
      host: attempt.host,
      port: attempt.port,
      user: attempt.user,
      password,
      database: 'postgres',
      ssl: {rejectUnauthorized: false},
      connectionTimeoutMillis: 5_000,
      statement_timeout: 30_000
    });
    try {
      await client.connect();
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {}
      continue;
    }
    try {
      await client.query(sql);
      if (attempt.region) {
        console.log(`    (via pooler region=${attempt.region})`);
      } else {
        console.log(`    (via direct db.${projectRef}.supabase.co)`);
      }
      return;
    } finally {
      await client.end();
    }
  }
  throw lastErr ?? new Error(`all connection paths failed for ${fileName}`);
}

async function main() {
  await loadEnvLocal();
  const projectRef = extractProjectRef();
  const filter = process.argv[2] ?? '';
  const files = await listMigrations(filter);
  if (files.length === 0) {
    console.error(`No migrations matched "${filter}".`);
    process.exit(1);
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!password && !accessToken) {
    console.error(
      '\nNo auth:\n  Either set SUPABASE_DB_PASSWORD (fastest, direct pg)' +
        '\n  or SUPABASE_ACCESS_TOKEN (Management API fallback).\n' +
        '  Both paths are documented in docs/staging-environment.md.\n'
    );
    process.exit(2);
  }
  const mode = password ? 'pg-direct' : 'management-api';
  console.log(`⚙  db-push · project=${projectRef} · mode=${mode} · files=${files.length}`);

  for (const file of files) {
    const sql = await readSql(file);
    console.log(`  → ${file}  (${sql.length} chars)`);
    try {
      if (password) await applyViaPg(password, projectRef, sql, file);
      else await applyViaManagementApi(projectRef, accessToken, sql, file);
      console.log(`  ✓ ${file}`);
    } catch (e) {
      console.error(`  ✗ ${file}: ${e instanceof Error ? e.message : e}`);
      process.exit(3);
    }
  }
  console.log('✓ All migrations applied.');
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
