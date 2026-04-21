'use client';

import {useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type Status = 'paid' | 'pending' | 'overdue' | 'draft';

const INVOICES: Array<{
  id: string;
  client: string;
  issued: string;
  due: string;
  amount: number;
  status: Status;
}> = [
  {id: 'INV-2026-0147', client: 'შპს "სამშენებლო-ინჟ."', issued: '2026-04-18', due: '2026-05-18', amount: 4820, status: 'pending'},
  {id: 'INV-2026-0146', client: 'HVAC Pro Georgia', issued: '2026-04-15', due: '2026-05-15', amount: 12400, status: 'paid'},
  {id: 'INV-2026-0145', client: 'ი/მ გიორგი მერებაშვილი', issued: '2026-04-12', due: '2026-04-19', amount: 850, status: 'overdue'},
  {id: 'INV-2026-0144', client: 'სამსენ ავტო', issued: '2026-04-10', due: '2026-05-10', amount: 3200, status: 'paid'},
  {id: 'INV-2026-0143', client: 'TBC Concept', issued: '2026-04-09', due: '2026-05-09', amount: 7640, status: 'pending'},
  {id: 'INV-2026-0142', client: 'Sazeo International', issued: '2026-04-05', due: '2026-05-05', amount: 18200, status: 'pending'},
  {id: 'INV-2026-0141', client: 'Smart Building GE', issued: '2026-04-03', due: '2026-04-17', amount: 2300, status: 'overdue'},
  {id: 'INV-2026-0140', client: 'BGEO Group', issued: '2026-04-01', due: '2026-05-01', amount: 9800, status: 'paid'},
  {id: 'INV-2026-0139', client: 'Archi Group', issued: '2026-03-28', due: '2026-04-28', amount: 5400, status: 'pending'},
  {id: 'INV-2026-0138', client: 'Mepflow Ltd', issued: '2026-03-25', due: '2026-04-25', amount: 2100, status: 'paid'},
  {id: 'INV-2026-0137', client: 'Caucasus Roads', issued: '2026-03-22', due: '2026-04-22', amount: 14500, status: 'pending'},
  {id: 'INV-2026-0136', client: 'HPL Engineering', issued: '2026-03-20', due: '2026-04-20', amount: 6700, status: 'paid'},
  {id: 'INV-2026-0135', client: 'ი/მ ლევან ცხვედიანი', issued: '2026-03-18', due: '2026-04-01', amount: 450, status: 'overdue'},
  {id: 'INV-2026-0134', client: 'Tegeta Motors', issued: '2026-03-15', due: '2026-04-15', amount: 3900, status: 'paid'},
  {id: 'INV-2026-0133', client: 'Silknet', issued: '2026-03-10', due: '2026-04-10', amount: 1250, status: 'paid'}
];

const STATUS_META: Record<Status, {label: string; color: string; bg: string; border: string}> = {
  paid: {label: 'გადახდილი', color: 'var(--grn)', bg: 'var(--grn-lt)', border: 'var(--grn-bd)'},
  pending: {label: 'მოლოდინში', color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  overdue: {label: 'ვადაგადაცილება', color: 'var(--red)', bg: 'var(--red-lt)', border: '#f0b8b4'},
  draft: {label: 'დრაფტი', color: 'var(--text-3)', bg: 'var(--sur-2)', border: 'var(--bdr)'}
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function InvoicesPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return INVOICES;
    return INVOICES.filter(
      (i) =>
        i.id.toLowerCase().includes(term) ||
        i.client.toLowerCase().includes(term) ||
        i.status.includes(term)
    );
  }, [q]);

  const total = filtered.reduce((s, i) => s + i.amount, 0);
  const pending = filtered.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვოისები"
      subtitle="ყველა გამოცემული ინვოისი — გადახდილი, მოლოდინში, ვადაგადაცილებული"
      searchPlaceholder="ძიება ID / კლიენტი / სტატუსი…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="ნაჩვენები" value={String(filtered.length)} />
          <StatCard label="მთლიანი თანხა" value={`₾ ${fmt(total)}`} />
          <StatCard label="გადასახდელი" value={`₾ ${fmt(pending)}`} accent="red" />
          <StatCard label="გადახდის მაჩვენებელი" value={`${Math.round((1 - pending / (total || 1)) * 100)}%`} accent="grn" />
        </div>

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                <th className="px-4 py-2.5 font-bold">ID</th>
                <th className="px-4 py-2.5 font-bold">კლიენტი</th>
                <th className="px-4 py-2.5 font-bold">გამოცემის თ.</th>
                <th className="px-4 py-2.5 font-bold">ვადა</th>
                <th className="px-4 py-2.5 text-right font-bold">თანხა</th>
                <th className="px-4 py-2.5 font-bold">სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const st = STATUS_META[inv.status];
                return (
                  <tr key={inv.id} className="border-b border-bdr last:border-b-0 transition-colors hover:bg-sur-2">
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-navy">{inv.id}</td>
                    <td className="px-4 py-2.5 text-text">{inv.client}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-text-2">{inv.issued}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-text-2">{inv.due}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] font-semibold text-navy">₾ {fmt(inv.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{color: st.color, background: st.bg, borderColor: st.border}}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-3">
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

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'red' | 'grn'}) {
  const color = accent === 'red' ? 'var(--red)' : accent === 'grn' ? 'var(--grn)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}
