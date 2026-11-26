'use client';

import Link from 'next/link';
import {useState, useTransition} from 'react';

const ERRORS: Record<string, string> = {
  email_not_configured: 'მეილით შესვლა ჯერ არ არის ჩართული',
  temporarily_unavailable:
    'სერვერი დროებით ვერ ამოწმებს — სცადე მოგვიანებით ან შედი პაროლით',
  send_failed: 'წერილი ვერ გაიგზავნა — სცადე მოგვიანებით'
};

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      let res: Response;
      try {
        res = await fetch('/api/admin/magic-link/request', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({email})
        });
      } catch {
        setMsg({kind: 'err', text: 'კავშირი ვერ დამყარდა — სცადე მოგვიანებით'});
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        wait_seconds?: number;
      };
      if (res.status === 429) {
        setMsg({kind: 'err', text: `დაიცადე ${data.wait_seconds ?? 60} წამი`});
        return;
      }
      if (!res.ok) {
        setMsg({
          kind: 'err',
          text: ERRORS[data.error ?? ''] ?? 'მოთხოვნა ვერ გაიგზავნა.'
        });
        return;
      }
      setMsg({
        kind: 'ok',
        text: 'თუ მისამართი სწორია, შესასვლელი ბმული გაგზავნილია ელფოსტაზე. შეამოწმე Inbox / Spam. ბმული მოქმედებს 15 წუთი.'
      });
      setEmail('');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="recovery-email" className="text-sm">
          ადმინის ელფოსტა
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
          ბმულს მიიღებს მხოლოდ ადმინის მისამართი. ბმული მოქმედებს 15 წუთი და მხოლოდ ერთხელ.
        </p>
      </div>
      {msg && (
        <p
          role="status"
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
        {pending ? '…' : 'ბმულის გამოგზავნა'}
      </button>
      <div className="text-center">
        <Link href="/admin" className="text-xs text-fg-muted hover:underline">
          ← შესვლის გვერდზე დაბრუნება
        </Link>
      </div>
    </form>
  );
}
