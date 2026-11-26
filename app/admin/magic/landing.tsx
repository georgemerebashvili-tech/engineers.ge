'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

const ERRORS: Record<string, string> = {
  expired: 'ბმულს ვადა გაუვიდა — მოითხოვე ახალი',
  used: 'ეს ბმული უკვე გამოყენებულია — მოითხოვე ახალი',
  invalid: 'ბმული არასწორია',
  temporarily_unavailable:
    'სერვერი დროებით ვერ ამოწმებს — სცადე მოგვიანებით ან შედი პაროლით',
  email_not_configured: 'მეილით შესვლა ჯერ არ არის ჩართული',
  too_many_attempts: 'ბევრი მცდელობა — სცადე მოგვიანებით'
};

/** Reads `t` from the URL fragment (`#t=<token>`). */
function readFragmentToken(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const t = params.get('t')?.trim();
  return t ? t : null;
}

export function MagicLanding() {
  // undefined = not read yet (server render + first paint), null = no token.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = readFragmentToken();
    if (t) {
      // Take the token out of the address bar and the history entry right
      // away; it lives only in this component's memory from here on. Keep the
      // router's own history.state so back/forward keep working.
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }
    // Functional update: React StrictMode runs this effect twice in dev, and
    // the second run no longer finds the (already stripped) fragment.
    setToken((prev) => t ?? prev ?? null);
  }, []);

  async function enter() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/magic-link/consume', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({t: token})
      });
      if (res.ok) {
        router.replace('/admin/stats');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as {error?: string} | null;
      setError(ERRORS[data?.error ?? ''] ?? 'შესვლა ვერ მოხერხდა — სცადე მოგვიანებით');
      // A used / expired / invalid link cannot be retried; drop it.
      if (data?.error === 'expired' || data?.error === 'used' || data?.error === 'invalid') {
        setToken(null);
      }
    } catch {
      setError('კავშირი ვერ დამყარდა — სცადე მოგვიანებით');
    } finally {
      setBusy(false);
    }
  }

  if (token === undefined) {
    return <p className="text-center text-sm text-fg-muted">…</p>;
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-danger">
          {error ?? 'ბმული არასწორია ან აკლია — მოითხოვე ახალი'}
        </p>
        <Link
          href="/admin/forgot"
          className="inline-block text-sm text-accent hover:underline"
        >
          ახალი ბმულის მოთხოვნა →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-fg-muted">
        დააჭირე ღილაკს ადმინში შესასვლელად.
      </p>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={enter}
        disabled={busy}
        className="w-full rounded-lg bg-accent text-accent-fg py-2 font-medium disabled:opacity-60"
      >
        {busy ? '…' : 'შესვლა'}
      </button>
    </div>
  );
}
