'use client';

import {useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {AlertTriangle, Boxes} from 'lucide-react';

type Category = 'duct' | 'fan' | 'silencer' | 'damper' | 'filter' | 'sensor' | 'pipe' | 'accessory';

const ITEMS: Array<{
  sku: string;
  name: string;
  category: Category;
  stock: number;
  min: number;
  unit: string;
  price: number;
  supplier: string;
  location: string;
}> = [
  {sku: 'DCT-RE-200-120', name: 'მართკუთხა duct 200×120 მმ', category: 'duct', stock: 84, min: 30, unit: 'მ', price: 28, supplier: 'HVAC Pro', location: 'A-01-02'},
  {sku: 'DCT-RE-300-150', name: 'მართკუთხა duct 300×150 მმ', category: 'duct', stock: 46, min: 30, unit: 'მ', price: 38, supplier: 'HVAC Pro', location: 'A-01-03'},
  {sku: 'DCT-RE-400-250', name: 'მართკუთხა duct 400×250 მმ', category: 'duct', stock: 12, min: 20, unit: 'მ', price: 58, supplier: 'HVAC Pro', location: 'A-01-04'},
  {sku: 'DCT-RND-250', name: 'მრგვალი duct Ø250 მმ', category: 'duct', stock: 72, min: 25, unit: 'მ', price: 32, supplier: 'ATC', location: 'A-02-01'},
  {sku: 'DCT-RND-315', name: 'მრგვალი duct Ø315 მმ', category: 'duct', stock: 8, min: 15, unit: 'მ', price: 42, supplier: 'ATC', location: 'A-02-02'},
  {sku: 'FAN-AX-400', name: 'ღერძული ვენტილატორი Ø400', category: 'fan', stock: 14, min: 5, unit: 'ც', price: 480, supplier: 'Soler Palau', location: 'B-01-01'},
  {sku: 'FAN-CE-315', name: 'ცენტრიფუგული ფანი Ø315', category: 'fan', stock: 6, min: 4, unit: 'ც', price: 720, supplier: 'Systemair', location: 'B-01-02'},
  {sku: 'FAN-JET-30', name: 'Jet fan 30N (parking)', category: 'fan', stock: 3, min: 6, unit: 'ც', price: 2100, supplier: 'Flakt Woods', location: 'B-02-01'},
  {sku: 'SIL-HP-600-90', name: 'სილენსერი 600×600 L=900', category: 'silencer', stock: 18, min: 8, unit: 'ც', price: 340, supplier: 'HVAC Pro', location: 'C-01-01'},
  {sku: 'SIL-HP-800-120', name: 'სილენსერი 800×800 L=1200', category: 'silencer', stock: 7, min: 4, unit: 'ც', price: 620, supplier: 'HVAC Pro', location: 'C-01-02'},
  {sku: 'DMP-FI-400-250', name: 'Fire damper 400×250', category: 'damper', stock: 22, min: 12, unit: 'ც', price: 180, supplier: 'Trox', location: 'D-01-01'},
  {sku: 'DMP-VC-300', name: 'Volume damper Ø300', category: 'damper', stock: 2, min: 10, unit: 'ც', price: 95, supplier: 'Trox', location: 'D-01-02'},
  {sku: 'FLT-F7-600', name: 'F7 ფილტრი 600×600×50', category: 'filter', stock: 34, min: 20, unit: 'ც', price: 48, supplier: 'Camfil', location: 'E-01-01'},
  {sku: 'FLT-HEPA-H13', name: 'HEPA H13 592×592×292', category: 'filter', stock: 11, min: 8, unit: 'ც', price: 240, supplier: 'Camfil', location: 'E-01-02'},
  {sku: 'SNS-CO-ELC', name: 'CO sensor (parking)', category: 'sensor', stock: 19, min: 6, unit: 'ც', price: 145, supplier: 'Bosch', location: 'F-01-01'},
  {sku: 'SNS-PR-DIF', name: 'Differential pressure sensor', category: 'sensor', stock: 13, min: 4, unit: 'ც', price: 165, supplier: 'Siemens', location: 'F-01-02'},
  {sku: 'PIP-CU-22', name: 'სპილენძის მილი Ø22 × 1 მმ', category: 'pipe', stock: 156, min: 80, unit: 'მ', price: 14, supplier: 'Wieland', location: 'G-01-01'},
  {sku: 'PIP-PEX-20', name: 'PEX მილი Ø20', category: 'pipe', stock: 288, min: 100, unit: 'მ', price: 6.5, supplier: 'Rehau', location: 'G-01-02'},
  {sku: 'ACC-CLAMP-32', name: 'სამაგრი დუქტისთვის Ø32', category: 'accessory', stock: 450, min: 100, unit: 'ც', price: 2.8, supplier: 'ATC', location: 'H-01-01'}
];

const CATEGORY_META: Record<Category, {label: string; color: string; bg: string; border: string}> = {
  duct:       {label: 'duct',      color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  fan:        {label: 'ფანი',      color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  silencer:   {label: 'სილენს.',   color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  damper:     {label: 'damper',    color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'},
  filter:     {label: 'ფილტრი',    color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  sensor:     {label: 'sensor',    color: '#0284c7',       bg: '#e0f2fe',        border: '#7dd3fc'},
  pipe:       {label: 'მილი',      color: '#475569',       bg: '#f1f5f9',        border: '#cbd5e1'},
  accessory:  {label: 'აქსესუარი', color: 'var(--text-3)', bg: 'var(--sur-2)',   border: 'var(--bdr)'}
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}
function fmt2(n: number) {
  return new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n);
}

export default function InventoryPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ITEMS;
    return ITEMS.filter(
      (i) =>
        i.sku.toLowerCase().includes(t) ||
        i.name.toLowerCase().includes(t) ||
        i.category.includes(t) ||
        i.supplier.toLowerCase().includes(t)
    );
  }, [q]);

  const totalValue = filtered.reduce((s, i) => s + i.price * i.stock, 0);
  const below = filtered.filter((i) => i.stock < i.min).length;
  const sku = filtered.length;

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვენტარიზაცია"
      subtitle="SKU · მარაგი · მინიმალური ზღვარი · ღირებულება საწყობში"
      searchPlaceholder="ძიება SKU / სახელი / კატეგორია / მომწოდებელი…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="SKU" value={String(sku)} icon={Boxes} />
          <StatCard label="მარაგქვეშ" value={String(below)} accent="red" icon={AlertTriangle} />
          <StatCard label="საწყობის ღირებ." value={`₾ ${fmt(Math.round(totalValue))}`} />
          <StatCard label="საშ. ფასი" value={`₾ ${fmt2(totalValue / (filtered.reduce((s, i) => s + i.stock, 0) || 1))}`} />
        </div>

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                <th className="px-4 py-2.5 font-bold">SKU</th>
                <th className="px-4 py-2.5 font-bold">დასახელება</th>
                <th className="px-4 py-2.5 font-bold">კატეგორია</th>
                <th className="px-4 py-2.5 text-right font-bold">მარაგი</th>
                <th className="px-4 py-2.5 text-right font-bold">Min</th>
                <th className="px-4 py-2.5 text-right font-bold">ფასი</th>
                <th className="px-4 py-2.5 font-bold">მომწოდებელი</th>
                <th className="px-4 py-2.5 font-bold">ადგილი</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const cat = CATEGORY_META[i.category];
                const low = i.stock < i.min;
                return (
                  <tr
                    key={i.sku}
                    className={`border-b border-bdr last:border-b-0 hover:bg-sur-2 ${
                      low ? 'bg-red-lt/40' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-[10.5px] font-semibold text-navy">{i.sku}</td>
                    <td className="px-4 py-2.5 text-text">{i.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold"
                        style={{color: cat.color, background: cat.bg, borderColor: cat.border}}
                      >
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`font-mono text-[12px] font-bold ${
                          low ? 'text-red' : 'text-text'
                        }`}
                      >
                        {fmt(i.stock)} {i.unit}
                      </span>
                      {low && (
                        <AlertTriangle
                          size={11}
                          className="inline-block ml-1 text-red"
                          strokeWidth={2.2}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-text-3">
                      {fmt(i.min)} {i.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] text-navy">
                      ₾ {fmt2(i.price)}
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{i.supplier}</td>
                    <td className="px-4 py-2.5 font-mono text-[10.5px] text-text-3">{i.location}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-text-3">
                    ძიების შედეგი ვერ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DmtPageShell>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon
}: {
  label: string;
  value: string;
  accent?: 'red';
  icon?: typeof Boxes;
}) {
  const color = accent === 'red' ? 'var(--red)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {label}
        </div>
        {Icon && <Icon size={14} className="text-text-3" />}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}
