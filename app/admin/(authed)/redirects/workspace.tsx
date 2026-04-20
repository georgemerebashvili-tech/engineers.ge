'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight, Plus, Search, Trash2, Power, PowerOff, Lightbulb} from 'lucide-react';
import {ConfirmModal} from '@/components/confirm-modal';
import type {Redirect} from '@/lib/redirects';

type Suggestion = {pathname: string; count: number};

export function RedirectsWorkspace({
  initial,
  suggestions,
  prefillSource
}: {
  initial: Redirect[];
  suggestions: Suggestion[];
  prefillSource: string;
}) {
  const router = useRouter();
  const [redirects, setRedirects] = useState(initial);
  const [source, setSource] = useState(prefillSource);
  const [destination, setDestination] = useState('');
  const [statusCode, setStatusCode] = useState<301 | 302 | 307 | 308>(308);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Keep in sync if user updates ?prefill_source= via URL
  useEffect(() => {
    if (prefillSource && !source) setSource(prefillSource);
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [prefillSource, source]);

  const filtered = redirects.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.source.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      (r.note ?? '').toLowerCase().includes(q)
    );
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim() || !destination.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          source: source.trim(),
          destination: destination.trim(),
          status_code: statusCode,
          note: note.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hint ?? data.message ?? 'error');
      setRedirects((prev) => [data.redirect, ...prev]);
      setSource('');
      setDestination('');
      setNote('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(r: Redirect) {
    try {
      const res = await fetch(`/api/admin/redirects/${r.id}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({enabled: !r.enabled})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'error');
      setRedirects((prev) => prev.map((x) => (x.id === r.id ? data.redirect : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'error');
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/redirects/${deleteId}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('delete failed');
      setRedirects((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'error');
    }
  }

  function fillFromSuggestion(pathname: string) {
    setSource(pathname);
    const sourceInput = document.getElementById('redirect-source-input');
    sourceInput?.scrollIntoView({behavior: 'smooth', block: 'center'});
    document.getElementById('redirect-destination-input')?.focus();
  }

  const pendingDelete = redirects.find((r) => r.id === deleteId);

  return (
    <div className="space-y-6">
      {/* 404 suggestions */}
      {suggestions.length > 0 && (
        <section className="rounded-card border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-amber-800">
            <Lightbulb size={12} />
            შესაძლო redirect-ები 404-ებიდან (30 დღე)
          </h2>
          <p className="mb-3 text-[12px] text-amber-900">
            ეს URL-ები ხშირად 404-ობენ და redirect-ი არ აქვთ. დააჭირე →-ს ფორმაში ჩასაწერად.
          </p>
          <ul className="space-y-1">
            {suggestions.map((s) => (
              <li key={s.pathname} className="flex items-center gap-2">
                <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 font-mono text-[10px] font-bold text-red-700">
                  ×{s.count}
                </span>
                <code className="truncate font-mono text-[11px] text-navy">{s.pathname}</code>
                <button
                  type="button"
                  onClick={() => fillFromSuggestion(s.pathname)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  ქმენი redirect →
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add form */}
      <form
        onSubmit={submit}
        className="rounded-card border border-bdr bg-sur p-4 space-y-3"
      >
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-navy">
          <Plus size={14} className="text-blue" />
          ახალი redirect
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-text-3">
              source (from)
            </label>
            <input
              id="redirect-source-input"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="/old-path"
              className="w-full rounded-md border border-bdr bg-sur px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
              required
              disabled={busy}
            />
          </div>
          <div className="flex items-end justify-center pb-2">
            <ArrowRight size={16} className="text-text-3" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-text-3">
              destination (to)
            </label>
            <input
              id="redirect-destination-input"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="/new-path ან https://external"
              className="w-full rounded-md border border-bdr bg-sur px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
              required
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-text-3">
              status
            </label>
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value) as 301 | 302 | 307 | 308)}
              className="h-[34px] rounded-md border border-bdr bg-sur px-2 text-[12px]"
              disabled={busy}
            >
              <option value={308}>308 permanent</option>
              <option value={307}>307 temp</option>
              <option value={301}>301 permanent (legacy)</option>
              <option value={302}>302 temp (legacy)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-text-3">
            note (არჩევითი)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="მაგ: dashboard გადატანილია home-ზე"
            className="w-full rounded-md border border-bdr bg-sur px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
            disabled={busy}
          />
        </div>
        {error && (
          <div className="rounded-md border border-red-bd bg-red-lt px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !source.trim() || !destination.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white hover:bg-blue/90 disabled:opacity-60"
          >
            <Plus size={14} />
            {busy ? 'ემატება…' : 'დამატე'}
          </button>
          <p className="text-[11px] text-text-3">
            ცვლილება ძალაში შევა ≤60 წამში (proxy cache TTL).
          </p>
        </div>
      </form>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება source / destination / note…"
          className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          {redirects.length === 0
            ? 'ჯერ redirect-ი არ არის. დაამატე პირველი ზემო ფორმიდან.'
            : 'ფილტრისთვის ჩანაწერი არ მოიძებნა.'}
        </div>
      ) : (
        <section className="rounded-card border border-bdr bg-sur overflow-hidden">
          <table className="min-w-full text-[12px]">
            <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
              <tr>
                <th className="px-3 py-2 text-left">source</th>
                <th className="px-3 py-2 text-left">destination</th>
                <th className="px-3 py-2 text-center">status</th>
                <th className="px-3 py-2 text-right">hits</th>
                <th className="px-3 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-t border-bdr ${!r.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-[11px] text-navy max-w-[30ch] truncate" title={r.source}>
                    {r.source}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-blue max-w-[30ch] truncate" title={r.destination}>
                    {r.destination}
                    {r.note && (
                      <span className="ml-2 text-text-3 font-sans">· {r.note}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex h-5 items-center rounded-full border border-bdr bg-sur-2 px-2 font-mono text-[10px]">
                      {r.status_code}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-text-2">
                    {r.hit_count}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggle(r)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                          r.enabled
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-bdr bg-sur-2 text-text-3 hover:bg-sur'
                        }`}
                        title={r.enabled ? 'გათიშვა' : 'ჩართვა'}
                      >
                        {r.enabled ? <Power size={12} /> : <PowerOff size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(r.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur-2 text-red-600 hover:bg-red-50"
                        title="წაშლა"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <ConfirmModal
        open={deleteId !== null}
        tone="danger"
        busy={false}
        title="რედირექტი წავშალო?"
        confirmLabel="წაშლა"
        message={
          pendingDelete ? (
            <>
              <p>წაიშლება <code className="font-mono">{pendingDelete.source}</code> →{' '}
                <code className="font-mono">{pendingDelete.destination}</code></p>
              <p className="mt-2 text-[11px] text-text-3">
                ცვლილება ძალაში შევა ≤60 წამში. არ შეიძლება შენახვა/უკუქცევა.
              </p>
            </>
          ) : ''
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
