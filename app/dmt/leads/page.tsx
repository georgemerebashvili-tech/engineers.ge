'use client';

import {useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {Phone, Mail} from 'lucide-react';

type Stage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
type Source = 'website' | 'referral' | 'cold' | 'social' | 'facebook' | 'linkedin';

const LEADS: Array<{
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: Source;
  stage: Stage;
  owner: string;
  value: number;
  created: string;
}> = [
  {id: 'L-1042', name: 'ნიკა გელაშვილი', company: 'შპს აზიზი', phone: '+995 551 12 34 56', email: 'nika@azizi.ge', source: 'website', stage: 'qualified', owner: 'გიორგი', value: 8500, created: '2026-04-20'},
  {id: 'L-1041', name: 'ლევან კიკნაძე', company: 'ი/მ კიკნაძე', phone: '+995 599 87 65 43', email: 'l.kiknadze@gmail.com', source: 'referral', stage: 'proposal', owner: 'გიორგი', value: 14200, created: '2026-04-19'},
  {id: 'L-1040', name: 'მარიამ ბერიძე', company: 'Sazeo International', phone: '+995 577 33 22 11', email: 'mariam@sazeo.ge', source: 'linkedin', stage: 'contacted', owner: 'ლანა', value: 22000, created: '2026-04-18'},
  {id: 'L-1039', name: 'დავით გოგოლაძე', company: 'BGEO Group', phone: '+995 555 44 55 66', email: 'd.gogoladze@bgeo.ge', source: 'website', stage: 'new', owner: '—', value: 3200, created: '2026-04-17'},
  {id: 'L-1038', name: 'თამარ ბუაძე', company: 'HVAC Pro Georgia', phone: '+995 595 11 22 33', email: 't.buadze@hvacpro.ge', source: 'referral', stage: 'won', owner: 'გიორგი', value: 6400, created: '2026-04-15'},
  {id: 'L-1037', name: 'ზურაბ ლომიძე', company: 'Caucasus Roads', phone: '+995 551 99 88 77', email: 'z.lomidze@croads.ge', source: 'cold', stage: 'qualified', owner: 'ლანა', value: 48000, created: '2026-04-14'},
  {id: 'L-1036', name: 'ანა ქიმერიძე', company: 'Smart Building GE', phone: '+995 597 22 11 00', email: 'a.qimeridze@sb.ge', source: 'facebook', stage: 'new', owner: '—', value: 1800, created: '2026-04-13'},
  {id: 'L-1035', name: 'გიორგი ცხვედიანი', company: 'ი/მ ცხვედიანი', phone: '+995 599 55 44 33', email: 'g.tskhvediani@mail.ru', source: 'cold', stage: 'lost', owner: 'გიორგი', value: 900, created: '2026-04-10'},
  {id: 'L-1034', name: 'ნინო ქემოკლიძე', company: 'Archi Group', phone: '+995 551 66 77 88', email: 'nino@archigroup.ge', source: 'website', stage: 'proposal', owner: 'ლანა', value: 12300, created: '2026-04-09'},
  {id: 'L-1033', name: 'ირაკლი ნიკოლაიშვილი', company: 'HPL Engineering', phone: '+995 577 88 99 00', email: 'iraklin@hpl.ge', source: 'linkedin', stage: 'contacted', owner: 'გიორგი', value: 7600, created: '2026-04-08'},
  {id: 'L-1032', name: 'სოფო ჯავახიშვილი', company: 'Silknet', phone: '+995 595 77 66 55', email: 's.javakhi@silknet.ge', source: 'referral', stage: 'qualified', owner: 'ლანა', value: 3400, created: '2026-04-06'},
  {id: 'L-1031', name: 'გია მთვარელიძე', company: 'Tegeta Motors', phone: '+995 551 44 33 22', email: 'g.mtvarelidze@tegeta.ge', source: 'website', stage: 'won', owner: 'გიორგი', value: 15800, created: '2026-04-02'}
];

const STAGE_META: Record<Stage, {label: string; color: string; bg: string; border: string}> = {
  new:        {label: 'ახალი',        color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  contacted:  {label: 'კონტაქტი',     color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  qualified:  {label: 'კვალიფ.',      color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  proposal:   {label: 'შეთავაზება',   color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  won:        {label: 'მოგება',       color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  lost:       {label: 'დაკარგვა',     color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
};

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
