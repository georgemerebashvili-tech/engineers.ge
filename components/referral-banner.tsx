'use client';

import {useEffect, useState} from 'react';
import {Gift, X, UserPlus} from 'lucide-react';

const DISMISS_KEY = 'eng_ref_banner_dismissed';

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const parts = (document.cookie || '').split('; ');
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.indexOf(prefix) === 0) return decodeURIComponent(p.slice(prefix.length));
  }
  return '';
}

function hasStoredUser() {
  try {
    return !!localStorage.getItem('eng_user');
  } catch {
    return false;
  }
}

export function ReferralBanner({
  onInviteClick
}: {
  onInviteClick?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    // Skip if already registered or dismissed.
    if (hasStoredUser()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {}

    const cookieCode = readCookie('eng_ref');
    if (!cookieCode) return;

    let cancelled = false;
    fetch(`/api/ref/info?code=${encodeURIComponent(cookieCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.referrer_first_name) return;
        setName(data.referrer_first_name);
        setCode(data.code ?? cookieCode);
        setVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt px-4 py-3 shadow-[var(--shadow-sticky)]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-bd bg-sur text-blue">
          <Gift size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-navy">
            <span className="text-blue">{name}</span>-მა შენ მოგიწვია engineers.ge-ზე 👋
          </p>
          <p className="mt-0.5 text-[11.5px] text-text-2">
            დარეგისტრირდი უფასოდ — ინჟინრულ ხელსაწყოებს გამოიყენებ და {name}-საც
            დაეხმარები 10 ₾-ით referral პროგრამაში.
          </p>
        </div>
        {onInviteClick ? (
          <button
            type="button"
            onClick={onInviteClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue px-3 text-[12px] font-semibold text-white transition-colors hover:bg-navy-2"
          >
            <UserPlus size={13} /> რეგისტრაცია
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="დახურვა"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur hover:text-navy"
        >
          <X size={14} />
        </button>
      </div>
      <span className="absolute bottom-1 right-2 font-mono text-[9px] text-text-3">
        ref: {code}
      </span>
    </div>
  );
}
