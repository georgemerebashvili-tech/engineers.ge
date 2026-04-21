#!/usr/bin/env node
// One-off: apply supabase/migrations/0033_dmt_users.sql to production Supabase.
// Idempotent — uses `create table if not exists` + `create index if not exists`.
// Safe to re-run; no destructive operations.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

// Load .env.local manually (no `dotenv` dep in this project).
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const require = createRequire(import.meta.url);
const {Client} = require('pg');

const SQL_PATH = process.argv[2] || 'supabase/migrations/0033_dmt_users.sql';
const sql = readFileSync(SQL_PATH, 'utf8');

const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const DATABASE_URL = `postgresql://postgres.tunlibxpavjwsojsdzgr:${pw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;

console.log(`--- applying: ${SQL_PATH} ---`);
console.log(sql);
console.log('---');

const c = new Client({connectionString: DATABASE_URL, ssl: {rejectUnauthorized: false}});
await c.connect();
try {
  await c.query('begin');
  await c.query(sql);
  await c.query(
    "insert into public._schema_migrations (file, checksum) values ($1, 'manual-apply') on conflict do nothing",
    [SQL_PATH.split('/').pop()]
  );
  await c.query('commit');
  const {rows} = await c.query(
    "select count(*)::int as n from pg_tables where schemaname='public' and tablename='dmt_users'"
  );
  console.log('dmt_users present:', rows[0].n === 1 ? 'YES' : 'NO');
} catch (e) {
  await c.query('rollback');
  console.error('FAILED:', e.message);
  process.exit(1);
} finally {
  await c.end();
}
