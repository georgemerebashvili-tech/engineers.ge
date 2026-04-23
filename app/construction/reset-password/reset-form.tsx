'use client';

import {useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

export function ConstructionResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!token) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100">
        ბმული არასწორია ან ვადა გაუვიდა. სცადე პაროლის აღდგენა თავიდან.
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('პაროლები არ ემთხვევა'); return; }
    if (password.length < 6) { setError('მინ. 6 სიმბოლო'); return; }
    setError(null);
    start(async () => {
      const res = await fetch('/api/construction/password-reset/confirm', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token, password})
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msgs: Record<string, string> = {
          not_found: 'ბმული ვერ მოიძებნა',
          already_used: 'ბმული უკვე გამოყენებულია',
          expired: 'ბმულის ვადა გაუვიდა'
        };
        setError(msgs[body?.reason] || 'შეცდომა. სცადე თავიდან.');
        return;
      }
      router.replace('/construction?reset=1');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">ახალი პაროლი</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#475569]/20"
          placeholder="მინ. 6 სიმბოლო"
          required
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">გაიმეორე</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#475569]/20"
          placeholder="••••••"
          required
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100">{error}</div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#475569] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#334155] disabled:opacity-60"
      >
        {pending ? 'ინახება…' : 'პაროლის შეცვლა'}
      </button>
    </form>
  );
}
