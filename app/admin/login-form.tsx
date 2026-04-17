'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

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
      router.replace('/admin/banners');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm">Username</label>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent text-accent-fg py-2 font-medium disabled:opacity-60"
      >
        {pending ? '…' : 'Sign in'}
      </button>
    </form>
  );
}
