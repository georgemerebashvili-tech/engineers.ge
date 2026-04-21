'use client';

import {useMemo, useState} from 'react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {ResizableTable} from '@/components/dmt/resizable-table';
import {Facebook, ExternalLink} from 'lucide-react';

type FbLead = {
  id: string;
  createdAt: string;
  campaign: string;
  adset: string;
  ad: string;
  form: string;
  name: string;
  phone: string;
  email: string;
  cost: number;
  status: 'new' | 'called' | 'scheduled' | 'converted' | 'lost';
};

const FB: FbLead[] = [
  {id: 'FB-8821', createdAt: '2026-04-21 10:14', campaign: 'HVAC_Spring', adset: 'Business-Owners TB',  ad: 'Video-15s-v2',  form: 'HVAC-Quote',        name: 'ზურაბ გოგელია',       phone: '+995 551 12 34 56', email: 'z.gogelia@gmail.com',     cost: 4.20, status: 'new'},
  {id: 'FB-8820', createdAt: '2026-04-21 09:02', campaign: 'HVAC_Spring', adset: 'Business-Owners TB',  ad: 'Video-15s-v2',  form: 'HVAC-Quote',        name: 'ანა ქიქოძე',           phone: '+995 599 87 65 43', email: 'anaqiqodze@yahoo.com',    cost: 4.20, status: 'called'},
  {id: 'FB-8818', createdAt: '2026-04-20 18:45', campaign: 'HeatLoss_Edu', adset: 'Engineers-KA',       ad: 'Carousel-3sl',  form: 'Webinar-Signup',    name: 'ირაკლი ფხაკაძე',       phone: '+995 555 11 22 33', email: 'ifxakadze@mail.ru',       cost: 1.80, status: 'scheduled'},
  {id: 'FB-8817', createdAt: '2026-04-20 16:22', campaign: 'HeatLoss_Edu', adset: 'Engineers-KA',       ad: 'Carousel-3sl',  form: 'Webinar-Signup',    name: 'თამარ ბერიძე',         phone: '+995 577 33 22 11', email: 't.beridze@gmail.com',     cost: 1.80, status: 'converted'},
  {id: 'FB-8815', createdAt: '2026-04-20 11:01', campaign: 'HVAC_Brand',   adset: 'Contractors-28-55',  ad: 'Image-Catalog-v1', form: 'HVAC-Catalog',      name: 'ნიკა ჭელიძე',          phone: '+995 595 44 55 66', email: 'n.chelidze@outlook.com',  cost: 6.40, status: 'new'},
  {id: 'FB-8814', createdAt: '2026-04-20 09:37', campaign: 'HVAC_Spring',  adset: 'Homeowners-premium', ad: 'Video-30s',     form: 'HVAC-Quote',        name: 'ლევან კიკნაძე',        phone: '+995 551 99 88 77', email: 'l.kiknadze@mail.ge',      cost: 5.10, status: 'called'},
  {id: 'FB-8811', createdAt: '2026-04-19 20:15', campaign: 'Parking_CO',   adset: 'Facility-managers',  ad: 'Video-CO-alarm',form: 'Parking-Consult',   name: 'დავით ცხვედიანი',      phone: '+995 599 55 44 33', email: 'd.tskhvediani@sazeo.ge',  cost: 8.90, status: 'converted'},
  {id: 'FB-8810', createdAt: '2026-04-19 17:02', campaign: 'Parking_CO',   adset: 'Facility-managers',  ad: 'Video-CO-alarm',form: 'Parking-Consult',   name: 'მარიამ მაისურაძე',     phone: '+995 577 88 99 00', email: 'mariam.m@bgeo.ge',        cost: 8.90, status: 'new'},
  {id: 'FB-8809', createdAt: '2026-04-19 14:48', campaign: 'HeatLoss_Edu', adset: 'Engineers-KA',       ad: 'Static-EN12831',form: 'Webinar-Signup',    name: 'გიორგი მთვარელიძე',    phone: '+995 551 44 33 22', email: 'gmtvarelidze@archi.ge',   cost: 1.80, status: 'scheduled'},
  {id: 'FB-8807', createdAt: '2026-04-19 11:24', campaign: 'HVAC_Spring',  adset: 'Business-Owners TB', ad: 'Video-15s-v2',  form: 'HVAC-Quote',        name: 'სოფო ჯავახიშვილი',     phone: '+995 595 77 66 55', email: 's.javakhi@silknet.ge',    cost: 4.20, status: 'lost'},
  {id: 'FB-8806', createdAt: '2026-04-19 09:11', campaign: 'HVAC_Brand',   adset: 'Contractors-28-55',  ad: 'Image-Catalog-v2', form: 'HVAC-Catalog',      name: 'ზაქარია ბუაძე',        phone: '+995 599 22 33 44', email: 'z.buadze@caucasus.ge',    cost: 6.40, status: 'called'},
  {id: 'FB-8803', createdAt: '2026-04-18 19:50', campaign: 'HVAC_Spring',  adset: 'Homeowners-premium', ad: 'Video-30s',     form: 'HVAC-Quote',        name: 'ნინო ჭანია',           phone: '+995 555 66 77 88', email: 'nchania@outlook.com',     cost: 5.10, status: 'new'},
  {id: 'FB-8801', createdAt: '2026-04-18 14:32', campaign: 'Parking_CO',   adset: 'Facility-managers',  ad: 'Video-CO-alarm',form: 'Parking-Consult',   name: 'ლაშა ლომიძე',          phone: '+995 551 33 44 55', email: 'l.lomidze@croads.ge',     cost: 8.90, status: 'converted'},
  {id: 'FB-8798', createdAt: '2026-04-18 10:05', campaign: 'HeatLoss_Edu', adset: 'Engineers-KA',       ad: 'Carousel-3sl',  form: 'Webinar-Signup',    name: 'ვახო ქემოკლიძე',       phone: '+995 577 11 22 33', email: 'v.qemoklidze@hpl.ge',     cost: 1.80, status: 'scheduled'},
  {id: 'FB-8796', createdAt: '2026-04-17 22:17', campaign: 'HVAC_Spring',  adset: 'Business-Owners TB', ad: 'Video-15s-v2',  form: 'HVAC-Quote',        name: 'ცოტნე გოგია',          phone: '+995 595 88 99 00', email: 'tsgogia@hotmail.com',     cost: 4.20, status: 'new'},
  {id: 'FB-8795', createdAt: '2026-04-17 18:02', campaign: 'HVAC_Brand',   adset: 'Contractors-28-55',  ad: 'Image-Catalog-v1', form: 'HVAC-Catalog',      name: 'ბაჩო ციხესელი',        phone: '+995 551 77 88 99', email: 'b.tsikheseli@archi.ge',   cost: 6.40, status: 'called'},
  {id: 'FB-8792', createdAt: '2026-04-17 12:44', campaign: 'HeatLoss_Edu', adset: 'Engineers-KA',       ad: 'Static-EN12831',form: 'Webinar-Signup',    name: 'ციცო ფურცელაძე',       phone: '+995 599 00 11 22', email: 'ts.purceladze@mail.ge',   cost: 1.80, status: 'converted'},
  {id: 'FB-8790', createdAt: '2026-04-17 09:28', campaign: 'HVAC_Spring',  adset: 'Homeowners-premium', ad: 'Video-30s',     form: 'HVAC-Quote',        name: 'ელენე მელაძე',         phone: '+995 555 33 44 55', email: 'e.meladze@gmail.com',     cost: 5.10, status: 'lost'}
];

