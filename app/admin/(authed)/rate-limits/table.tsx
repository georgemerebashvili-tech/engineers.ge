'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Lock, Clock, Search, Unlock, Gauge, type LucideIcon} from 'lucide-react';
import type {RateLimitRow} from '@/lib/rate-limit';

const BUCKET_COLORS: Record<string, string> = {
  login: 'bg-red-50 border-red-200 text-red-800',
  register: 'bg-amber-50 border-amber-200 text-amber-800',
  verify_resend: 'bg-blue-50 border-blue-200 text-blue-800',
  generic: 'bg-sur-2 border-bdr text-text-2'
};

function relativeTime(iso: string): string {
  const ago = Date.now() - new Date(iso).getTime();
  const min = Math.round(ago / 60000);
  if (min < 1) return 'ახლახან';
  if (min < 60) return `${min} წთ წინ`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} სთ წინ`;
  return `${Math.round(hr / 24)} დღე წინ`;
}

function remainingUntil(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.ceil(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.round(min / 60)}h`;
}

export function RateLimitsTable({
  locked: initialLocked,
  cooling: initialCooling
}: {
  locked: RateLimitRow[];
  cooling: RateLimitRow[];
}) {
  const router = useRouter();
  const [locked, setLocked] = useState(initialLocked);
  const [cooling, setCooling] = useState(initialCooling);
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filteredLocked = useMemo(
    () => filterRows(locked, search),
    [locked, search]
  );
  const filteredCooling = useMemo(
    () => filterRows(cooling, search),
    [cooling, search]
  );

  async function unlock(row: RateLimitRow) {
    const id = `${row.bucket}:${row.key}`;
    setBusyKey(id);
    try {
      const res = await fetch('/api/admin/rate-limits', {
        method: 'DELETE',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({bucket: row.bucket, key: row.key})
      });
      if (!res.ok) throw new Error('unlock failed');
      setLocked((prev) => prev.filter((r) => `${r.bucket}:${r.key}` !== id));
      setCooling((prev) => prev.filter((r) => `${r.bucket}:${r.key}` !== id));
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'error');
    } finally {
      setBusyKey(null);
    }
  }

  const totalLocked = locked.length;
  const totalCooling = cooling.length;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-card border p-3 ${totalLocked > 0 ? 'border-red-300 bg-red-50 text-red-800' : 'border-bdr bg-sur-2 text-text-3'}`}>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-80">
            <Lock size={12} />
            ამჟამად ჩაკეტილი
          </div>
          <p className="mt-0.5 text-[22px] font-bold">{totalLocked}</p>
        </div>
        <div className="rounded-card border border-bdr bg-sur p-3 text-text-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-80">
            <Clock size={12} />
            cooling down (ბოლო attempts)
          </div>
          <p className="mt-0.5 text-[22px] font-bold">{totalCooling}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება bucket:key..."
          className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      {/* Locked */}
      {filteredLocked.length > 0 && (
        <Section
          title="ამჟამად ჩაკეტილი"
          icon={Lock}
          tone="red"
          rows={filteredLocked}
          busyKey={busyKey}
          onUnlock={unlock}
          showRemaining
        />
      )}

      {/* Cooling */}
      {filteredCooling.length > 0 && (
        <Section
          title="Cooling down (fails ≤ maxFails)"
          icon={Gauge}
          tone="neutral"
          rows={filteredCooling}
          busyKey={busyKey}
          onUnlock={unlock}
        />
      )}

      {filteredLocked.length === 0 && filteredCooling.length === 0 && (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-3">
          {search ? 'ფილტრისთვის ჩანაწერი არ მოიძებნა.' : 'ცხრილი ცარიელია — rate-limit state აქ გამოჩნდება როცა user-ი ფლადობს login/register.'}
        </div>
      )}
    </div>
  );
}

function filterRows(rows: RateLimitRow[], q: string): RateLimitRow[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter(
    (r) => r.key.toLowerCase().includes(s) || r.bucket.toLowerCase().includes(s)
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  rows,
  busyKey,
  onUnlock,
  showRemaining
}: {
  title: string;
  icon: LucideIcon;
  tone: 'red' | 'neutral';
  rows: RateLimitRow[];
  busyKey: string | null;
  onUnlock: (r: RateLimitRow) => void;
  showRemaining?: boolean;
}) {
  return (
    <section className="rounded-card border border-bdr bg-sur overflow-hidden">
      <header className={`flex items-center gap-2 border-b border-bdr px-4 py-2.5 ${tone === 'red' ? 'bg-red-50' : 'bg-sur-2'}`}>
        <Icon size={13} className={tone === 'red' ? 'text-red-600' : 'text-text-3'} />
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
          {title} · {rows.length}
        </h2>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[12px]">
          <thead className="bg-sur-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
            <tr>
              <th className="px-3 py-2 text-left">bucket</th>
              <th className="px-3 py-2 text-left">key</th>
              <th className="px-3 py-2 text-right">fails</th>
              {showRemaining && <th className="px-3 py-2 text-right">remaining</th>}
              <th className="px-3 py-2 text-left">last attempt</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = `${r.bucket}:${r.key}`;
              const remaining = remainingUntil(r.locked_until);
              return (
                <tr key={id} className={`border-t border-bdr ${busyKey === id ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2">
                    <span className={`inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] font-bold ${BUCKET_COLORS[r.bucket] ?? BUCKET_COLORS.generic}`}>
                      {r.bucket}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-navy max-w-[30ch] truncate" title={r.key}>
                    {r.key}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-text-2">
                    {r.fail_count}
                  </td>
                  {showRemaining && (
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex h-5 items-center rounded-full border border-red-200 bg-red-50 px-2 font-mono text-[10px] font-bold text-red-700">
                        {remaining ?? '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2 font-mono text-[10px] text-text-3">
                    {relativeTime(r.last_attempt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onUnlock(r)}
                      disabled={busyKey === id}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Unlock size={11} />
                      unlock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
