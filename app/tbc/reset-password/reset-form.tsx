'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';

export function ResetForm({token}: {token: string}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
      return;
    }
    if (password !== confirm) {
      setError('პაროლები არ ემთხვევა');
      return;
    }
    start(async () => {
      const res = await fetch('/api/tbc/password-reset/confirm', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token, password})
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const map: Record<string, string> = {
          not_found: 'ბმული არასწორია',
          already_used: 'ბმული უკვე გამოყენებულია',
          expired: 'ბმულის ვადა გასული',
          bad_request: 'მოთხოვნა არასწორია',
          db: 'საკითხი მოხდა, სცადე თავიდან'
        };
        setError(map[body?.error] || 'ვერ მოხერხდა');
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.replace('/tbc');
      }, 1500);
    });
  }

  if (done) {
    return (
      <div className="rounded-lg bg-[#E0F7F3] px-4 py-3 text-sm text-[#008A73] ring-1 ring-[#00AA8D]/30">
        პაროლი შეცვლილია ✓ — გადამყავხართ შესვლის გვერდზე…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="new-pw"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          ახალი პაროლი
        </label>
        <input
          id="new-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/20"
          minLength={6}
          required
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="new-pw2"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          გაიმეორე პაროლი
        </label>
        <input
          id="new-pw2"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/20"
          minLength={6}
          required
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#0071CE] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005BA8] disabled:opacity-60"
      >
        {pending ? 'მოითმინე…' : 'დააყენე ახალი პაროლი'}
      </button>
    </form>
  );
}
