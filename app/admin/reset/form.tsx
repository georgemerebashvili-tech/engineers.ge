'use client';

import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';

export function ResetForm({token}: {token: string}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg({kind: 'err', text: 'პაროლი მინ. 6 სიმბოლო.'});
      return;
    }
    if (password !== confirm) {
      setMsg({kind: 'err', text: 'პაროლი და დადასტურება არ ემთხვევა.'});
      return;
    }
    start(async () => {
      const res = await fetch('/api/admin/password-reset/consume', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token, newPassword: password})
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        note?: string;
      };
      if (!res.ok) {
        const errMap: Record<string, string> = {
          not_found: 'ბმული არ მოიძებნა.',
          already_used: 'ბმული უკვე გამოყენებულია.',
          expired: 'ბმულს ვადა გაუვიდა — მოითხოვე ახალი.',
          bad_request: 'არასწორი მოთხოვნა.',
          vercel_config_missing:
            data.message || 'VERCEL_TOKEN / VERCEL_PROJECT_ID არ არის დაყენებული.',
          vercel_list_failed: 'Vercel env list ვერ მოიძებნა.',
          vercel_patch_failed: 'Vercel env update ვერ შესრულდა.',
          vercel_post_failed: 'Vercel env create ვერ შესრულდა.'
        };
        setMsg({kind: 'err', text: errMap[data.error ?? ''] ?? 'უცნობი შეცდომა.'});
        return;
      }
      setMsg({kind: 'ok', text: data.note ?? 'პაროლი შეცვლილია.'});
      setPassword('');
      setConfirm('');
      setTimeout(() => router.push('/admin'), 1500);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="ახალი პაროლი"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Field
        label="დაადასტურე პაროლი"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
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
        {pending ? '…' : 'პაროლის შენახვა'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
