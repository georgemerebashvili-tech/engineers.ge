'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {ConstructionSession} from '@/lib/construction/auth';

const P = '#1565C0';
const PD = '#0D47A1';

const STATUS_LABEL: Record<string, string> = {
  draft: 'მოლოდინში',
  open: 'ღია',
  closed: 'დახურული',
  awarded: 'დასრულებული'
};
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  open: 'bg-blue-50 text-blue-700',
  closed: 'bg-amber-50 text-amber-700',
  awarded: 'bg-green-50 text-green-700'
};

type Project = {
  id: string;
  project_no: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  site?: {id: number; name: string} | null;
};

export function ProcurementList({session}: {session: ConstructionSession}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNo, setNewNo] = useState('');
  const [newName, setNewName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/construction/procurement/projects');
    if (res.ok) setProjects((await res.json()).projects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/construction/procurement/projects', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({project_no: newNo, name: newName})
    });
    if (!res.ok) { flash('შექმნა ვერ მოხერხდა'); setCreating(false); return; }
    const {project} = await res.json();
    setNewNo(''); setNewName(''); setCreating(false);
    router.push(`/construction/procurement/${project.id}`);
  }

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

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
          <span className="hidden font-semibold text-sm sm:inline" style={{color: P}}>შესყიდვები</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">{session.displayName || session.username}</span>
          <Link href="/construction/app" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            ← ინვენტარი
          </Link>
          <Link href="/construction/procurement/contacts" className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            👥 კონტაქტები
          </Link>
          <button onClick={logout} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600">
            გასვლა
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {session.role === 'admin' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">ახალი ტენდერი / შესყიდვა</h2>
            <form onSubmit={createProject} className="flex flex-wrap gap-3">
              <input
                value={newNo} onChange={(e) => setNewNo(e.target.value)}
                placeholder="PRJ-2025-001"
                className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
              />
              <input
                value={newName} onChange={(e) => setNewName(e.target.value)} required
                placeholder="პროექტის სახელი (HVAC — სასახლე)"
                className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20"
              />
              <button
                type="submit" disabled={creating}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{background: P}}
              >
                {creating ? 'იქმნება…' : '+ შექმნა'}
              </button>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div>
              <span className="text-sm font-bold text-slate-900">ტენდერების სია</span>
              <span className="ml-2 text-xs text-slate-400">{projects.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">იტვირთება…</div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">ჯერ ტენდერი არ არის. შექმენი პირველი!</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/construction/procurement/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold" style={{background: P}}>
                    {p.project_no ? p.project_no.slice(-3) : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {p.project_no && <span className="font-mono text-xs text-slate-400">{p.project_no}</span>}
                      <span className="font-semibold text-slate-900 text-sm truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{new Date(p.created_at).toLocaleDateString('ka')}</span>
                      {p.site && <span>· {p.site.name}</span>}
                      <span>· {p.created_by}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[p.status] ?? STATUS_COLOR.draft}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
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
