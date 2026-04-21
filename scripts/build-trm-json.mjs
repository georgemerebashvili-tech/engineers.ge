#!/usr/bin/env node
// Convert the latest trm-products-*.xlsx into public/dmt/trm-products.json,
// which /dmt/inventory?tab=stock loads at runtime.

import {readdirSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {resolve, join} from 'node:path';
import XLSX from 'xlsx';

const root = process.cwd();
const files = readdirSync(root)
  .filter((f) => /^trm-products-.*\.xlsx$/.test(f))
  .map((f) => ({f, mtime: statSync(join(root, f)).mtimeMs}))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error('✗ no trm-products-*.xlsx found — run scripts/scrape-trm.mjs first.');
  process.exit(1);
}

const src = resolve(root, files[0].f);
console.log(`→ reading ${files[0].f}`);
const wb = XLSX.readFile(src);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const products = rows.map((r) => ({
  id: r.id,
  sku: r.sku || '',
  name: r.name || '',
  category: r.category || '',
  brand: r.brand || '',
  model: r.model || '',
  power: r.power || '',
  color: r.color || '',
  made_in: r.made_in || '',
  price: r.price_gel ?? null,
  regular: r.regular_price_gel ?? null,
  sale: r.sale_price_gel ?? null,
  on_sale: r.on_sale === 'yes',
  in_stock: r.in_stock === 'yes',
  image: r.image || '',
  url: r.url || ''
}));

const outDir = resolve(root, 'public/dmt');
mkdirSync(outDir, {recursive: true});
const out = resolve(outDir, 'trm-products.json');
writeFileSync(
  out,
  JSON.stringify({
    source: 'trm.ge',
    fetched_at: new Date().toISOString().slice(0, 10),
    count: products.length,
    products
  })
);
console.log(`✓ wrote ${products.length} rows → ${out}`);
