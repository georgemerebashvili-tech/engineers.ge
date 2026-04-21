'use client';

import Link from 'next/link';
import {useState, useTransition} from 'react';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await fetch('/api/admin/password-reset/request', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email})
      });
      if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as {wait_seconds?: number};
        setMsg({
          kind: 'err',
          text: `ძალიან ხშირად ცდილობ. სცადე ${data.wait_seconds ?? 120} წმ-ში.`
        });
        return;
      }
      if (!res.ok) {
        setMsg({kind: 'err', text: 'მოთხოვნა ვერ გაიგზავნა.'});
        return;
      }
      setMsg({
        kind: 'ok',
        text: 'თუ მისამართი სწორია, აღდგენის ბმული გაგზავნილია ელფოსტაზე. შეამოწმე Inbox / Spam.'
      });
      setEmail('');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="recovery-email" className="text-sm">
          აღდგენის ელფოსტა
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <p className="text-xs text-fg-muted">
          მხოლოდ ADMIN_RECOVERY_EMAIL-ზე რეგისტრირებული მისამართი მიიღებს ბმულს.
        </p>
      </div>
      {msg && (
        <p
          className={`text-sm ${
            msg.kind === 'ok' ? 'text-emerald-600' : 'text-danger'
          }`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent text-accent-fg py-2 font-medium disabled:opacity-60"
      >
        {pending ? '…' : 'აღდგენის ბმულის გამოგზავნა'}
      </button>
      <div className="text-center">
        <Link href="/admin" className="text-xs text-fg-muted hover:underline">
          ← შესვლის გვერდზე დაბრუნება
        </Link>
      </div>
    </form>
  );
}
