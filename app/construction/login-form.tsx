'use client';

import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

const REMEMBER_KEY = 'construction_remember';

export function ConstructionLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {u?: string; p?: string};
        if (parsed.u) setUsername(parsed.u);
        if (parsed.p) setPassword(parsed.p);
        setRemember(true);
      }
    } catch {}
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch('/api/construction/login', {
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
      try {
        if (remember) {
          window.localStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({u: username, p: password})
          );
        } else {
          window.localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}
      router.replace('/construction/app');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="const-user"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          მომხმარებელი
        </label>
        <input
          id="const-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#1565C0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
          placeholder="admin_kaya"
          required
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="const-pass"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          პაროლი
        </label>
        <div className="relative">
          <input
            id="const-pass"
            name="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 focus:border-[#1565C0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            tabIndex={-1}
            aria-label={showPass ? 'დამალე პაროლი' : 'აჩვენე პაროლი'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {showPass ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-[#1565C0]"
        />
        დამიმახსოვრე პაროლი ამ კომპიუტერზე
      </label>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1565C0] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60"
      >
        {pending ? 'მოითმინე…' : 'შესვლა'}
      </button>
      <div className="pt-1 text-center text-xs">
        <Link
          href="/construction/forgot"
          className="text-slate-500 hover:text-[#1565C0] hover:underline"
        >
          პაროლი დაგავიწყდა?
        </Link>
      </div>
    </form>
  );
}
