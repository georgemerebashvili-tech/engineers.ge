'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

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
  const stepsDone = (lead.inventoryChecked ? 1 : 0) + (lead.invoiceId ? 1 : 0);

  return (
    <div ref={triggerRef} className="relative px-2 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all hover:shadow-sm"
        style={{color: meta.color, background: meta.bg, borderColor: meta.border}}
      >
        <Icon size={12} strokeWidth={2.5} />
        <span className="truncate">{meta.label}</span>
        {lead.offerStatus === 'offer_in_progress' && (
          <span className="ml-0.5 inline-flex items-center gap-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${lead.inventoryChecked ? 'bg-grn' : 'border border-current opacity-50'}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${lead.invoiceId ? 'bg-grn' : 'border border-current opacity-50'}`} />
          </span>
        )}
      </button>

      {open && mounted && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 w-[320px] overflow-hidden rounded-xl border border-bdr bg-sur shadow-2xl"
          style={{top: pos.top, left: pos.left}}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-bdr px-4 py-3"
            style={{background: meta.bg}}
          >
            <div className="inline-flex items-center gap-2">
              <Icon size={16} strokeWidth={2.5} style={{color: meta.color}} />
              <span className="text-[13px] font-bold" style={{color: meta.color}}>{meta.label}</span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 text-text-3 transition-colors hover:bg-sur hover:text-text">
              <X size={14} />
            </button>
          </div>

          {lead.offerStatus === 'offer_in_progress' ? (
            <>
              {/* Progress indicator */}
              <div className="border-b border-bdr bg-sur-2/50 px-4 py-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-text-3">
                  <span>პროგრესი</span>
                  <span>{stepsDone}/2</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className={`h-1 flex-1 rounded-full ${lead.inventoryChecked ? 'bg-grn' : 'bg-bdr'}`} />
                  <div className={`h-1 flex-1 rounded-full ${lead.invoiceId ? 'bg-grn' : 'bg-bdr'}`} />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2 px-4 py-3">
                <button
                  disabled={busy || lead.inventoryChecked}
                  onClick={() => void run(() => checkLeadInventory(lead.id))}
                  className={`group/step flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    lead.inventoryChecked
                      ? 'border-grn-bd bg-grn-lt cursor-default'
                      : 'border-bdr bg-sur-2 hover:border-blue hover:bg-blue-lt'
                  } disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      lead.inventoryChecked ? 'bg-grn text-white' : 'bg-sur text-text-3 group-hover/step:bg-blue group-hover/step:text-white'
                    }`}
                  >
                    {lead.inventoryChecked ? <Check size={14} strokeWidth={3} /> : <PackageCheck size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] font-semibold ${lead.inventoryChecked ? 'text-grn' : 'text-navy'}`}>
                      ინვენტარიზაცია
                    </div>
                    <div className="text-[10.5px] text-text-3">
                      {lead.inventoryChecked ? '✓ შემოწმდა' : 'click — მონიშვნა'}
                    </div>
                  </div>
                </button>

                <button
                  disabled={busy || !!lead.invoiceId}
                  onClick={() => void run(() => generateLeadInvoice(lead.id))}
                  className={`group/step flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    lead.invoiceId
                      ? 'border-grn-bd bg-grn-lt cursor-default'
                      : 'border-bdr bg-sur-2 hover:border-blue hover:bg-blue-lt'
                  } disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      lead.invoiceId ? 'bg-grn text-white' : 'bg-sur text-text-3 group-hover/step:bg-blue group-hover/step:text-white'
                    }`}
                  >
                    {lead.invoiceId ? <Check size={14} strokeWidth={3} /> : <FileText size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] font-semibold ${lead.invoiceId ? 'text-grn' : 'text-navy'}`}>
                      ინვოისი
                    </div>
                    <div className="text-[10.5px] text-text-3">
                      {lead.invoiceId ? <span className="font-mono">{lead.invoiceId}</span> : 'click — გენერაცია'}
                    </div>
                  </div>
                </button>
              </div>

              {/* Decision */}
              <div className="border-t border-bdr bg-sur-2/30 px-4 py-3">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  გადაწყვეტილება
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={busy || !canAccept}
                    title={!canAccept ? 'ჯერ შეასრულე ინვენტარი + ინვოისი' : 'ოფერი მიღებულია'}
                    onClick={() => void run(() => decideLeadOffer(lead.id, 'accepted'))}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12px] font-semibold text-grn shadow-sm transition-all hover:border-grn hover:bg-grn hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:border-bdr disabled:bg-sur-2 disabled:text-text-3 disabled:shadow-none"
                  >
                    <Check size={13} strokeWidth={2.5} /> მიღებული
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => decideLeadOffer(lead.id, 'rejected'))}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] font-semibold text-red shadow-sm transition-all hover:bg-red hover:text-white hover:shadow-md"
                  >
                    <X size={13} strokeWidth={2.5} /> უარყოფა
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-3">
              <div className="rounded-md border border-bdr bg-sur-2 p-3 text-[12px] text-text-2">
                <div className="font-mono text-[10.5px] text-text-3">
                  {lead.offerDecidedAt ? new Date(lead.offerDecidedAt).toLocaleString('en-GB').replace(',', '') : '—'}
                </div>
                <div className="mt-0.5">
                  <span className="text-text-3">by</span> <span className="font-semibold text-navy">{lead.offerDecidedBy || 'DMT'}</span>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
