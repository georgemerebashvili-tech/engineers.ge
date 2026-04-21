#!/usr/bin/env node
// Scrape trm.ge WooCommerce Store API → XLSX export.
// Usage:  node scripts/scrape-trm.mjs [outfile]
//   outfile defaults to ./trm-products-YYYY-MM-DD.xlsx

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import XLSX from 'xlsx';

const BASE = 'https://trm.ge/wp-json/wc/store/products';
const PER_PAGE = 100;

const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();

const priceToGel = (minorStr, minorUnit = 2) => {
  if (!minorStr) return null;
  const n = Number(minorStr);
  if (!Number.isFinite(n)) return null;
  return n / 10 ** minorUnit;
};

const fetchPage = async (page) => {
  const url = `${BASE}?page=${page}&per_page=${PER_PAGE}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'engineers.ge catalog sync/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  const total = Number(res.headers.get('x-wp-total') ?? 0);
  const totalPages = Number(res.headers.get('x-wp-totalpages') ?? 0);
  const data = await res.json();
  return { data, total, totalPages };
};

const run = async () => {
  const outArg = process.argv[2];
  const date = new Date().toISOString().slice(0, 10);
  const outfile = resolve(outArg ?? `./trm-products-${date}.xlsx`);
  mkdirSync(dirname(outfile), { recursive: true });

  console.log(`→ Fetching trm.ge catalog (page 1, per_page=${PER_PAGE})...`);
  const first = await fetchPage(1);
  console.log(`  total=${first.total}  totalPages=${first.totalPages}`);

  const all = [...first.data];
  for (let p = 2; p <= first.totalPages; p++) {
    console.log(`→ page ${p}/${first.totalPages}...`);
    const { data } = await fetchPage(p);
    all.push(...data);
  }
  console.log(`✓ fetched ${all.length} products.`);

  const rows = all.map((p) => {
    const attrMap = Object.fromEntries(
      (p.attributes ?? []).map((a) => [a.name, (a.terms ?? []).map((t) => t.name).join(', ')]),
    );
    const price = priceToGel(p.prices?.price, p.prices?.currency_minor_unit);
    const regular = priceToGel(p.prices?.regular_price, p.prices?.currency_minor_unit);
    const sale = priceToGel(p.prices?.sale_price, p.prices?.currency_minor_unit);
    return {
      id: p.id,
      sku: p.sku ?? '',
      name: p.name ?? '',
      category: (p.categories ?? []).map((c) => c.name).join(' / '),
      brand: (p.brands ?? []).map((b) => b.name).join(', ') || attrMap.Brand || '',
      model: attrMap.Model ?? '',
      power: attrMap.Power ?? '',
      color: attrMap.Color ?? '',
      made_in: attrMap['Made In'] ?? '',
      price_gel: price,
      regular_price_gel: regular,
      sale_price_gel: sale,
      on_sale: p.on_sale ? 'yes' : '',
      currency: p.prices?.currency_code ?? 'GEL',
      in_stock: p.is_in_stock ? 'yes' : 'no',
      stock_status: p.stock_availability?.class ?? '',
      short_description: stripHtml(p.short_description),
      description: stripHtml(p.description),
      image: p.images?.[0]?.src ?? '',
      url: p.permalink ?? '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      'id',
      'sku',
      'name',
      'category',
      'brand',
      'model',
      'power',
      'color',
      'made_in',
      'price_gel',
      'regular_price_gel',
      'sale_price_gel',
      'on_sale',
      'currency',
      'in_stock',
      'stock_status',
      'short_description',
      'description',
      'image',
      'url',
    ],
  });

  ws['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 50 }, { wch: 24 }, { wch: 14 },
    { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
    { wch: 12 }, { wch: 60 }, { wch: 80 }, { wch: 50 }, { wch: 50 },
  ];
  ws['!autofilter'] = { ref: ws['!ref'] };

  XLSX.utils.book_append_sheet(wb, ws, 'trm.ge products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(outfile, buf);
  console.log(`✓ wrote ${rows.length} rows → ${outfile}`);
};

run().catch((err) => {
  console.error('✗ scrape failed:', err);
  process.exit(1);
});
