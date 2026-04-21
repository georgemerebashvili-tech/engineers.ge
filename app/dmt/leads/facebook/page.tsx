'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {ResizableTable} from '@/components/dmt/resizable-table';
import {Facebook, ExternalLink, BarChart3, RefreshCw, AlertCircle} from 'lucide-react';

type FbLead = {
  id: string;
  leadgen_id: string;
  page_id: string;
  ad_id: string | null;
  adset_id: string | null;
  campaign_id: string | null;
  form_id: string | null;
  form_name: string | null;
  created_time: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  lead_status: 'new' | 'called' | 'scheduled' | 'converted' | 'lost';
  field_data: Array<{name?: string; values?: string[]}> | null;
  received_at: string;
};

const STATUS_META = {
  new:       {label: 'ახალი',    color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  called:    {label: 'დარეკვა',  color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  scheduled: {label: 'შეხვედრა', color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  converted: {label: 'კონვ.',    color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  lost:      {label: 'დაკარგვა', color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
} as const;

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export default function FacebookLeadsPage() {
  const [leads, setLeads] = useState<FbLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmt/fb-leads', {cache: 'no-store'});
      const json = await res.json();
      if (json.error) setError(String(json.error));
      setLeads(Array.isArray(json.leads) ? json.leads : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter(
      (l) =>
        (l.full_name ?? '').toLowerCase().includes(t) ||
        (l.email ?? '').toLowerCase().includes(t) ||
        (l.phone ?? '').toLowerCase().includes(t) ||
        (l.campaign_id ?? '').toLowerCase().includes(t) ||
        (l.form_name ?? '').toLowerCase().includes(t) ||
        (l.form_id ?? '').toLowerCase().includes(t) ||
        l.lead_status.includes(t)
    );
  }, [q, leads]);

  const converted = filtered.filter((l) => l.lead_status === 'converted').length;
  const contactable = filtered.filter((l) => l.phone || l.email).length;

  return (
    <DmtPageShell
      kicker="FACEBOOK ADS · LEAD-GEN"
      title="Facebook ლიდები"
      subtitle="Meta Lead Ads-იდან ავტომატურად შემოსული ლიდები — webhook → dmt_fb_leads"
      searchPlaceholder="ძიება სახელი / email / campaign / form…"
      onQueryChange={setQ}
      actions={
        <>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            განახლება
          </button>
          <Link
            href="/dmt/leads/facebook/analytics"
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <BarChart3 size={14} /> ანალიტიკა
          </Link>
        </>
      }
    >
      <div className="px-6 py-5 md:px-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <b>შეცდომა:</b> {error}
            </div>
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <StatCard label="ლიდი" value={loading ? '…' : String(filtered.length)} />
          <StatCard label="კონვერტ." value={loading ? '…' : String(converted)} accent="grn" />
          <StatCard label="კონტაქტი" value={loading ? '…' : String(contactable)} />
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
                  <th className="px-3 py-2.5 font-bold">სტატუსი</th>
                  <th className="px-3 py-2.5 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const st = STATUS_META[l.lead_status];
                  return (
                    <tr key={l.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
                      <td className="px-3 py-2.5 font-mono text-[10.5px] font-semibold text-navy">
                        <span className="inline-flex items-center gap-1">
                          <Facebook size={11} className="text-blue" />
                          {l.leadgen_id.slice(-8)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">
                        {fmtDate(l.created_time)}
                      </td>
                      <td className="px-3 py-2.5 text-text-2">
                        <div className="font-semibold">{l.campaign_id ?? '—'}</div>
                        <div className="font-mono text-[10px] text-text-3">{l.adset_id ?? ''}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">
                        {l.ad_id ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[10px] text-text-2">
                          {l.form_name ?? l.form_id ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-text">
                        {l.full_name ?? <span className="text-text-3">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-2">
                        {l.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-3">
                        {l.email ?? '—'}
                      </td>
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
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-text-3">
                      {leads.length === 0
                        ? 'ცხრილი ცარიელია — Meta webhook ჯერ არ გადმოგვიგზავნა ლიდი'
                        : 'ძიების შედეგი ვერ მოიძებნა'}
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-text-3">
                      იტვირთება…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableTable>
        </div>

        {leads.length === 0 && !loading && !error && (
          <div className="mt-4 rounded-[10px] border border-blue-bd bg-blue-lt p-3 text-[12px] leading-relaxed text-text-2">
            <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-blue">
              <Facebook size={12} /> Setup საჭიროა
            </div>
            webhook გამართვა →{' '}
            <Link href="/dmt/leads/facebook/setup" className="text-blue underline font-semibold">
              Facebook setup გვერდი
            </Link>
            . `FB_VERIFY_TOKEN` + `FB_APP_SECRET` Vercel env-ში, Meta Dashboard-ში ჩაიცვი Callback URL + Verify Token, Subscribe `leadgen`.
          </div>
        )}
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
