'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  Cpu,
  Plus,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  AlertCircle,
  Network,
  Wrench
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';
import {ResizableTable} from '@/components/dmt/resizable-table';
import {
  loadDevices,
  saveDevices,
  resetDevicesToSeed,
  cryptoRandomId,
  CATEGORY_META,
  type Device
} from '@/lib/dmt/devices-store';

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  useEffect(() => {
    setDevices(loadDevices());
    setHydrated(true);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return devices.filter((d) => {
      if (cat !== 'all' && d.category !== cat) return false;
      if (!t) return true;
      return (
        d.code.toLowerCase().includes(t) ||
        d.fullCode.toLowerCase().includes(t) ||
        d.name.toLowerCase().includes(t) ||
        d.nameGe.toLowerCase().includes(t) ||
        d.accCode.toLowerCase().includes(t) ||
        d.description.toLowerCase().includes(t)
      );
    });
  }, [devices, q, cat]);

  const addNew = () => {
    const now = new Date().toISOString();
    const idx = devices.length + 1;
    const newDev: Device = {
      id: cryptoRandomId(),
      code: `NEW${idx}`,
      fullCode: `NEW${idx} V12.25.V1.01`,
      accCode: `CONTR${String(idx).padStart(4, '0')}`,
      name: 'ახალი მოწყობილობა',
      nameGe: 'ახალი მოწყობილობა',
      description: '',
      category: 'controller',
      plcBaseAddress: '',
      supplyVoltage: '24V DC',
      mountType: 'DIN rail 35mm',
      firmwareVersion: 'V12.25.V1.01',
      images: [],
      ioConnectors: [],
      buttons: [],
      errors: [],
      anomalies: [],
      variables: [],
      files: [],
      createdAt: now,
      updatedAt: now
    };
    const next = [...devices, newDev];
    setDevices(next);
    saveDevices(next);
    router.push(`/dmt/devices/${encodeURIComponent(newDev.code)}`);
  };

  const resetSeed = () => {
    if (!confirm('გნებავს კატალოგის საწყის 22 მოწყობილობამდე დაბრუნება? ყველა ცვლილება დაიკარგება.')) return;
    setDevices(resetDevicesToSeed());
  };

  const cats = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => set.add(d.category));
    return Array.from(set);
  }, [devices]);

  return (
    <DmtPageShell
      kicker="HARDWARE"
      title="მოწყობილობები"
      subtitle="კონტროლერების / სენსორების / PLC მოდულების კატალოგი"
      searchPlaceholder="ძიება: კოდი / სახელი / ACC code / აღწერა…"
      onQueryChange={setQ}
      actions={
        <>
          <button
            onClick={resetSeed}
            className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-ora hover:text-ora"
            title="კატალოგის განახლება სტანდარტულ 22 მოწყობილობამდე"
          >
            <RefreshCw size={14} /> Reset
          </button>
          <button
            onClick={addNew}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <Plus size={14} /> ახალი მოწყობილობა
          </button>
        </>
      }
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatCard label="სულ" value={String(devices.length)} icon={Cpu} />
          <StatCard label="კატეგორია" value={String(cats.length)} icon={Network} />
          <StatCard label="ფილტრში" value={String(filtered.length)} icon={Wrench} />
          <StatCard
            label="ანომალიები"
            value={String(devices.reduce((s, d) => s + d.anomalies.length, 0))}
            icon={AlertCircle}
            accent="red"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <CatChip active={cat === 'all'} onClick={() => setCat('all')}>
            ყველა
            <span className="ml-1.5 font-mono text-[10px] text-text-3">{devices.length}</span>
          </CatChip>
          {cats.map((c) => {
            const meta = CATEGORY_META[c as keyof typeof CATEGORY_META];
            const n = devices.filter((d) => d.category === c).length;
            return (
              <CatChip key={c} active={cat === c} onClick={() => setCat(c)}>
                {meta?.label ?? c}
                <span className="ml-1.5 font-mono text-[10px] text-text-3">{n}</span>
              </CatChip>
            );
          })}
        </div>

        {!hydrated ? (
          <div className="flex items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-[12px] text-text-3">
            იტვირთება კატალოგი…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-16 text-center">
            <Cpu size={28} className="text-text-3" strokeWidth={1.4} />
            <div className="mt-3 text-[14px] font-semibold text-navy">
              მოწყობილობა ვერ მოიძებნა
            </div>
            <div className="mt-1 text-[12px] text-text-3">
              შეცვალე ძიება, ან დაამატე ახალი.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
            <div className="border-b border-bdr bg-sur-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
              <span className="text-navy">{filtered.length}</span> / {devices.length} მოწყობილობა
            </div>
            <ResizableTable storageKey="dmt-devices" className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                    <th className="w-10 px-2 py-2 text-center font-bold">#</th>
                    <th className="px-3 py-2 font-bold">კოდი</th>
                    <th className="px-3 py-2 font-bold">დასახელება</th>
                    <th className="px-3 py-2 font-bold">ACC Code</th>
                    <th className="px-3 py-2 font-bold">კატეგორია</th>
                    <th className="px-3 py-2 font-bold">~PLC</th>
                    <th className="px-3 py-2 font-bold">განმარტება</th>
                    <th className="px-3 py-2 text-center font-bold" title="სურათები">
                      <ImageIcon size={12} className="inline" />
                    </th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const meta = CATEGORY_META[d.category];
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-bdr last:border-b-0 hover:bg-sur-2"
                      >
                        <td className="px-2 py-1.5 text-center font-mono text-[10.5px] text-text-3">
                          {i + 1}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] font-semibold text-navy">
                          <Link
                            href={`/dmt/devices/${encodeURIComponent(d.code)}`}
                            className="hover:text-blue hover:underline"
                          >
                            {d.fullCode}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5 text-text">
                          <div className="font-semibold text-navy">{d.name}</div>
                          <div className="text-[11px] text-text-2">{d.nameGe}</div>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-text-2">
                          {d.accCode}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{color: meta.color, background: meta.bg, borderColor: meta.border}}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-text-2">
                          {d.plcBaseAddress || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-text-2">
                          <div className="line-clamp-2 max-w-md text-[11.5px]">
                            {d.description || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center font-mono text-[10.5px] text-text-3">
                          {d.images.length}/3
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Link
                            href={`/dmt/devices/${encodeURIComponent(d.code)}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 hover:bg-blue-lt hover:text-blue"
                            aria-label="გახსნა"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResizableTable>
          </div>
        )}
      </div>
    </DmtPageShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent
}: {
  label: string;
  value: string;
  icon: typeof Cpu;
  accent?: 'red' | 'grn' | 'ora';
}) {
  const color =
    accent === 'red'
      ? 'var(--red)'
      : accent === 'grn'
        ? 'var(--grn)'
        : accent === 'ora'
          ? 'var(--ora)'
          : 'var(--navy)';
  return (
    <div className="rounded-[10px] border border-bdr bg-sur p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          {label}
        </div>
        <Icon size={14} className="text-text-3" />
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{color}}>
        {value}
      </div>
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors ${
        active
          ? 'border-blue bg-blue text-white'
          : 'border-bdr bg-sur text-text-2 hover:border-blue-bd hover:bg-blue-lt hover:text-blue'
      }`}
    >
      {children}
    </button>
  );
}
