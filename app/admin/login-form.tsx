'use client';

import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';

const REMEMBER_KEY = 'engge_admin_remember';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({username, password})
      });
      if (!res.ok) {
        setError('Invalid credentials');
        return;
      }
      try {
        if (remember) {
          window.localStorage.setItem(REMEMBER_KEY, username);
        } else {
          window.localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}
      router.replace('/admin/banners');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="admin-username" className="text-sm">
          მომხმარებელი
        </label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="admin-password" className="text-sm">
          პაროლი
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-text-2">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-blue"
        />
        დამახსოვრება
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent text-accent-fg py-2 font-medium disabled:opacity-60"
      >
        {pending ? '…' : 'შესვლა'}
      </button>
    </form>
  );
}
