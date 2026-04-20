'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {Bug, X, CheckCircle2, Send} from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Current URL path — passed from server via banner wrapper. */
  pathname: string;
  /** Feature registry key if the route is behind a flag. */
  featureKey?: string | null;
};

export function ReportIssueModal({open, onClose, pathname, featureKey}: Props) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (message.trim().length < 10) {
      setError('მინიმუმ 10 სიმბოლო საჭიროა — აღწერე რა ხდებოდა.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const viewport =
        typeof window !== 'undefined'
          ? `${window.innerWidth}x${window.innerHeight}`
          : null;
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          feature_key: featureKey ?? null,
          pathname,
          message: message.trim(),
          email: email.trim() || null,
          viewport
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.hint ?? data.message ?? 'შეცდომა');
      }
      setDone(true);
      setMessage('');
      setEmail('');
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'შეცდომა');
    } finally {
      setBusy(false);
    }
  }

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 md:p-4"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
    >
      <div
        className="w-full md:max-w-lg rounded-t-card md:rounded-card border border-bdr bg-sur p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Bug size={18} />
          </span>
          <div className="flex-1">
            <h2 id="report-issue-title" className="text-[15px] font-semibold text-navy">
              ხარვეზის შეტყობინება
            </h2>
            <p className="mt-0.5 text-[12px] text-text-2">
              მოკლედ აღწერე, რა მოხდა ან რა არ მუშაობდა. URL და ბრაუზერის ინფო ავტომატურად მიაერთდება.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2 hover:text-navy"
            aria-label="დახურვა"
            disabled={busy}
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
            <CheckCircle2 size={20} className="mx-auto mb-1.5" />
            <p className="font-semibold">მადლობა! შეტყობინება მიიღო.</p>
            <p className="mt-0.5 text-[12px] text-emerald-600">მალე შევამოწმებთ და გამოვასწორებთ.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-3">
                აღწერა <span className="text-red-600">*</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="რას ცდილობდი? რა მოხდა ფაქტიურად? რა ელოდი?"
                className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue/40"
                disabled={busy}
              />
              <div className="mt-0.5 text-right font-mono text-[10px] text-text-3">
                {message.length}/4000
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-3">
                ელფოსტა <span className="text-text-3 font-normal normal-case">(არჩევითი — თუ გინდა პასუხი)</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue/40"
                disabled={busy}
              />
            </label>

            <div className="rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[11px] font-mono text-text-3 space-y-0.5">
              <div>📍 {pathname}</div>
              {featureKey && <div>🏷 {featureKey}</div>}
            </div>

            {error && (
              <div className="rounded-md border border-red-bd bg-red-lt px-3 py-2 text-[12px] text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => !busy && onClose()}
                className="h-9 rounded-md border border-bdr bg-sur px-4 text-[13px] font-semibold text-text-2 hover:bg-sur-2 disabled:opacity-50"
                disabled={busy}
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={submit}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white hover:bg-blue/90 disabled:opacity-60"
                disabled={busy || message.trim().length < 10}
              >
                <Send size={14} />
                {busy ? 'გაგზავნა…' : 'გაგზავნა'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
