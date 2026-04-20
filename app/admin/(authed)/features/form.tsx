'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Circle, FlaskConical, EyeOff, Search, CheckCircle2} from 'lucide-react';
import {ConfirmModal, type ConfirmTone} from '@/components/confirm-modal';
import type {
  FeatureDef,
  FeatureFlag,
  FeatureStatus
} from '@/lib/feature-flags';

type Pending = {
  key: string;
  label: string;
  next: FeatureStatus;
  prev: FeatureStatus;
};

const STATUS_CONFIG: Record<
  FeatureStatus,
  {label: string; hint: string; color: string; tone: ConfirmTone}
> = {
  active: {
    label: 'აქტიური',
    hint: 'ვიზიტორი ხედავს როგორც ჩვეულებრივ',
    color: 'bg-emerald-500 border-emerald-600 text-white',
    tone: 'default'
  },
  test: {
    label: 'სატესტო',
    hint: 'გამოჩნდება ყვითელი ბანერი: „სატესტო რეჟიმშია"',
    color: 'bg-amber-400 border-amber-500 text-amber-950',
    tone: 'warn'
  },
  hidden: {
    label: 'დამალული',
    hint: 'ვიზიტორი საერთოდ ვერ ხედავს sidebar-ში',
    color: 'bg-red-500 border-red-600 text-white',
    tone: 'danger'
  }
};

export function FeaturesForm({
  registry,
  initial
}: {
  registry: FeatureDef[];
  initial: FeatureFlag[];
}) {
  const router = useRouter();
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>(() => {
    const map: Record<string, FeatureFlag> = {};
    for (const f of initial) map[f.key] = f;
    return map;
  });
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flashedKey, setFlashedKey] = useState<string | null>(null);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grouped = new Map<string, FeatureDef[]>();
    for (const def of registry) {
      if (q && !def.label.toLowerCase().includes(q) && !def.key.toLowerCase().includes(q)) continue;
      if (!grouped.has(def.section)) grouped.set(def.section, []);
      grouped.get(def.section)!.push(def);
    }
    return Array.from(grouped.entries());
  }, [registry, search]);

  const counts = useMemo(() => {
    const c: Record<FeatureStatus, number> = {active: 0, test: 0, hidden: 0};
    for (const f of Object.values(flags)) c[f.status]++;
    return c;
  }, [flags]);

  function requestChange(def: FeatureDef, next: FeatureStatus) {
    const prev = flags[def.key]?.status ?? 'active';
    if (prev === next) return;
    setError(null);
    setPending({key: def.key, label: def.label, next, prev});
  }

  async function commit() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({key: pending.key, status: pending.next})
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.hint ?? data.message ?? 'შეცდომა');
      }
      setFlags((prev) => ({...prev, [pending.key]: data.flag}));
      setFlashedKey(pending.key);
      setTimeout(() => setFlashedKey(null), 1500);
      setPending(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'შეცდომა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="აქტიური" value={counts.active} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        <Kpi label="სატესტო" value={counts.test} color="text-amber-700 bg-amber-50 border-amber-300" />
        <Kpi label="დამალული" value={counts.hidden} color="text-red-700 bg-red-50 border-red-200" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" strokeWidth={2} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება ფიჩერის სახელით ან key-ით…"
          className="w-full rounded-md border border-bdr bg-sur pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-bd bg-red-lt p-3 text-sm text-red-700">
          <p className="font-semibold">ცვლილება ვერ შეინახა</p>
          <p className="mt-0.5 font-mono text-xs">{error}</p>
        </div>
      )}

      {/* Feature groups */}
      {sections.map(([section, items]) => (
        <section key={section} className="rounded-card border border-bdr bg-sur overflow-hidden">
          <header className="border-b border-bdr bg-sur-2 px-4 py-2.5">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
              {section}
              <span className="ml-2 font-sans text-text-3">· {items.length}</span>
            </h2>
          </header>
          <ul className="divide-y divide-bdr">
            {items.map((def) => {
              const current = flags[def.key]?.status ?? 'active';
              const flashed = flashedKey === def.key;
              return (
                <li
                  key={def.key}
                  className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between transition-colors ${flashed ? 'bg-emerald-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[13px] text-navy truncate">{def.label}</p>
                      {flashed && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-text-3">
                      {def.key}
                      {def.routes && def.routes.length > 0 && (
                        <span className="ml-2 text-text-3">→ {def.routes.join(', ')}</span>
                      )}
                    </p>
                    {def.description && (
                      <p className="mt-0.5 text-[11px] text-text-2">{def.description}</p>
                    )}
                  </div>
                  <div className="inline-flex shrink-0 rounded-md border border-bdr bg-sur-2 p-0.5">
                    <StatusPill
                      status="active"
                      icon={<Circle size={11} strokeWidth={2.5} />}
                      active={current === 'active'}
                      onClick={() => requestChange(def, 'active')}
                    />
                    <StatusPill
                      status="test"
                      icon={<FlaskConical size={11} strokeWidth={2.2} />}
                      active={current === 'test'}
                      onClick={() => requestChange(def, 'test')}
                    />
                    <StatusPill
                      status="hidden"
                      icon={<EyeOff size={11} strokeWidth={2.2} />}
                      active={current === 'hidden'}
                      onClick={() => requestChange(def, 'hidden')}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {sections.length === 0 && (
        <div className="rounded-card border border-bdr bg-sur p-8 text-center text-sm text-text-2">
          „{search}&rdquo;-ისთვის ფიჩერი არ მოიძებნა.
        </div>
      )}

      <ConfirmModal
        open={!!pending}
        title={pending ? `„${pending.label}" → ${STATUS_CONFIG[pending.next].label}?` : ''}
        tone={pending ? STATUS_CONFIG[pending.next].tone : 'default'}
        busy={busy}
        confirmLabel={pending ? `ჩართე ${STATUS_CONFIG[pending.next].label}` : 'OK'}
        message={
          pending ? (
            <>
              <p>{STATUS_CONFIG[pending.next].hint}</p>
              <p className="mt-2 font-mono text-[11px] text-text-3">
                {pending.prev} → <span className="font-bold text-navy">{pending.next}</span>
              </p>
            </>
          ) : (
            ''
          )
        }
        onConfirm={commit}
        onClose={() => !busy && setPending(null)}
      />
    </div>
  );
}

function Kpi({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <div className={`rounded-card border p-3 ${color}`}>
      <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold">{value}</p>
    </div>
  );
}

function StatusPill({
  status,
  icon,
  active,
  onClick
}: {
  status: FeatureStatus;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <button
      type="button"
      onClick={onClick}
      title={cfg.hint}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
        active ? `${cfg.color} border shadow-sm` : 'text-text-2 hover:bg-sur'
      }`}
      aria-pressed={active}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
      <span>{cfg.label}</span>
    </button>
  );
}
