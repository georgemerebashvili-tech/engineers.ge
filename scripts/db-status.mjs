#!/usr/bin/env node
/**
 * engineers.ge · Migration status viewer.
 *
 * Shows which migrations are applied vs pending vs checksum-drifted
 * (= .sql file changed after being applied → possible problem).
 *
 * Usage:
 *   DATABASE_URL=... npm run db:status
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

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!CONN) {
  console.error(`${COLORS.red}DATABASE_URL is required.${COLORS.reset}`);
  process.exit(2);
}

let Client;
try {
  ({Client} = require('pg'));
} catch {
  console.error(`${COLORS.red}\`pg\` is not installed. Run: npm install pg${COLORS.reset}`);
  process.exit(2);
}

function checksum(content) {
  let h = 5381;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) + h) ^ content.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new Client({
  connectionString: CONN,
  ssl: CONN.includes('supabase.co') || CONN.includes('neon.tech')
    ? {rejectUnauthorized: false}
    : undefined
});

async function main() {
  await client.connect();

  const {rows: tables} = await client.query(`
    select to_regclass('public._schema_migrations') as t
  `);
  if (!tables[0]?.t) {
    console.log(`${COLORS.yellow}_schema_migrations table does not exist yet.${COLORS.reset}`);
    console.log(`All ${files.length} migrations are pending. Run: npm run db:migrate`);
    return;
  }

  const {rows} = await client.query(
    'select file, applied_at, checksum from public._schema_migrations'
  );
  const applied = new Map(rows.map((r) => [r.file, r]));

  console.log(`${COLORS.bold}Migration status${COLORS.reset} (${files.length} total)\n`);
  for (const file of files) {
    const full = path.join(MIGRATIONS_DIR, file);
    const content = readFileSync(full, 'utf8');
    const localSum = checksum(content);
    const row = applied.get(file);
    if (!row) {
      console.log(`  ${COLORS.yellow}◌ pending${COLORS.reset}  ${file}`);
    } else if (row.checksum && row.checksum !== localSum) {
      console.log(
        `  ${COLORS.red}⚠ DRIFT${COLORS.reset}    ${file}  ${COLORS.dim}(applied ${row.applied_at.toISOString().slice(0, 10)}, local sum changed)${COLORS.reset}`
      );
    } else {
      const when = row.applied_at.toISOString().slice(0, 10);
      console.log(`  ${COLORS.green}✓ applied${COLORS.reset}  ${file}  ${COLORS.dim}${when}${COLORS.reset}`);
    }
  }

  const pending = files.filter((f) => !applied.has(f)).length;
  const drifted = files.filter((f) => {
    const row = applied.get(f);
    if (!row?.checksum) return false;
    return row.checksum !== checksum(readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
  }).length;

  console.log(
    `\n${COLORS.bold}Summary:${COLORS.reset} ${applied.size} applied, ${pending} pending${drifted > 0 ? `, ${COLORS.red}${drifted} drifted${COLORS.reset}` : ''}`
  );
}

main()
  .catch((e) => {
    console.error(`${COLORS.red}Status check failed:${COLORS.reset}`, e.message);
    process.exit(1);
  })
  .finally(() => client.end());
