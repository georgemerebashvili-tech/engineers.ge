'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';

export function TbcLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch('/api/tbc/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({username, password})
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body?.error === 'invalid_credentials'
            ? 'მომხმარებელი ან პაროლი არასწორია'
            : 'ვერ შევედი. სცადე თავიდან'
        );
        return;
      }
      router.replace('/tbc/app');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="tbc-user"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          მომხმარებელი
        </label>
        <input
          id="tbc-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#0071CE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/20"
          placeholder="admin_givi"
          required
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="tbc-pass"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          პაროლი
        </label>
        <input
          id="tbc-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#0071CE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/20"
          placeholder="••••••••"
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
        {pending ? 'მოითმინე…' : 'შესვლა'}
      </button>
    </form>
  );
}