const STATUS_META = {
  new:       {label: 'ახალი',    color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  called:    {label: 'დარეკვა',  color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  scheduled: {label: 'შეხვედრა', color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  converted: {label: 'კონვ.',    color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  lost:      {label: 'დაკარგვა', color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
} as const;

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n);
}

export default function FacebookLeadsPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return FB;
    return FB.filter(
      (l) =>
        l.name.toLowerCase().includes(t) ||
        l.email.toLowerCase().includes(t) ||
        l.campaign.toLowerCase().includes(t) ||
        l.form.toLowerCase().includes(t) ||
        l.status.includes(t)
    );
  }, [q]);

  const totalCost = filtered.reduce((s, l) => s + l.cost, 0);
  const converted = filtered.filter((l) => l.status === 'converted').length;
  const cpl = filtered.length ? totalCost / filtered.length : 0;
  const cpa = converted ? totalCost / converted : 0;

  return (
    <DmtPageShell
      kicker="FACEBOOK ADS · LEAD-GEN"
      title="Facebook ლიდები"
      subtitle="Meta Lead Ads-იდან ავტომატურად შემოსული ლიდები — campaign / adset / ad / form მეტადატა"
      searchPlaceholder="ძიება სახელი / email / campaign / form…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <StatCard label="ლიდი" value={String(filtered.length)} />
          <StatCard label="კონვერტ." value={String(converted)} accent="grn" />
          <StatCard label="Spend" value={`$ ${fmt(totalCost)}`} />
          <StatCard label="CPL" value={`$ ${fmt(cpl)}`} />
          <StatCard label="CPA" value={`$ ${fmt(cpa)}`} accent={cpa > 0 && cpa < 15 ? 'grn' : 'red'} />
        </div>

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <ResizableTable storageKey="leads-facebook" className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                  <th className="px-3 py-2.5 font-bold">Lead ID</th>
                  <th className="px-3 py-2.5 font-bold">დრო</th>
                  <th className="px-3 py-2.5 font-bold">Campaign</th>
                  <th className="px-3 py-2.5 font-bold">Ad</th>
                  <th className="px-3 py-2.5 font-bold">Form</th>
                  <th className="px-3 py-2.5 font-bold">სახელი</th>
                  <th className="px-3 py-2.5 font-bold">ტელეფონი</th>
                  <th className="px-3 py-2.5 font-bold">Email</th>
                  <th className="px-3 py-2.5 text-right font-bold">ღირებ.</th>
                  <th className="px-3 py-2.5 font-bold">სტატუსი</th>
                  <th className="px-3 py-2.5 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const st = STATUS_META[l.status];
                  return (
                    <tr key={l.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
                      <td className="px-3 py-2.5 font-mono text-[10.5px] font-semibold text-navy">
                        <span className="inline-flex items-center gap-1">
                          <Facebook size={11} className="text-blue" /> {l.id}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{l.createdAt}</td>
                      <td className="px-3 py-2.5 text-text-2">
                        <div className="font-semibold">{l.campaign}</div>
                        <div className="font-mono text-[10px] text-text-3">{l.adset}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{l.ad}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2">
                          {l.form}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-text">{l.name}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">{l.phone}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-3">{l.email}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] text-navy">${fmt(l.cost)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                          style={{color: st.color, background: st.bg, borderColor: st.border}}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-3">
                        <ExternalLink size={12} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-text-3">
                      ძიების შედეგი ვერ მოიძებნა
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableTable>
        </div>

        <div className="mt-4 rounded-[10px] border border-blue-bd bg-blue-lt p-3 text-[12px] leading-relaxed text-text-2">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-blue">
            <Facebook size={12} /> Integration note
          </div>
          მონაცემები ახლა mock-ია. Production-ისთვის: <b>Meta Lead Ads Webhook</b> → ჩვენი endpoint → Supabase table <code>fb_leads</code>. Campaign/Adset/Ad/Form fields პირდაპირ Facebook Graph API-დან მოდის. Cost — Meta Ads Insights API-ით per-lead cost attribution (daily/campaign level).
        </div>
      </div>
    </DmtPageShell>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'grn' | 'red'}) {
  const color = accent === 'grn' ? 'var(--grn)' : accent === 'red' ? 'var(--red)' : 'var(--navy)';
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
