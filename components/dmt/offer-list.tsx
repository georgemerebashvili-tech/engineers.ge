'use client';

import {useCallback, useEffect, useState} from 'react';
import {Edit2, FileText, LoaderCircle, Plus, Send} from 'lucide-react';
import {listOffers, sendOffer, type DmtOffer} from '@/lib/dmt/offers-store';
import {OfferEditor, type OfferLeadRef} from '@/components/dmt/offer-editor';

type Props = {
  lead: OfferLeadRef;
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'border-bdr bg-sur-2 text-text-2',
  sent: 'border-blue-bd bg-blue-lt text-blue',
  approved: 'border-grn-bd bg-grn-lt text-grn',
  rejected: 'border-red/30 bg-red-lt text-red',
  cancelled: 'border-bdr bg-bdr/30 text-text-3'
};

export function OfferList({lead}: Props) {
  const [offers, setOffers] = useState<DmtOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DmtOffer | 'new' | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listOffers(lead.id);
      setOffers(data.offers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'offers load failed');
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaved = (offer: DmtOffer) => {
    setOffers((prev) => {
      const exists = prev.some((item) => item.id === offer.id);
      return exists
        ? prev.map((item) => item.id === offer.id ? offer : item)
        : [offer, ...prev];
    });
  };

  const quickSend = async (offer: DmtOffer) => {
    setSendingId(offer.id);
    setError('');
    try {
      const data = await sendOffer(offer.id);
      setLastUrl(data.publicUrl);
      onSaved(data.offer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'send failed');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy">Offers</h3>
          <p className="text-[12px] text-text-2">{offers.length} records for {lead.id}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-2 text-[12px] font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={14} /> New offer
        </button>
      </div>

      {error && <div className="rounded-md border border-red/30 bg-red-lt px-3 py-2 text-[12px] text-red">{error}</div>}
      {lastUrl && (
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(lastUrl)}
          className="w-full rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-left font-mono text-[11px] text-grn"
        >
          Sent URL copied-ready: {lastUrl}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-4 text-[12px] text-text-3">
          <LoaderCircle size={14} className="animate-spin" /> Loading offers...
        </div>
      )}

      {!loading && offers.length === 0 && (
        <div className="rounded-md border border-dashed border-bdr bg-sur-2 px-3 py-6 text-center text-[12px] text-text-3">
          No offers yet.
        </div>
      )}

      <div className="space-y-2">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-md border border-bdr bg-sur p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-navy">{offer.id}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[offer.status] ?? STATUS_CLASS.draft}`}>
                    {offer.status}
                  </span>
                  {offer.pdfUrl && (
                    <a
                      href={`/api/dmt/offers/${encodeURIComponent(offer.id)}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 text-[10px] font-semibold text-blue hover:border-blue"
                    >
                      <FileText size={11} /> PDF
                    </a>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-text-2">
                  {offer.items.length} items · total ₾ {offer.total.toFixed(2)}
                  {offer.docNumber ? ` · doc ${offer.docNumber}` : ''}
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-text-3">
                  updated {offer.updatedAt || '—'} by {offer.updatedBy || '—'}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(offer)}
                  className="rounded-md border border-bdr bg-sur-2 p-2 text-text-2 hover:border-blue hover:text-blue"
                  title="Edit offer"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => quickSend(offer)}
                  disabled={sendingId === offer.id}
                  className="rounded-md border border-bdr bg-sur-2 p-2 text-text-2 hover:border-blue hover:text-blue disabled:opacity-50"
                  title="Send offer"
                >
                  {sendingId === offer.id ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <OfferEditor
          lead={lead}
          offer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(offer) => {
            onSaved(offer);
            void load();
          }}
        />
      )}
    </div>
  );
}
