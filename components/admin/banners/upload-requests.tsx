'use client';

import {useMemo, useState} from 'react';
import {Check, X} from 'lucide-react';
import {
  formatOccupiedUntil,
  normalizeHeroAdUploadRequests,
  type HeroAdSlot,
  type HeroAdUploadRequest
} from '@/lib/hero-ads';

export function HeroAdUploadRequestsPanel({
  initialRequests,
  slots,
  source
}: {
  initialRequests: HeroAdUploadRequest[];
  slots: HeroAdSlot[];
  source: 'live' | 'unavailable';
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

  const pending = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests]
  );
  const reviewed = useMemo(
    () => requests.filter((request) => request.status !== 'pending').slice(0, 8),
    [requests]
  );

  async function reviewRequest(id: number, status: 'approved' | 'rejected') {
    const note =
      status === 'rejected'
        ? window.prompt('უარყოფის მიზეზი (optional)') ?? ''
        : window.prompt('Approve note (optional)') ?? '';

    setBusyId(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/hero-ad-upload-requests/${id}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({status, review_note: note})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.request) {
        throw new Error(data?.error ?? 'review failed');
      }
      setRequests((current) =>
        normalizeHeroAdUploadRequests(
          current.map((request) => (request.id === id ? data.request : request))
        )
      );
      setMsg({
        kind: 'ok',
        text:
          status === 'approved'
            ? 'ბანერი დამტკიცდა და slot-ზე აიტვირთა'
            : 'მოთხოვნა უარყოფილია'
      });
    } catch (error) {
      setMsg({kind: 'err', text: error instanceof Error ? error.message : 'review failed'});
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-card border border-bdr bg-sur p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-navy">Client upload requests</h3>
          <p className="mt-1 text-[11px] text-text-2">
            `/ads`-დან გამოგზავნილი pending ბანერები. Approve აქვეყნებს slot-ზე.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {source === 'unavailable' && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
              DB fallback mode
            </span>
          )}
          <span className="rounded-full border border-bdr bg-sur-2 px-2.5 py-1 text-[10px] font-semibold text-text-2">
            {pending.length} pending
          </span>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${
            msg.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-danger'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-bdr bg-sur-2 px-4 py-6 text-center text-[12px] text-text-3">
            ჯერ pending მოთხოვნა არ არის.
          </div>
        ) : (
          pending.map((request) => (
            <article
              key={request.id}
              className="grid gap-4 rounded-xl border border-bdr bg-sur-2 p-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]"
            >
              <div className="overflow-hidden rounded-lg border border-bdr bg-sur">
                {request.asset_url ? (
                  <img
                    src={request.asset_url}
                    alt={request.company_name || request.slot_key}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-[12px] text-text-3">
                    preview არაა
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 text-[10px] font-semibold text-blue">
                    {slotName(slots, request.slot_key)}
                  </span>
                  <span className="rounded-full border border-bdr bg-sur px-2 py-0.5 text-[10px] font-mono text-text-2">
                    {formatTimestamp(request.created_at)}
                  </span>
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-navy">
                    {request.company_name || 'უცნობი კომპანია'}
                  </div>
                  <div className="text-[12px] text-text-2">
                    {request.contact_name || '—'} · {request.contact_email || '—'} ·{' '}
                    {request.contact_phone || '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-bdr bg-sur px-3 py-2 text-[12px] text-text-2">
                  {request.note || 'კომენტარი არ დაუტოვებია.'}
                </div>
                <div className="text-[11px] text-text-3">
                  Booking now: {formatOccupiedUntil(slotOccupiedUntil(slots, request.slot_key))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => reviewRequest(request.id, 'approved')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={14} />
                  Approve + publish
                </button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => reviewRequest(request.id, 'rejected')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="mt-5 rounded-xl border border-bdr bg-sur px-3 py-3">
          <div className="mb-2 text-[12px] font-semibold text-navy">ბოლო განხილულები</div>
          <div className="space-y-2">
            {reviewed.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
              >
                <div className="text-text-2">
                  {slotName(slots, request.slot_key)} · {request.company_name || '—'}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      request.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-red-50 text-danger ring-1 ring-red-200'
                    }`}
                  >
                    {request.status === 'approved' ? 'approved' : 'rejected'}
                  </span>
                  <span className="font-mono text-text-3">
                    {formatTimestamp(request.reviewed_at ?? request.updated_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function slotName(slots: HeroAdSlot[], key: HeroAdUploadRequest['slot_key']) {
  return slots.find((slot) => slot.slot_key === key)?.display_name ?? key;
}

function slotOccupiedUntil(slots: HeroAdSlot[], key: HeroAdUploadRequest['slot_key']) {
  return slots.find((slot) => slot.slot_key === key)?.occupied_until ?? null;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('ka-GE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
