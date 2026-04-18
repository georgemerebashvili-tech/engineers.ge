'use client';

import {useEffect, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldAlert} from 'lucide-react';

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!token) setError('ბმული არ შეიცავს token-ს. მოითხოვე ახალი.');
  }, [token]);

  const canSubmit =
    token && password.length >= 8 && password === confirm && !pending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.');
      return;
    }
    if (password !== confirm) {
      setError('პაროლები არ ემთხვევა.');
      return;
    }
    start(async () => {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token, password})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'პაროლის შეცვლა ვერ მოხერხდა.');
        return;
      }
      setDone(true);
      // Give user a beat to read, then redirect home.
      setTimeout(() => router.push('/?reset=ok'), 1800);
    });
  };

  if (done) {
    return (
      <div className="w-full rounded-[var(--radius-card)] border border-grn-bd bg-grn-lt p-6 text-center">
        <CheckCircle2 className="mx-auto text-grn" size={32} />
        <h1 className="mt-3 text-[18px] font-bold text-navy">
          პაროლი შეიცვალა
        </h1>
        <p className="mt-1 text-[12.5px] text-text-2">
          ახალი პაროლით შედი navbar-დან. გადამისამართება…
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[var(--radius-card)] border bg-sur shadow-[var(--shadow-card)]">
      <div className="border-b px-5 pt-5 pb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
          <KeyRound size={11} /> Reset password
        </span>
        <h1 className="mt-2 text-[20px] font-bold text-navy">
          ახალი პაროლი
        </h1>
        <p className="mt-1 text-[12px] text-text-2">
          შეიყვანე ახალი პაროლი (მინ. 8 სიმბოლო). ძველი ბმული დამთავრდება ერთი
          საათის შემდეგ.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 px-5 py-4">
        <PwdField
          label="ახალი პაროლი"
          value={password}
          onChange={setPassword}
          show={show}
          onToggle={() => setShow((v) => !v)}
        />
        <PwdField
          label="დაადასტურე"
          value={confirm}
          onChange={setConfirm}
          show={show}
          onToggle={() => setShow((v) => !v)}
        />

        {error && (
          <p className="inline-flex items-start gap-1.5 rounded-md border border-red-lt bg-red-lt px-2.5 py-1.5 text-[11.5px] text-danger">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href="/"
            className="text-[11.5px] font-semibold text-text-2 hover:text-navy"
          >
            მთავარი
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
          >
            {pending ? 'მიმდინარეობს…' : 'პაროლის დაყენება'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PwdField({
  label,
  value,
  onChange,
  show,
  onToggle
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-text-2">{label}</span>
      <span className="relative flex items-center">
        <Lock
          size={13}
          className="pointer-events-none absolute left-2.5 text-text-3"
        />
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border bg-sur-2 py-2 pl-7 pr-9 text-[13px] text-navy focus:border-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'დამალვა' : 'ჩვენება'}
          className="absolute right-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-text-3 hover:text-navy"
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </span>
    </label>
  );
}
