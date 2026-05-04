'use client';

import {useState} from 'react';
import {Check, FileText, PackageCheck, Play, X} from 'lucide-react';
import {
  OFFER_STATUS_META,
  checkLeadInventory,
  decideLeadOffer,
  generateLeadInvoice,
  type Lead,
  type LeadAuditEntry,
} from '@/lib/dmt/leads-store';

export function LeadStatusCell({
  lead,
  onSaved,
}: {
  lead: Lead;
  onSaved: (lead: Lead, auditEntry?: LeadAuditEntry | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = OFFER_STATUS_META[lead.offerStatus] ?? OFFER_STATUS_META.offer_in_progress;
  const Icon = meta.icon === 'check' ? Check : meta.icon === 'x' ? X : Play;

  const run = async (fn: () => Promise<{lead: Lead; auditEntry?: LeadAuditEntry | null}>) => {
    setBusy(true);
    try {
      const saved = await fn();
      onSaved(saved.lead, saved.auditEntry ?? null);
    } catch (error) {
      const err = error as Error & {body?: {missing?: string[]}};
      if (err.body?.missing?.length) alert('ჯერ მონიშნე ინვენტარიზაცია და გენერირე ინვოისი.');
      else alert(err.message || 'Workflow ცვლილება ვერ შეინახა.');
    } finally {
      setBusy(false);
    }
  };

  const canAccept = lead.inventoryChecked && !!lead.invoiceId;

  return (
    <div className="relative px-2 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
        style={{color: meta.color, background: meta.bg, borderColor: meta.border}}
      >
        <Icon size={12} />
        <span className="truncate">{meta.label}</span>
      </button>
      {open && (
        <div className="absolute left-2 top-9 z-40 w-[280px] rounded-lg border border-bdr bg-sur p-3 text-[12px] shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-navy">{meta.label}</div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-text-3 hover:bg-sur-2">
              <X size={13} />
            </button>
          </div>
          {lead.offerStatus === 'offer_in_progress' ? (
            <div className="space-y-2">
              <button
                disabled={busy || lead.inventoryChecked}
                onClick={() => void run(() => checkLeadInventory(lead.id))}
                className="flex w-full items-center justify-between rounded-md border border-bdr bg-sur-2 px-2 py-2 text-left hover:border-blue disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-2"><PackageCheck size={14} /> ინვენტარიზაცია</span>
                {lead.inventoryChecked ? <Check size={14} className="text-grn" /> : <span className="text-text-3">მონიშვნა</span>}
              </button>
              <button
                disabled={busy || !!lead.invoiceId}
                onClick={() => void run(() => generateLeadInvoice(lead.id))}
                className="flex w-full items-center justify-between rounded-md border border-bdr bg-sur-2 px-2 py-2 text-left hover:border-blue disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-2"><FileText size={14} /> ინვოისი</span>
                {lead.invoiceId ? <span className="font-mono text-[11px] text-grn">{lead.invoiceId}</span> : <span className="text-text-3">გენერაცია</span>}
              </button>
              <div className="pt-2">
                <div className="mb-1 text-[10px] font-bold uppercase text-text-3">გადაწყვეტილება</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={busy || !canAccept}
                    title={!canAccept ? 'ჯერ მონიშნე ინვენტარიზაცია და გენერირე ინვოისი' : undefined}
                    onClick={() => void run(() => decideLeadOffer(lead.id, 'accepted'))}
                    className="rounded-md border border-grn-bd bg-grn-lt px-2 py-1.5 font-semibold text-grn disabled:cursor-not-allowed disabled:border-bdr disabled:bg-sur-2 disabled:text-text-3"
                  >
                    მიღებულია
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => decideLeadOffer(lead.id, 'rejected'))}
                    className="rounded-md border border-red bg-red-lt px-2 py-1.5 font-semibold text-red"
                  >
                    უარყოფილი
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-bdr bg-sur-2 p-2 text-text-2">
              <div>{lead.offerDecidedAt ? new Date(lead.offerDecidedAt).toLocaleDateString('en-GB') : ''}</div>
              <div className="text-text-3">by {lead.offerDecidedBy || 'DMT'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
