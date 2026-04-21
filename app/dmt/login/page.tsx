'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Mail, Lock, LogIn, ArrowRight} from 'lucide-react';

export default function DmtLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dmt';
  const [bootstrap, setBootstrap] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/dmt/auth/bootstrap-check')
      .then((r) => r.json())
      .then((d) => setBootstrap(!!d.isEmpty))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/dmt/auth/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'შეცდომა');
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ქსელი');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy text-[15px] font-bold text-white">
            D
          </span>
          <span className="text-xl font-bold tracking-tight text-navy">DMT</span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-navy">შესვლა</h1>
        <p className="mb-5 text-[13px] text-text-2">
          ინვოისები, ლიდები, ინვენტარი — ერთ პანელში.
        </p>

        {bootstrap && (
          <div className="mb-4 rounded-md border border-ora-bd bg-ora-lt px-3 py-2 text-[12px] text-ora">
            ჯერ არცერთი მომხმარებელი არ არის. <Link href="/dmt/register" className="font-semibold underline">შექმენი პირველი owner ანგარიში →</Link>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3 rounded-[12px] border border-bdr bg-sur p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <Mail size={11} /> Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] focus:border-blue focus:outline-none"
              placeholder="you@company.ge"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <Lock size={11} /> პაროლი
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] focus:border-blue focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue bg-blue px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
          >
            <LogIn size={14} />
            {busy ? 'იგზავნება…' : 'შესვლა'}
          </button>

          <div className="flex items-center justify-between text-[12px]">
            <Link href="/dmt/forgot" className="text-text-3 hover:text-blue">
              დაგავიწყდა პაროლი?
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-0.5 text-text-3 hover:text-blue"
            >
              engineers.ge <ArrowRight size={11} />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
