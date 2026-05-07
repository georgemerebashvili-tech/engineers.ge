#!/usr/bin/env node
// Scrape a single AFL fan model from cloudair.tech and store under
// lib/ahu-ashrae/fans/data/<CODE>.json — same shape as B3P190-EC072-907.json.
//
// Usage:
//   node scripts/scrape-afl-fan.mjs B3P190-EC072-907
//   node scripts/scrape-afl-fan.mjs B3P190-EC072-907 B3P190-EC072-005 B3P190-EC072-101
//
// After running, register the new codes in lib/ahu-ashrae/fans/registry.ts.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLIENT_ACCESSKEY = 'HgfsuAFLytjj65gghKi89GwvgjdHfNoI9GdVkJ5A';
const API = 'https://api.cloudair.tech/';

async function fetchProductList() {
  const url = `${API}PRODUCT_list/?client_access_key=${CLIENT_ACCESSKEY}&id_product_type=70&lang=en&user_access_key=`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PRODUCT_list ${res.status}`);
  return res.json();
}

async function fetchProduct(idProduct) {
  const body = new URLSearchParams({
    client_access_key: CLIENT_ACCESSKEY,
    user_access_key: '',
    id_product: String(idProduct),
    lang: 'en',
    graph: '1',
    acoustic: '1',
  });
  const res = await fetch(`${API}PRODUCT_get/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`PRODUCT_get ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr[0]) throw new Error('Empty product response');
  return arr[0];
}

const num = (v, d = null) => {
  if (v == null || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function transform(src) {
  return {
    code: src.name,
    sourceId: Number(src.id_product),
    familyId: Number(src.id_product_family),
    family: src.product_alias ?? null,
    alias: src.alias ?? null,
    imageUrl: `https://app.cloudair.tech/data/afl/media/product/${src.id_product}.png`,
    spec: {
      phase: num(src.phase),
      voltageRated: num(src.voltageRated),
      currentRated: num(src.currentRated),
      frequencyRated: num(src.frequerencyRated),
      powerRated: num(src.powerRated),
      powerMaxConsumption: num(src.powerMaxConsumption),
      speedRated: num(src.speedRated),
      speedMax: num(src.speedMax),
      volumeMax: num(src.volumeMax),
      pressureStaticMax: num(src.pressureStaticMax),
      motorType: src.motorType ?? null,
      motorTypeControl: src.motorTypeControl ?? null,
      motorInsulationClass: src.motorInsulationClass ?? null,
      ipMotor: src.ipMotor ?? null,
      poles: src.poles != null && src.poles !== '' ? String(src.poles) : null,
      temperatureOperatingMin: num(src.temperatureOperatingMin),
      temperatureOperatingMax: num(src.temperatureOperatingMax),
      diameter: num(src.diameter),
      diameterCalculating: num(src.diameterCalculating),
      weight: num(src.weight),
      dimensions: src.dimmensions ?? null,
    },
    acousticOverall: {
      Lwa2: num(src.Lwa2),
      Lwa5: num(src.Lwa5),
      Lwa6: num(src.Lwa6),
      Lpa2: num(src.Lpa2),
      Lpa2dist: num(src.Lpa2dist),
    },
    curves: (src.graph ?? []).map((g, i) => ({
      label: g.label,
      main: g.main === 0 || g.main === '0',
      graphMin: num(g.graphMin, 0),
      graphMax: num(g.graphMax, 0),
      coefficients: {
        pressureStatic: g.approxParams?.pressureStatic ?? [],
        power:          g.approxParams?.power ?? [],
        speed:          g.approxParams?.speed ?? [],
        current:        g.approxParams?.current ?? [],
      },
      samplePoints: (g.approxPoints ?? []).map((p) => ({
        volume: p.volume,
        pressureStatic: p.pressureStatic,
        power: p.power,
        speed: p.speed,
        current: p.current,
      })),
      acoustic: g.acoustic ?? [],
    })),
  };
}

async function main(codes) {
  if (!codes.length) {
    console.error('Usage: node scripts/scrape-afl-fan.mjs <CODE> [<CODE> …]');
    process.exit(1);
  }

  const list = await fetchProductList();
  const byName = new Map(list.map((p) => [p.name, p]));

  const outDir = resolve(process.cwd(), 'lib/ahu-ashrae/fans/data');

  for (const code of codes) {
    const meta = byName.get(code);
    if (!meta) {
      console.error(`✗ ${code} — not found in PRODUCT_list`);
      continue;
    }
    const full = await fetchProduct(meta.id_product);
    const out = transform(full);
    const path = resolve(outDir, `${code}.json`);
    writeFileSync(path, JSON.stringify(out, null, 2));
    console.log(`✓ ${code} → ${path}`);
  }

  console.log('\nNext: register codes in lib/ahu-ashrae/fans/registry.ts:');
  for (const code of codes) {
    const safe = code.replace(/[^a-zA-Z0-9]/g, '_');
    console.log(`  import ${safe} from './data/${code}.json';`);
  }
}

main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
