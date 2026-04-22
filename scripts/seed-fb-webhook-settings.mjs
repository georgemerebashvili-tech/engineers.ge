#!/usr/bin/env node
// One-off: copy existing FB_* env vars into dmt_fb_webhook_settings row.
// Idempotent — upserts id=1; only sets fields that have a value in env
// AND are currently null in DB (won't overwrite edits made from the UI).
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

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

const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const DATABASE_URL = `postgresql://postgres.tunlibxpavjwsojsdzgr:${pw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;

const verifyToken = process.argv[2] || process.env.FB_VERIFY_TOKEN || null;
const appSecret = process.argv[3] || process.env.FB_APP_SECRET || null;
const pageToken = process.argv[4] || process.env.FB_PAGE_ACCESS_TOKEN || null;

if (!verifyToken && !appSecret && !pageToken) {
  console.error('no values provided (args or FB_* env vars)');
  process.exit(1);
}

const c = new Client({connectionString: DATABASE_URL, ssl: {rejectUnauthorized: false}});
await c.connect();
try {
  const {rows: existing} = await c.query(
    'select verify_token, app_secret, page_access_token from public.dmt_fb_webhook_settings where id = 1'
  );
  const cur = existing[0] ?? {};
  const nextRow = {
    verify_token: cur.verify_token ?? verifyToken ?? null,
    app_secret: cur.app_secret ?? appSecret ?? null,
    page_access_token: cur.page_access_token ?? pageToken ?? null
  };

  await c.query(
    `insert into public.dmt_fb_webhook_settings (id, verify_token, app_secret, page_access_token, updated_at)
     values (1, $1, $2, $3, now())
     on conflict (id) do update set
       verify_token = coalesce(public.dmt_fb_webhook_settings.verify_token, excluded.verify_token),
       app_secret = coalesce(public.dmt_fb_webhook_settings.app_secret, excluded.app_secret),
       page_access_token = coalesce(public.dmt_fb_webhook_settings.page_access_token, excluded.page_access_token),
       updated_at = now()`,
    [nextRow.verify_token, nextRow.app_secret, nextRow.page_access_token]
  );

  const {rows: after} = await c.query(
    'select (verify_token is not null) vt_set, (app_secret is not null) as_set, (page_access_token is not null) pt_set, updated_at from public.dmt_fb_webhook_settings where id = 1'
  );
  console.log('seed ✓', after[0]);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
} finally {
  await c.end();
}
