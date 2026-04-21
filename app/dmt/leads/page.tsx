'use client';

import {useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {Phone, Mail} from 'lucide-react';
import {LEADS, STAGE_META} from '@/lib/dmt/leads-data';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function LeadsPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return LEADS;
    return LEADS.filter(
      (l) =>
        l.name.toLowerCase().includes(t) ||
        l.company.toLowerCase().includes(t) ||
        l.email.toLowerCase().includes(t) ||
        l.stage.includes(t)
    );
  }, [q]);

  const total = filtered.reduce((s, l) => s + l.value, 0);
  const won = filtered.filter((l) => l.stage === 'won').length;
  const active = filtered.filter((l) => !['won', 'lost'].includes(l.stage)).length;

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ლიდები"
      subtitle="გაყიდვების pipeline — ახალიდან მოგებამდე"
      searchPlaceholder="ძიება სახელი / კომპანია / email…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="ნაჩვენები" value={String(filtered.length)} />
          <StatCard label="აქტიური" value={String(active)} accent="blue" />
          <StatCard label="მოგებული" value={String(won)} accent="grn" />
          <StatCard label="Pipeline" value={`₾ ${fmt(total)}`} />
        </div>

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                <th className="px-4 py-2.5 font-bold">ID</th>
                <th className="px-4 py-2.5 font-bold">კონტაქტი</th>
                <th className="px-4 py-2.5 font-bold">კომპანია</th>
                <th className="px-4 py-2.5 font-bold">კავშირი</th>
                <th className="px-4 py-2.5 font-bold">წყარო</th>
                <th className="px-4 py-2.5 font-bold">სტადია</th>
                <th className="px-4 py-2.5 font-bold">მფლ.</th>
                <th className="px-4 py-2.5 text-right font-bold">ღირებ.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const st = STAGE_META[l.stage];
                return (
                  <tr key={l.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-navy">{l.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-text">{l.name}</div>
                      <div className="font-mono text-[10px] text-text-3">{l.created}</div>
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{l.company}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 text-[11px] text-text-2">
                        <Phone size={10} /> {l.phone}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-text-3">
                        <Mail size={10} /> {l.email}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2">
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{color: st.color, background: st.bg, borderColor: st.border}}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{l.owner}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] font-semibold text-navy">₾ {fmt(l.value)}</td>
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

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'blue' | 'grn'}) {
  const color = accent === 'blue' ? 'var(--blue)' : accent === 'grn' ? 'var(--grn)' : 'var(--navy)';
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
