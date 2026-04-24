'use client';

import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {ConstructionSession} from '@/lib/construction/auth';

const P = '#1565C0';

const CATEGORIES = ['hvac', 'electrical', 'plumbing', 'structural', 'materials', 'finishing', 'general'];
const CAT_LABELS: Record<string, string> = {
  hvac: 'HVAC', electrical: 'ელ. სამუშ.', plumbing: 'სანტ.', structural: 'კონსტ.',
  materials: 'მასალები', finishing: 'მოპირ.', general: 'ზოგადი'
};
const CAT_COLORS: Record<string, string> = {
  hvac: 'bg-blue-50 text-blue-700', electrical: 'bg-yellow-50 text-yellow-700',
  plumbing: 'bg-cyan-50 text-cyan-700', structural: 'bg-slate-100 text-slate-700',
  materials: 'bg-orange-50 text-orange-700', finishing: 'bg-purple-50 text-purple-700',
  general: 'bg-gray-100 text-gray-600'
};

type Contact = {
  id: string; name: string; identification_code: string | null; company: string | null;
  email: string | null; phone: string | null; category: string | null; notes: string | null;
  active: boolean; created_by: string; created_at: string;
};

const EMPTY_FORM = {name: '', identification_code: '', company: '', email: '', phone: '', category: '', notes: ''};

type RsResult = {name: string; status: string | null; address: string | null; director: string | null; vat_payer: boolean};

