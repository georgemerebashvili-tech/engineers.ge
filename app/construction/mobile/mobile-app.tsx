'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {ConstructionSession} from '@/lib/construction/auth';

type Device = {
  name?: string;
  category?: string;
  subtype?: string;
  brand?: string;
  model?: string;
  serial?: string;
  location?: string;
  photos?: (string | null)[];
  unplanned?: boolean;
};

type Site = {
  id: number;
  alias: string | null;
  name: string;
  city: string | null;
  region: string | null;
  planned_count: number;
  devices: Device[] | null;
};

export function ConstructionMobileApp({session}: {session: ConstructionSession}) {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/construction/sites');
      if (res.ok) {
        const data = await res.json();
        setSites((data.sites || []) as Site[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

  const filtered = sites.filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      s.name.toLowerCase().includes(t) ||
      (s.alias || '').toLowerCase().includes(t) ||
      (s.city || '').toLowerCase().includes(t) ||
      (s.region || '').toLowerCase().includes(t)
    );
  });

  if (selected) {
    const devices = selected.devices || [];
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-[#475569] px-4 py-3 text-white">
          <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white">
            ← უკან
          </button>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-bold">{selected.alias || selected.name}</div>
            <div className="text-xs text-white/70">{selected.city || selected.region || ''}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-[#475569]">{selected.planned_count}</div>
              <div className="text-xs text-slate-500">დაგეგმილი</div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-slate-900">{devices.length}</div>
              <div className="text-xs text-slate-500">ინვენტარში</div>
            </div>
          </div>
          {devices.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400 shadow-sm">
              მოწყობილობა ჯერ არ არის დამატებული
            </div>
          ) : (
            devices.map((d, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#475569] font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{d.name || '—'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[d.category, d.subtype, d.brand, d.model].filter(Boolean).join(' · ')}
                    </div>
                    {d.serial && (
                      <div className="font-mono text-[11px] text-slate-400 mt-1">S/N: {d.serial}</div>
                    )}
                    {d.location && (
                      <div className="text-[11px] text-slate-400">📍 {d.location}</div>
                    )}
                    {d.unplanned && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 mt-1">
                        დაუგეგმავი
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-[#475569] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-extrabold text-white">KAYA Construction</div>
            <div className="text-[11px] text-white/70">მობილური · {session.displayName || session.username}</div>
          </div>
          <button onClick={logout} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30">
            გასვლა
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძიება ობიექტი…"
          className="w-full rounded-xl bg-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:bg-white/30 focus:outline-none"
        />
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">იტვირთება…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">ობიექტი ვერ მოიძებნა</div>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="w-full rounded-xl bg-white border border-slate-200 p-4 text-left shadow-sm hover:border-[#475569]/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">
                    {s.alias || s.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {[s.city, s.region].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <div className="font-mono text-lg font-bold text-[#475569]">
                    {(s.devices || []).length}
                  </div>
                  <div className="text-[10px] text-slate-400">/ {s.planned_count}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
