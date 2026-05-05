'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {FileText, Plus, X} from 'lucide-react';
import {OfferEditor, type OfferLeadRef} from '@/components/dmt/offer-editor';
import type {DmtOffer, OfferStatus} from '@/lib/dmt/offers-store';

type ManualLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
};

const STATUS_META: Record<OfferStatus, {label: string; color: string; bg: string; border: string}> = {
  draft:     {label: 'მოლოდინში',  color: 'var(--text-2)', bg: 'var(--sur-2)',    border: 'var(--bdr)'},
  sent:      {label: 'გაგზავნილი', color: 'var(--blue)',   bg: 'var(--blue-lt)',  border: 'var(--blue-bd)'},
  approved:  {label: 'დადასტ.',     color: 'var(--grn)',    bg: 'var(--grn-lt)',   border: 'var(--grn-bd)'},
  rejected:  {label: 'უარყოფ.',     color: 'var(--red)',    bg: 'var(--red-lt)',   border: '#f0b8b4'},
  cancelled: {label: 'გაუქმ.',     color: 'var(--text-3)', bg: 'var(--sur-2)',    border: 'var(--bdr)'},
};

function fmtMoney(n: number, currency: string) {
  return `${currency === 'GEL' ? '₾ ' : currency + ' '}${n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function fmtDate(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('en-GB').replace(',', ''); } catch { return iso; }
}

export default function InvoicesPage() {
  const [q, setQ] = useState('');
  const [offers, setOffers] = useState<DmtOffer[]>([]);
  const [leads, setLeads] = useState<ManualLead[]>([]);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [editorLead, setEditorLead] = useState<OfferLeadRef | null>(null);
  const [editorOffer, setEditorOffer] = useState<DmtOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [offersRes, leadsRes] = await Promise.all([
        fetch('/api/dmt/offers').then((r) => r.json()),
        fetch('/api/dmt/manual-leads').then((r) => r.json()),
      ]);
      setOffers(offersRes.offers ?? []);
      setLeads(leadsRes.rows ?? []);
    } catch (err) {
      console.error('refresh failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return offers;
    return offers.filter((o) => {
      const lead = leads.find((l) => l.id === o.leadId);
      const haystack = [o.id, o.leadId, lead?.company, lead?.contact, o.status, String(o.total)].join(' ').toLowerCase();
      return haystack.includes(t);
    });
  }, [offers, leads, q]);

  const totalAmount = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const sentCount = filtered.filter((o) => o.status === 'sent').length;
  const approvedCount = filtered.filter((o) => o.status === 'approved').length;

  const startNew = () => {
    if (leads.length === 0) {
      alert('ჯერ ერთი manual ლიდი მაინც დაამატე /dmt/leads/manual გვერდიდან.');
      return;
    }
    setShowLeadPicker(true);
  };

  const onLeadSelected = (lead: ManualLead) => {
    setShowLeadPicker(false);
    setEditorLead({id: lead.id, company: lead.company, contact: lead.contact, phone: lead.phone});
    setEditorOffer(null);
  };

  const onEditOffer = (offer: DmtOffer) => {
    const lead = leads.find((l) => l.id === offer.leadId);
    if (!lead) {
      alert('ლიდი ვერ მოიძებნა.');
      return;
    }
    setEditorLead({id: lead.id, company: lead.company, contact: lead.contact, phone: lead.phone});
    setEditorOffer(offer);
  };

  const onEditorClose = () => {
    setEditorLead(null);
    setEditorOffer(null);
  };

  const onEditorSaved = (saved: DmtOffer) => {
    setOffers((prev) => {
      const idx = prev.findIndex((o) => o.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  };

  return (
    <DmtPageShell
      kicker="OPERATIONS"
      title="ინვოისები"
      subtitle="კომერციული წინადადებები — ლიდისთვის გენერირებული PDF-ები"
      searchPlaceholder="ძიება ID / კლიენტი / სტატუსი…"
      onQueryChange={setQ}
      actions={
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={14} /> ახალი ინვოისი
        </button>
      }
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="ნაჩვენები" value={String(filtered.length)} />
          <StatCard label="მთლიანი თანხა" value={fmtMoney(totalAmount, 'GEL')} />
          <StatCard label="გაგზავნილი" value={String(sentCount)} accent="blue" />
          <StatCard label="დადასტურებული" value={String(approvedCount)} accent="grn" />
        </div>

        {loading ? (
          <div className="rounded-[10px] border border-bdr bg-sur p-6 text-center text-[12px] text-text-3">
            იტვირთება…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={startNew} />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-bdr bg-sur">
            <table className="w-full">
              <thead className="border-b border-bdr bg-sur-2 text-left">
                <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">კლიენტი</th>
                  <th className="px-3 py-2.5">ლიდი</th>
                  <th className="px-3 py-2.5 text-right">ჯამი</th>
                  <th className="px-3 py-2.5">სტატუსი</th>
                  <th className="px-3 py-2.5">PDF</th>
                  <th className="px-3 py-2.5">თარიღი</th>
                  <th className="px-3 py-2.5 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const lead = leads.find((l) => l.id === o.leadId);
                  const st = STATUS_META[o.status];
                  return (
                    <tr key={o.id} className="border-b border-bdr/70 last:border-b-0 text-[12px] hover:bg-sur-2">
                      <td className="px-3 py-2 font-mono font-semibold text-navy">{o.id}</td>
                      <td className="px-3 py-2 text-text-2">{lead?.company || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-3">
                        <Link href={`/dmt/leads/manual?highlight=${encodeURIComponent(o.leadId)}`} className="hover:text-blue">
                          {o.leadId}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-navy">{fmtMoney(o.total, o.currency)}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                          style={{color: st.color, background: st.bg, borderColor: st.border}}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {o.pdfUrl ? (
                          <a href={o.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue hover:underline">
                            <FileText size={12} /> ნახე
                          </a>
                        ) : (
                          <span className="text-[11px] text-text-3">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-text-3">{fmtDate(o.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onEditOffer(o)}
                          className="rounded-md border border-bdr bg-sur px-2 py-1 text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
                        >
                          რედაქტ.
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLeadPicker && (
        <LeadPickerModal
          leads={leads}
          onPick={onLeadSelected}
          onClose={() => setShowLeadPicker(false)}
        />
      )}

      {editorLead && (
        <OfferEditor
          lead={editorLead}
          offer={editorOffer}
          onClose={onEditorClose}
          onSaved={onEditorSaved}
        />
      )}
    </DmtPageShell>
  );
}

function LeadPickerModal({leads, onPick, onClose}: {leads: ManualLead[]; onPick: (lead: ManualLead) => void; onClose: () => void}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter((l) => [l.id, l.company, l.contact, l.phone].join(' ').toLowerCase().includes(t));
  }, [leads, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-bdr bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
          <h2 className="text-[14px] font-bold text-navy">აირჩიე ლიდი</h2>
          <button onClick={onClose} className="rounded p-1 text-text-3 hover:bg-sur-2">
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-bdr px-3 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ძიება…"
            autoFocus
            className="w-full rounded-md border border-bdr bg-sur-2 px-2 py-1.5 text-[12px] focus:border-blue focus:outline-none"
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-text-3">ლიდი ვერ მოიძებნა</div>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onPick(lead)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-sur-2"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-navy">{lead.company || '—'}</div>
                  <div className="text-[11px] text-text-3">{lead.contact || '—'} · {lead.phone || '—'}</div>
                </div>
                <span className="font-mono text-[10.5px] text-text-3">{lead.id}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({onCreate}: {onCreate: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sur-2 text-text-3">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="mt-3 text-[14px] font-semibold text-navy">ინვოისი ჯერ არ არსებობს</div>
      <div className="mt-1 max-w-sm text-[12px] text-text-3">
        შექმენი პირველი ინვოისი „+ ახალი" ღილაკით. აირჩიე ლიდი → შეავსე items + ფასი → PDF გენერაცია.
      </div>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
      >
        <Plus size={14} /> ახალი ინვოისი
      </button>
    </div>
  );
}

function StatCard({label, value, accent}: {label: string; value: string; accent?: 'red' | 'grn' | 'blue'}) {
  const color = accent === 'red' ? 'var(--red)' : accent === 'grn' ? 'var(--grn)' : accent === 'blue' ? 'var(--blue)' : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>{value}</div>
    </div>
  );
}