export function ContactsClient({session}: {session: ConstructionSession}) {
  const router = useRouter();
  const isAdmin = session.role === 'admin';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [rsLooking, setRsLooking] = useState(false);
  const [rsResult, setRsResult] = useState<RsResult | null>(null);
  const [rsErr, setRsErr] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editRsLooking, setEditRsLooking] = useState(false);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (filterCat) params.set('category', filterCat);
    params.set('active', 'all');
    const res = await fetch(`/api/construction/procurement/contacts?${params}`);
    if (res.ok) setContacts((await res.json()).contacts ?? []);
    setLoading(false);
  }, [search, filterCat]);

  useEffect(() => { load(); }, [load]);

  async function doRsLookup(code: string, setter: (f: typeof EMPTY_FORM) => void, currentForm: typeof EMPTY_FORM) {
    if (!code.trim()) return;
    setRsLooking(true); setRsErr(null); setRsResult(null);
    try {
      const r = await fetch(`/api/construction/lookup?code=${encodeURIComponent(code.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      setRsResult(d);
      if (d.name) setter({...currentForm, company: d.name, identification_code: code.trim()});
    } catch (e) { setRsErr((e as Error).message); }
    finally { setRsLooking(false); }
  }

  async function doEditRsLookup(code: string) {
    if (!code.trim()) return;
    setEditRsLooking(true);
    try {
      const r = await fetch(`/api/construction/lookup?code=${encodeURIComponent(code.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      if (d.name) setEditForm(p => ({...p, company: d.name, identification_code: code.trim()}));
      flash(`RS.ge: ${d.name}`);
    } catch (e) { flash(`RS.ge: ${(e as Error).message}`); }
    finally { setEditRsLooking(false); }
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !form.name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/construction/procurement/contacts', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(form)
    });
    if (!res.ok) { flash('შექმნა ვერ მოხერხდა'); setCreating(false); return; }
    flash('კონტაქტი დაემატა ✓');
    setForm(EMPTY_FORM);
    setRsResult(null);
    setRsErr(null);
    setCreating(false);
    load();
  }

  function startEdit(c: Contact) {
    setEditId(c.id);
    setEditForm({
      name: c.name,
      identification_code: c.identification_code ?? '',
      company: c.company ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      category: c.category ?? '',
      notes: c.notes ?? ''
    });
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/construction/procurement/contacts/${editId}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(editForm)
    });
    if (!res.ok) { flash('შეცდომა'); return; }
    flash('განახლდა ✓');
    setEditId(null);
    load();
  }

  async function toggleActive(c: Contact) {
    await fetch(`/api/construction/procurement/contacts/${c.id}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({active: !c.active})
    });
    setContacts((prev) => prev.map((x) => x.id === c.id ? {...x, active: !c.active} : x));
  }

  async function deleteContact(c: Contact) {
    if (!confirm(`"${c.name}" წაიშლება. გაგრძელება?`)) return;
    const res = await fetch(`/api/construction/procurement/contacts/${c.id}`, {method: 'DELETE'});
    if (!res.ok) { flash('წაშლა ვერ მოხერხდა'); return; }
    flash('წაიშალა');
    load();
  }

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

  const filtered = contacts.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !(c.company ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(c.identification_code ?? '').includes(search)) return false;
    if (filterCat && c.category !== filterCat) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{background: P}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M2 22 12 2l10 20H2z"/><path d="M10 14h4v8h-4z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-tight text-slate-900">KAYA Construction</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">× DMT</span>
          </div>
          <div className="mx-1 h-5 w-px bg-slate-200 hidden sm:block"></div>
          <span className="hidden font-semibold text-sm sm:inline" style={{color: P}}>კონტაქტები</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Link href="/construction/procurement" className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">← შესყიდვები</Link>
          <button onClick={logout} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600">გასვლა</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

        {/* Create form */}
        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">ახალი კონტაქტი</h2>

            {/* RS.ge lookup row */}
            <div className="mb-4 flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  საიდენტიფიკაციო კოდი — RS.ge ძიება
                </label>
                <input
                  value={form.identification_code}
                  onChange={(e) => { setForm(p => ({...p, identification_code: e.target.value})); setRsResult(null); setRsErr(null); }}
                  placeholder="123456789"
                  maxLength={11}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
                />
              </div>
              <button
                type="button"
                disabled={rsLooking || !form.identification_code.trim()}
                onClick={() => doRsLookup(form.identification_code, setForm, form)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{background: P}}
              >
                {rsLooking ? (
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> ეძებს…</span>
                ) : '🔍 RS.ge'}
              </button>
            </div>

            {/* RS.ge result banner */}
            {rsResult && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px]">
                <div className="flex items-start gap-2">
                  <span className="text-lg">✅</span>
                  <div>
                    <div className="font-bold text-emerald-800">{rsResult.name}</div>
                    {rsResult.status && <div className="text-emerald-600">სტატუსი: {rsResult.status}</div>}
                    {rsResult.address && <div className="text-emerald-600">მისამართი: {rsResult.address}</div>}
                    {rsResult.director && <div className="text-emerald-600">დირექტორი: {rsResult.director}</div>}
                    {rsResult.vat_payer && <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">დღგ გადამხდელი</div>}
                    <div className="mt-1 text-[11px] text-emerald-500">კომპანიის სახელი ჩაიწერა ↓</div>
                  </div>
                </div>
              </div>
            )}
            {rsErr && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-600">
                ⚠️ {rsErr}
              </div>
            )}

            <form onSubmit={createContact} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {key: 'name', label: 'სახელი *', placeholder: 'ნ. ნინუა', required: true},
                {key: 'company', label: 'კომპანია', placeholder: 'HERZ Georgia'},
                {key: 'email', label: 'ელ-ფოსტა', placeholder: 'name@company.ge'},
                {key: 'phone', label: 'ტელეფ.', placeholder: '+995 555 123 456'},
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({...prev, [f.key]: e.target.value}))}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">კატეგორია</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({...prev, category: e.target.value}))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none"
                >
                  <option value="">— ყველა —</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={creating} className="w-full rounded-lg py-2 text-sm font-semibold text-white transition disabled:opacity-60" style={{background: P}}>
                  {creating ? 'იქმნება…' : '+ კონტაქტი'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 სახელი / კომპანია / ს.კ."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#1565C0] focus:outline-none w-64"
          />
          <select
            value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#1565C0] focus:outline-none"
          >
            <option value="">ყველა კატ.</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <span className="self-center text-xs text-slate-400">{filtered.length} კონტაქტი</span>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">იტვირთება…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">კონტაქტი ვერ მოიძებნა</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">სახელი</th>
                    <th className="px-4 py-3">ს.კ.</th>
                    <th className="px-4 py-3">კომპანია</th>
                    <th className="px-4 py-3">ელ-ფოსტა</th>
                    <th className="px-4 py-3">ტელ.</th>
                    <th className="px-4 py-3">კატ.</th>
                    <th className="px-4 py-3">სტატ.</th>
                    {isAdmin && <th className="px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <>
                      {editId === c.id ? (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="px-3 py-2"><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={editForm.name} onChange={(e) => setEditForm((p) => ({...p, name: e.target.value}))} /></td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <input
                                className="w-24 rounded border border-slate-200 px-2 py-1 font-mono text-xs focus:border-[#1565C0] focus:outline-none"
                                value={editForm.identification_code}
                                onChange={(e) => setEditForm((p) => ({...p, identification_code: e.target.value}))}
                                placeholder="ს.კ."
                                maxLength={11}
                              />
                              <button
                                type="button"
                                disabled={editRsLooking || !editForm.identification_code.trim()}
                                onClick={() => doEditRsLookup(editForm.identification_code)}
                                className="rounded border border-[#1565C0] px-1.5 py-1 text-[10px] font-semibold text-[#1565C0] hover:bg-[#EEF4FD] disabled:opacity-40"
                                title="RS.ge-ში მოძებნა"
                              >
                                {editRsLooking ? '…' : '🔍'}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2"><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={editForm.company} onChange={(e) => setEditForm((p) => ({...p, company: e.target.value}))} /></td>
                          <td className="px-3 py-2"><input type="email" className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={editForm.email} onChange={(e) => setEditForm((p) => ({...p, email: e.target.value}))} /></td>
                          <td className="px-3 py-2"><input className="w-28 rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={editForm.phone} onChange={(e) => setEditForm((p) => ({...p, phone: e.target.value}))} /></td>
                          <td className="px-3 py-2">
                            <select className="rounded border border-slate-200 px-1 py-1 text-xs focus:border-[#1565C0] focus:outline-none" value={editForm.category} onChange={(e) => setEditForm((p) => ({...p, category: e.target.value}))}>
                              <option value="">—</option>
                              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{CAT_LABELS[cat]}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={saveEdit} className="rounded px-2 py-1 text-[11px] font-semibold text-white" style={{background: P}}>შენახ.</button>
                              <button onClick={() => setEditId(null)} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500">გაუქ.</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{c.identification_code ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{c.company ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.email ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{c.phone ?? '—'}</td>
                          <td className="px-4 py-3">
                            {c.category ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CAT_COLORS[c.category] ?? 'bg-slate-100 text-slate-500'}`}>
                                {CAT_LABELS[c.category] ?? c.category}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin ? (
                              <button onClick={() => toggleActive(c)} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                {c.active ? 'active' : 'inactive'}
                              </button>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                {c.active ? 'active' : 'inactive'}
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEdit(c)} className="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100">✏️</button>
                                <button onClick={() => deleteContact(c)} className="rounded px-2 py-1 text-[11px] text-red-400 hover:bg-red-50">✕</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg" style={{background: P}}>
          {toast}
        </div>
      )}
    </div>
  );
}
