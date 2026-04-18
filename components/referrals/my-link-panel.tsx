'use client';

import {useEffect, useState, useTransition} from 'react';
import {Copy, Check, Link as LinkIcon, ShieldCheck, AlertTriangle, Send} from 'lucide-react';
import {getStoredUser} from '@/lib/user-session';

type Invited = {
  id: string;
  name: string;
  email: string;
  registered_at: string;
  email_verified: boolean;
  verified_engineer: boolean;
  project_count: number;
};

type Payload = {
  user: {
    id: string;
    name: string;
    email: string;
    ref_code: string | null;
    verified_engineer: boolean;
    email_verified: boolean;
  };
  invited: Invited[];
  stats: {total: number; verified: number; engineers: number; reward_gel: number};
};

export function MyLinkPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);
  const [status, setStatus] = useState<'loading' | 'no-user' | 'error' | 'ok'>(
    'loading'
  );
  const [resent, setResent] = useState<'idle' | 'sent' | 'throttled' | 'err'>('idle');
  const [resending, startResend] = useTransition();

  const resendVerify = (email: string) => {
    startResend(async () => {
      const res = await fetch('/api/verify-email/resend', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email})
      });
      if (res.status === 429) setResent('throttled');
      else if (res.ok) setResent('sent');
      else setResent('err');
      setTimeout(() => setResent('idle'), 4000);
    });
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u?.email) {
      setStatus('no-user');
      return;
    }
    fetch(`/api/me/referrals?email=${encodeURIComponent(u.email)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Payload) => {
        setData(d);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'no-user') {
    return (
      <div className="rounded-[var(--radius-card)] border border-bdr bg-sur-2 p-4 text-[13px] text-text-2">
        პირადი ბმულის გენერირებისთვის ჯერ გაიარე რეგისტრაცია / ავტორიზაცია.
      </div>
    );
  }

  if (status === 'loading' || !data) {
    return (
      <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-sur-2" />
        <div className="mt-3 h-10 animate-pulse rounded bg-sur-2" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-[var(--radius-card)] border border-red-lt bg-red-lt px-4 py-3 text-[13px] text-red">
        ბმული ვერ ჩაიტვირთა. სცადე კვლავ რამდენიმე წამში.
      </div>
    );
  }

  const code = data.user.ref_code ?? '';
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://engineers.ge';
  const shareUrl = code ? `${origin}/r/${code}` : '';

  const copy = async (text: string, key: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-bdr bg-sur">
      <div className="flex flex-wrap items-center gap-2 border-b border-bdr px-4 py-3">
        <LinkIcon size={14} className="text-blue" />
        <h2 className="text-[14px] font-bold text-navy">ჩემი პირადი ბმული</h2>
        {!data.user.email_verified && (
          <>
            <span className="inline-flex items-center gap-1 rounded-full border border-ora-bd bg-ora-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-ora">
              <AlertTriangle size={10} /> email არ არის დადასტურებული
            </span>
            <button
              type="button"
              onClick={() => resendVerify(data.user.email)}
              disabled={resending || resent === 'sent' || resent === 'throttled'}
              className="inline-flex items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-blue transition-colors hover:bg-blue hover:text-white disabled:opacity-60"
            >
              <Send size={10} />
              {resent === 'sent'
                ? 'გაიგზავნა ✓'
                : resent === 'throttled'
                ? 'დაიცადე 1 წთ'
                : resent === 'err'
                ? 'შეცდომა'
                : resending
                ? '…'
                : 'ხელახლა გაგზავნა'}
            </button>
          </>
        )}
        {data.user.verified_engineer && (
          <span className="inline-flex items-center gap-1 rounded-full border border-grn-bd bg-grn-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-grn">
            <ShieldCheck size={10} /> Verified engineer
          </span>
        )}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-[1fr,auto]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border bg-sur-2 px-3 py-2 font-mono text-[13px] text-navy">
            <span className="truncate">{shareUrl || '—'}</span>
            <button
              type="button"
              onClick={() => copy(shareUrl, 'url')}
              disabled={!shareUrl}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue disabled:opacity-40"
            >
              {copied === 'url' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'url' ? 'დაკოპირდა' : 'ბმული'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-3 font-mono">
            <span>კოდი:</span>
            <code className="rounded border bg-sur-2 px-2 py-0.5 text-navy">{code || '—'}</code>
            <button
              type="button"
              onClick={() => copy(code, 'code')}
              disabled={!code}
              className="inline-flex items-center gap-1 text-text-2 transition-colors hover:text-blue disabled:opacity-40"
            >
              {copied === 'code' ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
          <Metric label="მოიწვია" value={data.stats.total} />
          <Metric label="verified" value={data.stats.verified} accent="grn" />
          <Metric label="₾ შეიძლება" value={data.stats.reward_gel} accent="ora" />
        </div>
      </div>

      {data.invited.length > 0 && (
        <div className="overflow-x-auto border-t border-bdr">
          <table className="min-w-full text-[12px]">
            <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
              <tr>
                <th className="px-3 py-2 text-left">მოწვეული</th>
                <th className="px-3 py-2 text-left">ვერიფიკაცია</th>
                <th className="px-3 py-2 text-left">აქტიურობა</th>
                <th className="px-3 py-2 text-left">რეგისტრაცია</th>
              </tr>
            </thead>
            <tbody>
              {data.invited.map((u) => (
                <tr key={u.id} className="border-t border-bdr">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-navy">{u.name}</div>
                    <div className="font-mono text-[10px] text-text-3">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        ok={u.email_verified}
                        label={u.email_verified ? 'email ✓' : 'email ⋯'}
                      />
                      {u.verified_engineer && <Badge ok label="engineer ✓" accent="grn" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-text-2">
                    {u.project_count} პროექტი
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                    {new Date(u.registered_at).toLocaleDateString('ka-GE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent
}: {
  label: string;
  value: number | string;
  accent?: 'grn' | 'ora';
}) {
  const border =
    accent === 'grn'
      ? 'border-grn-bd'
      : accent === 'ora'
      ? 'border-ora-bd'
      : 'border-bdr';
  const bg =
    accent === 'grn' ? 'bg-grn-lt' : accent === 'ora' ? 'bg-ora-lt' : 'bg-sur-2';
  const text =
    accent === 'grn' ? 'text-grn' : accent === 'ora' ? 'text-ora' : 'text-navy';
  return (
    <div className={`rounded-md border ${border} ${bg} px-2 py-1.5 text-center`}>
      <div className={`text-[15px] font-bold ${text}`}>{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-text-3">
        {label}
      </div>
    </div>
  );
}

function Badge({
  ok,
  label,
  accent
}: {
  ok: boolean;
  label: string;
  accent?: 'grn';
}) {
  if (!ok) {
    return (
      <span className="inline-flex items-center rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[9px] text-text-3">
        {label}
      </span>
    );
  }
  const cls =
    accent === 'grn'
      ? 'border-grn-bd bg-grn-lt text-grn'
      : 'border-blue-bd bg-blue-lt text-blue';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
