'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {User, Mail, Lock, UserPlus} from 'lucide-react';

export default function DmtRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bootstrap, setBootstrap] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/dmt/auth/bootstrap-check')
      .then((r) => r.json())
      .then((d) => setBootstrap(!!d.isEmpty))
      .catch(() => setBootstrap(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/dmt/auth/register', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({name, email, password})
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'შეცდომა');
        return;
      }
      if (data.bootstrap) {
        router.push('/dmt');
      } else {
        router.push('/dmt/users');
      }
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

        <h1 className="mb-1 text-xl font-bold text-navy">
          {bootstrap ? 'პირველი owner ანგარიში' : 'ახალი მომხმარებელი'}
        </h1>
        <p className="mb-5 text-[13px] text-text-2">
          {bootstrap
            ? 'პორტალი ცარიელია. შექმენი პირველი owner ანგარიში — შენ გექნება სრული უფლებები.'
            : 'admin / owner-ს შეუძლია ახალი მომხმარებლის მოწვევა.'}
        </p>

        <form onSubmit={submit} className="space-y-3 rounded-[12px] border border-bdr bg-sur p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <User size={11} /> სახელი
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] focus:border-blue focus:outline-none"
              placeholder="გიორგი მერებაშვილი"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <Mail size={11} /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <Lock size={11} /> პაროლი (მინ. 8 სიმბოლო)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] focus:border-blue focus:outline-none"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue bg-blue px-3 py-2 text-[13px] font-semibold text-white hover:bg-navy-2 disabled:opacity-50"
          >
            <UserPlus size={14} />
            {busy ? 'იქმნება…' : 'რეგისტრაცია'}
          </button>

          <div className="text-center text-[12px]">
            <Link href="/dmt/login" className="text-text-3 hover:text-blue">
              უკვე გაქვს ანგარიში? შესვლა →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
