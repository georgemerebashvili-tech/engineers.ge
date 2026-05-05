'use client';

import {useState} from 'react';
import {Check, CheckCircle2, Circle, LoaderCircle, PackageCheck, ReceiptText, X, XCircle} from 'lucide-react';

export type ManualOfferStatus = 'offer_in_progress' | 'offer_accepted' | 'offer_rejected';

export type ManualLeadWorkflowRow = {
  id: string;
  offerStatus: ManualOfferStatus;
  inventoryChecked: boolean;
  inventoryCheckedAt: string | null;
  inventoryCheckedBy: string | null;
  invoiceId: string | null;
  invoiceIssuedAt: string | null;
  invoiceIssuedBy: string | null;
  offerDecidedAt: string | null;
  offerDecidedBy: string | null;
};

const META: Record<ManualOfferStatus, {label: string; bg: string; border: string; text: string}> = {
  offer_in_progress: {label: 'შეთავაზება', bg: 'var(--ora-lt)', border: 'var(--ora-bd)', text: 'var(--ora)'},
  offer_accepted: {label: 'დადასტურდა', bg: 'var(--grn-lt)', border: 'var(--grn-bd)', text: 'var(--grn)'},
  offer_rejected: {label: 'უარყოფილია', bg: 'var(--red-lt)', border: '#f0b8b4', text: 'var(--red)'},
};

async function postWorkflow(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(String(data.error ?? `Request failed: ${res.status}`));
    (error as Error & {body?: unknown}).body = data;
    throw error;
  }
  return data as {row: ManualLeadWorkflowRow};
}

export function ManualLeadStatusCell({
  row,
  onSaved,
}: {
  row: ManualLeadWorkflowRow;
  onSaved: (row: ManualLeadWorkflowRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const meta = META[row.offerStatus] ?? META.offer_in_progress;
  const canAccept = row.inventoryChecked && Boolean(row.invoiceId);

  const run = async (key: string, url: string, body?: Record<string, unknown>) => {
    setBusy(key);
    setError('');
    try {
      const data = await postWorkflow(url, body);
      onSaved(data.row);
    } catch (err) {
      const anyErr = err as Error & {body?: {missing?: string[]}};
      if (anyErr.body?.missing?.length) setError('დასრულებისთვის ჯერ მონიშნე ინვენტარი და გამოწერე ინვოისი.');
      else setError(anyErr.message || 'ქმედება ვერ შესრულდა.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative flex items-center px-2 py-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-semibold"
        style={{background: meta.bg, borderColor: meta.border, color: meta.text}}
      >
        {row.offerStatus === 'offer_in_progress' && <span className="dmt-offer-pulse-dot" />}
        {row.offerStatus === 'offer_accepted' && <CheckCircle2 size={12} />}
        {row.offerStatus === 'offer_rejected' && <XCircle size={12} />}
        <span className="truncate">{meta.label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[420px] rounded-lg border border-bdr bg-sur shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
              <div>
                <h2 className="text-[14px] font-bold text-navy">შეთავაზების workflow</h2>
                <p className="font-mono text-[11px] text-text-3">{row.id}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-text-3 hover:bg-sur-2">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                <Step active done={row.inventoryChecked} label="ინვენტარი" />
                <Step active={row.inventoryChecked} done={Boolean(row.invoiceId)} label="ინვოისი" />
                <Step active={canAccept} done={row.offerStatus === 'offer_accepted'} label="დადასტურება" />
              </div>

              <div className="grid gap-2">
                <button
                  onClick={() =>
                    void run(
                      'inventory',
                      `/api/dmt/manual-leads/${encodeURIComponent(row.id)}/inventory-check`,
                      {checked: !row.inventoryChecked},
                    )
                  }
                  disabled={busy !== null}
                  className="inline-flex items-center justify-between rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text hover:border-blue-bd disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2"><PackageCheck size={15} /> ინვენტარი შემოწმებულია</span>
                  {busy === 'inventory' ? <LoaderCircle size={14} className="animate-spin" /> : row.inventoryChecked ? <Check size={14} /> : <Circle size={14} />}
                </button>

                <button
                  onClick={() => void run('invoice', `/api/dmt/manual-leads/${encodeURIComponent(row.id)}/invoice`)}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-between rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] font-semibold text-text hover:border-blue-bd disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2"><ReceiptText size={15} /> ინვოისი</span>
                  {busy === 'invoice' ? <LoaderCircle size={14} className="animate-spin" /> : <span className="font-mono text-[11px] text-text-3">{row.invoiceId ?? 'გაწერა'}</span>}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    void run('accepted', `/api/dmt/manual-leads/${encodeURIComponent(row.id)}/decide`, {outcome: 'accepted'})
                  }
                  disabled={busy !== null || !canAccept}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12px] font-semibold text-grn disabled:cursor-not-allowed disabled:border-bdr disabled:bg-sur-2 disabled:text-text-3"
                >
                  {busy === 'accepted' ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} დადასტურდა
                </button>
                <button
                  onClick={() =>
                    void run('rejected', `/api/dmt/manual-leads/${encodeURIComponent(row.id)}/decide`, {outcome: 'rejected'})
                  }
                  disabled={busy !== null}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] font-semibold text-red disabled:opacity-60"
                >
                  {busy === 'rejected' ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />} უარყოფილია
                </button>
              </div>

              {error && <div className="rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] font-semibold text-red">{error}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({active, done, label}: {active: boolean; done: boolean; label: string}) {
  return (
    <div className={`rounded-md border px-2 py-2 text-center text-[11px] font-semibold ${done ? 'border-grn-bd bg-grn-lt text-grn' : active ? 'border-ora-bd bg-ora-lt text-ora' : 'border-bdr bg-sur-2 text-text-3'}`}>
      <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full border border-current">
        {done ? <Check size={12} /> : <Circle size={10} />}
      </div>
      {label}
    </div>
  );
}
