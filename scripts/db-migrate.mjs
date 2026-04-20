#!/usr/bin/env node
/**
 * engineers.ge · Migration runner.
 *
 * Applies `supabase/migrations/*.sql` files to a Postgres database (Supabase or
 * Neon or anywhere) in order, tracking applied migrations in a `_schema_migrations`
 * metadata table. Idempotent — re-running does nothing if everything is applied.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/db npm run db:migrate
 *   DATABASE_URL=... npm run db:migrate -- --dry-run
 *
 * DATABASE_URL is preferred; falls back to POSTGRES_URL or SUPABASE_DB_URL.
 * Get a connection string from Supabase Dashboard → Settings → Database →
 * Connection string (URI). Use "Session pooler" for interactive runs.
 */
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const DRY_RUN = process.argv.includes('--dry-run');
const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!CONN) {
  console.error(
    `${COLORS.red}DATABASE_URL is required. Get one from Supabase Dashboard → Settings → Database → Connection string.${COLORS.reset}`
  );
  process.exit(2);
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migrations found in', MIGRATIONS_DIR);
  process.exit(0);
}

// Lazy-load pg so a missing dep gives a clear error rather than ESM resolution noise.
let Client;
try {
  ({Client} = require('pg'));
} catch {
  console.error(
    `${COLORS.red}\`pg\` is not installed. Run: npm install pg${COLORS.reset}`
  );
  process.exit(2);
}

const client = new Client({
  connectionString: CONN,
  ssl: CONN.includes('supabase.co') || CONN.includes('neon.tech')
    ? {rejectUnauthorized: false}
    : undefined
});

async function ensureMigrationsTable() {
  await client.query(`
    create table if not exists public._schema_migrations (
      file text primary key,
      applied_at timestamptz not null default now(),
      checksum text
    );
  `);
}

async function listApplied() {
  const {rows} = await client.query(
    'select file from public._schema_migrations order by file'
  );
  return new Set(rows.map((r) => r.file));
}

function checksum(content) {
  // Cheap: djb2 hash for change-detection warnings, not cryptographic.
  let h = 5381;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) + h) ^ content.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

async function applyOne(file, content) {
  const sum = checksum(content);
  if (DRY_RUN) {
    console.log(`${COLORS.yellow}  would apply: ${file}${COLORS.reset}`);
    return;
  }
  console.log(`${COLORS.dim}  applying: ${file}${COLORS.reset}`);
  await client.query('begin');
  try {
    await client.query(content);
    await client.query(
      'insert into public._schema_migrations (file, checksum) values ($1, $2)',
      [file, sum]
    );
    await client.query('commit');
    console.log(`${COLORS.green}  ✓ ${file}${COLORS.reset}`);
  } catch (e) {
    await client.query('rollback');
    console.error(`${COLORS.red}  ✗ ${file}:${COLORS.reset}`, e.message);
    throw e;
  }
}

async function main() {
  await client.connect();
  await ensureMigrationsTable();
  const applied = await listApplied();

  const pending = files.filter((f) => !applied.has(f));
  console.log(
    `${COLORS.bold}Migrations:${COLORS.reset} ${applied.size} applied, ${pending.length} pending, ${files.length} total`
  );

  if (pending.length === 0) {
    console.log(`${COLORS.green}Database is up to date.${COLORS.reset}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${COLORS.yellow}\nDRY-RUN — no changes will be applied.${COLORS.reset}`);
  }

  console.log();
  for (const file of pending) {
    const full = path.join(MIGRATIONS_DIR, file);
    const content = readFileSync(full, 'utf8');
    await applyOne(file, content);
  }

  console.log(
    `\n${COLORS.green}${COLORS.bold}${pending.length} migration${pending.length === 1 ? '' : 's'} ${DRY_RUN ? 'would be' : ''} applied.${COLORS.reset}`
  );
}

main()
  .catch((e) => {
    console.error(`${COLORS.red}Migration failed:${COLORS.reset}`, e.message);
    process.exit(1);
  })
  .finally(() => client.end());
