#!/usr/bin/env node
// One-off backfill: migrate TBC device photos from base64 data URLs inside
// tbc_branches.devices JSONB to Supabase Storage. Zero data loss: every branch
// is snapshotted into tbc_branches_photos_backup BEFORE any rewrite, and skips
// if a snapshot already exists (idempotency).
//
// Usage:
//   node scripts/migrate-tbc-photos-to-storage.mjs               # real run
//   node scripts/migrate-tbc-photos-to-storage.mjs --dry-run     # preview
//
// Prereqs:
//   - Migration 0055 applied (bucket + backup table)
//   - .env.local with SUPABASE_DB_PASSWORD and SUPABASE_SERVICE_ROLE_KEY (plus NEXT_PUBLIC_SUPABASE_URL)
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
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
const {createClient} = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'tbc-photos';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY || !DB_PASSWORD) {
  console.error('Missing env: need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {auth: {persistSession: false}});
const pgPw = encodeURIComponent(DB_PASSWORD);
const pg = new Client({
  connectionString: `postgresql://postgres.tunlibxpavjwsojsdzgr:${pgPw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  ssl: {rejectUnauthorized: false}
});

// Try sharp for server-side thumb generation; fall back to identical full+thumb.
let sharp = null;
try { sharp = require('sharp'); } catch { /* optional */ }

const DATA_URL = /^data:(image\/[a-z+]+);base64,(.+)$/i;

function parseDataUrl(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(DATA_URL);
  if (!m) return null;
  return {mime: m[1], buffer: Buffer.from(m[2], 'base64')};
}

async function uploadBuf(path, buffer, mime) {
  if (DRY_RUN) return null;
  const {error} = await supa.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;
  return supa.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function migrateOnePhoto(v, folder, stats) {
  if (!v) return v;
  // Already migrated?
  if (typeof v === 'object' && v.url && v.thumb_url) {
    stats.already_migrated++;
    return v;
  }
  if (typeof v !== 'string') return v;
  const parsed = parseDataUrl(v);
  if (!parsed) {
    // Already an http URL or unknown → leave alone
    stats.skipped_non_data++;
    return v;
  }

  const id = randomUUID();
  const ext = (parsed.mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const fullPath = `${folder}/${id}.${ext}`;
  const thumbPath = `${folder}/${id}.thumb.${ext}`;

  let thumbBuf = parsed.buffer;
  let thumbMime = parsed.mime;
  if (sharp) {
    try {
      thumbBuf = await sharp(parsed.buffer).resize({width: 256, height: 256, fit: 'inside'}).jpeg({quality: 70}).toBuffer();
      thumbMime = 'image/jpeg';
    } catch (e) {
      console.warn('[backfill] sharp thumb failed, using full as thumb', e.message);
    }
  }

  try {
    const [fullUrl, thumbUrl] = await Promise.all([
      uploadBuf(fullPath, parsed.buffer, parsed.mime),
      uploadBuf(sharp ? thumbPath : fullPath, thumbBuf, thumbMime)
    ]);
    stats.migrated++;
    if (DRY_RUN) return v;
    return {url: fullUrl, thumb_url: sharp ? thumbUrl : fullUrl};
  } catch (e) {
    console.warn('[backfill] upload failed', e?.message || e);
    stats.failed++;
    return v; // keep original data URL; try again next run
  }
}

async function migrateDevice(dev, folder, stats) {
  const out = {...dev};
  if (Array.isArray(out.photos)) {
    const next = [];
    for (let i = 0; i < out.photos.length; i++) {
      next.push(await migrateOnePhoto(out.photos[i], folder + '/d', stats));
    }
    out.photos = next;
  }
  if (Array.isArray(out.situational_photos)) {
    const next = [];
    for (const sp of out.situational_photos) {
      if (!sp) { next.push(sp); continue; }
      next.push({...sp, src: await migrateOnePhoto(sp.src, folder + '/s', stats)});
    }
    out.situational_photos = next;
  }
  if (Array.isArray(out.archived_photos)) {
    const next = [];
    for (const ap of out.archived_photos) {
      if (!ap) { next.push(ap); continue; }
      next.push({...ap, src: await migrateOnePhoto(ap.src, folder + '/a', stats)});
    }
    out.archived_photos = next;
  }
  return out;
}

async function main() {
  console.log(`=== TBC photo backfill ${DRY_RUN ? '[DRY RUN]' : ''} ===`);
  console.log(`sharp available: ${!!sharp}`);

  await pg.connect();

  const branchesRes = await pg.query('select id, devices from public.tbc_branches order by id');
  console.log(`branches: ${branchesRes.rowCount}`);

  const totals = {already_migrated: 0, migrated: 0, skipped_non_data: 0, failed: 0};

  for (const row of branchesRes.rows) {
    const branchId = row.id;
    const devicesPre = row.devices || [];
    if (!Array.isArray(devicesPre) || devicesPre.length === 0) {
      console.log(`  branch ${branchId}: no devices`);
      continue;
    }

    const hasBackup = await pg.query(
      'select 1 from public.tbc_branches_photos_backup where branch_id = $1 limit 1',
      [branchId]
    );
    if (hasBackup.rowCount > 0) {
      console.log(`  branch ${branchId}: backup exists, skipping snapshot but still migrating`);
    } else if (!DRY_RUN) {
      await pg.query(
        'insert into public.tbc_branches_photos_backup (branch_id, devices_pre, migrated_by, notes) values ($1, $2, $3, $4)',
        [branchId, JSON.stringify(devicesPre), 'migrate-script', `sharp=${!!sharp}`]
      );
    }

    const perBranch = {already_migrated: 0, migrated: 0, skipped_non_data: 0, failed: 0};
    const nextDevices = [];
    for (const dev of devicesPre) {
      nextDevices.push(await migrateDevice(dev, `devices/b${branchId}`, perBranch));
    }

    if (!DRY_RUN && (perBranch.migrated > 0 || perBranch.failed === 0)) {
      const upd = await pg.query(
        'update public.tbc_branches set devices = $1 where id = $2',
        [JSON.stringify(nextDevices), branchId]
      );
      console.log(`  branch ${branchId}: updated rows=${upd.rowCount} migrated=${perBranch.migrated} already=${perBranch.already_migrated} failed=${perBranch.failed}`);
    } else {
      console.log(`  branch ${branchId}: ${DRY_RUN ? '[dry]' : ''} migrated=${perBranch.migrated} already=${perBranch.already_migrated} failed=${perBranch.failed}`);
    }

    for (const k of Object.keys(totals)) totals[k] += perBranch[k];
  }

  await pg.end();
  console.log('=== SUMMARY ===');
  console.log(totals);
  if (DRY_RUN) console.log('(dry run — nothing written)');
}

main().catch((e) => {
  console.error('FATAL', e);
  pg.end().catch(() => {});
  process.exit(1);
});
