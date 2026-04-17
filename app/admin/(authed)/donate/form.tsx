'use client';

import {useState} from 'react';
import {Plus, Trash2} from 'lucide-react';

type BankCode = 'bog' | 'tbc' | 'other';
type Bank = {
  name: string;
  iban: string;
  account?: string | null;
  code?: BankCode | null;
  pay_link?: string | null;
};

type Initial = {
  recipient_name: string;
  recipient_surname: string;
  banks: Bank[];
};

export function DonateSettingsForm({initial}: {initial: Initial}) {
  const [name, setName] = useState(initial.recipient_name);
  const [surname, setSurname] = useState(initial.recipient_surname);
  const [banks, setBanks] = useState<Bank[]>(
    initial.banks.length
      ? initial.banks
      : [{name: '', iban: '', account: null, code: null, pay_link: null}]
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

  const updateBank = (i: number, patch: Partial<Bank>) => {
    setBanks((list) => list.map((b, idx) => (idx === i ? {...b, ...patch} : b)));
  };

  const addBank = () =>
    setBanks((list) => [
      ...list,
      {name: '', iban: '', account: null, code: null, pay_link: null}
    ]);
  const removeBank = (i: number) =>
    setBanks((list) => list.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const cleanBanks = banks
        .filter((b) => b.name.trim() && b.iban.trim())
        .map((b) => ({
          name: b.name.trim(),
          iban: b.iban.trim().replace(/\s+/g, ''),
          account: b.account?.toString().trim() || null,
          code: b.code || null,
          pay_link: b.pay_link?.trim() || null
        }));
      const r = await fetch('/api/admin/donate', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          recipient_name: name.trim(),
          recipient_surname: surname.trim(),
          banks: cleanBanks
        })
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error ?? 'save failed');
      }
      setMsg({kind: 'ok', text: 'შენახულია'});
    } catch (err) {
      setMsg({kind: 'err', text: err instanceof Error ? err.message : 'error'});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-2xl border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">მიმღები</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="სახელი">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="გიორგი"
            />
          </Field>
          <Field label="გვარი">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="input"
              placeholder="მერებაშვილი"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">საბანკო რეკვიზიტები</h2>
          <button
            type="button"
            onClick={addBank}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-blue-500 hover:text-blue-600"
          >
            <Plus size={12} /> ბანკი
          </button>
        </div>

        <div className="space-y-3">
          {banks.map((b, i) => (
            <div key={i} className="rounded-lg border bg-surface-alt p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                  ბანკი #{i + 1}
                </span>
                {banks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBank(i)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-fg-muted hover:text-red-600"
                  >
                    <Trash2 size={11} /> წაშლა
                  </button>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_1fr]">
                <Field label="ბანკის სახელი">
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => updateBank(i, {name: e.target.value})}
                    className="input"
                    placeholder="TBC Bank"
                  />
                </Field>
                <Field label="IBAN">
                  <input
                    type="text"
                    value={b.iban}
                    onChange={(e) => updateBank(i, {iban: e.target.value})}
                    className="input font-mono"
                    placeholder="GE00TB0000000000000000"
                  />
                </Field>
                <Field label="ანგარიში (არასავალდებულო)">
                  <input
                    type="text"
                    value={b.account ?? ''}
                    onChange={(e) => updateBank(i, {account: e.target.value})}
                    className="input font-mono"
                    placeholder="—"
                  />
                </Field>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr]">
                <Field label="კოდი (deep-link-ისთვის)">
                  <select
                    value={b.code ?? ''}
                    onChange={(e) =>
                      updateBank(i, {code: (e.target.value || null) as BankCode | null})
                    }
                    className="input"
                  >
                    <option value="">—</option>
                    <option value="bog">BOG</option>
                    <option value="tbc">TBC</option>
                    <option value="other">სხვა</option>
                  </select>
                </Field>
                <Field label="Pay link (pay.ge / send.tbcbank.ge)">
                  <input
                    type="url"
                    value={b.pay_link ?? ''}
                    onChange={(e) => updateBank(i, {pay_link: e.target.value})}
                    className="input"
                    placeholder="https://pay.ge/@username"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {saving ? 'ინახება…' : 'შენახვა'}
        </button>
        {msg && (
          <span
            className={`text-xs ${
              msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid var(--bdr);
          background: var(--sur);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 13px;
          color: var(--text);
          transition: border-color 0.15s;
        }
        .input:focus {
          outline: none;
          border-color: var(--blue);
        }
      `}</style>
    </form>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
