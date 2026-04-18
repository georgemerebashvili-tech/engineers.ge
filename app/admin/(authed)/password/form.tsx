'use client';

import {useState, useTransition} from 'react';

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(
    null
  );
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 4) {
      setMsg({kind: 'err', text: 'ახალი პაროლი მინ. 4 სიმბოლო.'});
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({kind: 'err', text: 'ახალი პაროლი და დადასტურება არ ემთხვევა.'});
      return;
    }
    start(async () => {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({currentPassword, newPassword})
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        note?: string;
      };
      if (!res.ok) {
        const errMap: Record<string, string> = {
          invalid_current_password: 'მიმდინარე პაროლი არასწორია.',
          unauthorized: 'სესია ვადაგასულია, შედი თავიდან.',
          vercel_config_missing:
            data.message ||
            'VERCEL_TOKEN / VERCEL_PROJECT_ID env-ები არ არის დაყენებული.',
          vercel_list_failed: 'Vercel env list ვერ მოიძებნა.',
          vercel_patch_failed: 'Vercel env update ვერ შესრულდა.',
          vercel_post_failed: 'Vercel env create ვერ შესრულდა.',
          bad_request: 'არასწორი მოთხოვნა.'
        };
        setMsg({
          kind: 'err',
          text: errMap[data.error ?? ''] ?? 'უცნობი შეცდომა.'
        });
        return;
      }
      setMsg({kind: 'ok', text: data.note ?? 'პაროლი შეცვლილია.'});
      setCurrent('');
      setNew('');
      setConfirm('');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="მიმდინარე პაროლი"
        value={currentPassword}
        onChange={setCurrent}
        autoComplete="current-password"
      />
      <Field
        label="ახალი პაროლი"
        value={newPassword}
        onChange={setNew}
        autoComplete="new-password"
      />
      <Field
        label="დაადასტურე ახალი პაროლი"
        value={confirmPassword}
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
        {pending ? '…' : 'შენახვა'}
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
