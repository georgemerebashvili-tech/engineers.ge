'use client';

import {useState, useTransition} from 'react';

export function ConstructionForgotForm() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await fetch('/api/construction/password-reset/request', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({identifier})
      });
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-[#0D47A1] ring-1 ring-slate-300">
        თუ ასეთი მომხმარებელი არსებობს და მას ელფოსტა აქვს დაყენებული, აღდგენის
        ბმული გამოგზავნილია. შეამოწმე ინბოქსი (1 საათის ვადა).
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="identifier" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Username ან ელფოსტა
        </label>
        <input
          id="identifier"
          name="identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#1565C0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
          placeholder="admin_kaya ან you@example.com"
          required
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1565C0] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D47A1] disabled:opacity-60"
      >
        {pending ? 'იგზავნება…' : 'გაგზავნე ბმული'}
      </button>
    </form>
  );
}
