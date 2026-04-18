'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {CheckCircle2, AlertTriangle, X} from 'lucide-react';

type Kind = 'ok' | 'expired' | 'already_used' | 'not_found' | 'missing' | 'db';

const MESSAGES: Record<Kind, {text: string; ok: boolean}> = {
  ok: {text: 'Email დადასტურდა. Welcome!', ok: true},
  expired: {text: 'ბმული ვადაგასულია. მოითხოვე ახალი.', ok: false},
  already_used: {text: 'ეს ბმული უკვე გამოყენებულია.', ok: false},
  not_found: {text: 'ბმული არასწორია.', ok: false},
  missing: {text: 'verification token აკლია.', ok: false},
  db: {text: 'შეცდომა — სცადე თავიდან.', ok: false}
};

export function VerifyEmailFlash() {
  const params = useSearchParams();
  const router = useRouter();
  const value = params.get('verify');
  const [visible, setVisible] = useState(!!value);

  useEffect(() => {
    setVisible(!!value);
  }, [value]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 7000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible || !value) return null;
  const kind = (value as Kind) in MESSAGES ? (value as Kind) : 'not_found';
  const msg = MESSAGES[kind];

  const dismiss = () => {
    setVisible(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('verify');
    router.replace(url.pathname + url.search + url.hash);
  };

  const cls = msg.ok
    ? 'border-grn-bd bg-grn-lt text-grn'
    : 'border-ora-bd bg-ora-lt text-ora';

  return (
    <div className="fixed left-1/2 top-[72px] z-[110] -translate-x-1/2 px-3">
      <div
        role="status"
        className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-[var(--shadow-sticky)] ${cls}`}
      >
        {msg.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        <span className="text-[12.5px] font-semibold">{msg.text}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="დახურვა"
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/40"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
