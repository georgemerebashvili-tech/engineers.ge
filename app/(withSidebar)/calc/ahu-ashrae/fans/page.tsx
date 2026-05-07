import type { Metadata } from 'next';
import Link from 'next/link';
import { Wind } from 'lucide-react';

import { FAN_MODELS } from '@/lib/ahu-ashrae/fans/registry';

export const metadata: Metadata = {
  title: 'Fan library — ვენტილატორების მრუდები | engineers.ge',
  description:
    'AHU სელექტორის Fan ბიბლიოთეკა — datasheet, working point, ფან მრუდები (pressure / power / efficiency / RPM), ASHRAE-დან.',
};

export default function FanLibraryPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 py-6">
      <header className="mb-5">
        <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Fan library
        </h1>
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>
          AHU-ს ვენტილატორების datasheet — interactive curves, working point. წყარო: AFL (cloudair.tech).
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FAN_MODELS.map((m) => (
          <Link
            key={m.code}
            href={`/calc/ahu-ashrae/fans/${m.code}`}
            className="rounded-lg border p-4 hover:shadow-md transition-shadow"
            style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.imageUrl}
                alt={m.code}
                className="w-12 h-12 object-contain"
                style={{ background: 'var(--sur-2)', borderRadius: 6, padding: 3 }}
              />
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                  {m.code}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {m.alias} · {m.spec.motorType} · {m.spec.powerRated} W / {m.spec.voltageRated} V
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]" style={{ color: 'var(--text-3)' }}>
              <Stat label="V_max" value={`${m.spec.volumeMax} m³/h`} />
              <Stat label="ΔP_max" value={`${m.spec.pressureStaticMax} Pa`} />
              <Stat label="n_max" value={`${m.spec.speedMax} rpm`} />
            </div>
          </Link>
        ))}

        {FAN_MODELS.length < 10 && (
          <div
            className="rounded-lg border-2 border-dashed p-4 flex flex-col items-center justify-center text-center"
            style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-3)' }}
          >
            <Wind size={20} />
            <div className="text-[12px] mt-1.5">დამატებითი მოდელები</div>
            <div className="text-[10px]">დაამატე JSON в /lib/ahu-ashrae/fans/data/</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono">{label}</div>
      <div className="font-bold tabular-nums" style={{ color: 'var(--text-2)' }}>{value}</div>
    </div>
  );
}
