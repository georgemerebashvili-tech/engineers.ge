'use client';

import {useMemo} from 'react';
import {formatGel, formatOccupiedUntil, type HeroAdSlot} from '@/lib/hero-ads';
import {BannersShell} from './shell';

export function BannersTable({slots}: {slots: HeroAdSlot[]}) {
  const adSlots = useMemo(() => slots.filter((s) => s.is_ad_slot), [slots]);

  return (
    <BannersShell
      title="ბანერები · ცხრილი"
      description="ყველა სლოტი ერთ ცხრილში — ფასი, ვადა, სტატუსი, კლიენტი."
    >
      <div className="rounded-card border border-bdr bg-sur">
        <div className="border-b border-bdr px-4 py-3 text-[12px] text-text-2">
          ყველა სლოტი · {adSlots.length} სარეკლამო ·{' '}
          {slots.length - adSlots.length} ბრენდული
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-sur-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
              <tr>
                <Th>სლოტი</Th>
                <Th>ზომა</Th>
                <Th>ტიპი</Th>
                <Th>კლიენტი</Th>
                <Th align="right">ფასი / თვე</Th>
                <Th>ვადა</Th>
                <Th>სტატუსი</Th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const busy = slot.is_ad_slot && !!slot.occupied_until;
                return (
                  <tr
                    key={slot.slot_key}
                    className="border-t border-bdr hover:bg-sur-2"
                  >
                    <Td>
                      <div className="font-semibold text-navy">
                        {slot.display_name}
                      </div>
                      <div className="font-mono text-[10px] text-text-3">
                        {slot.slot_key}
                      </div>
                    </Td>
                    <Td className="font-mono">{slot.size_hint}</Td>
                    <Td>
                      <Chip
                        tone={slot.is_ad_slot ? 'blue' : 'neutral'}
                        label={slot.is_ad_slot ? 'Ad slot' : 'Brand'}
                      />
                    </Td>
                    <Td>{slot.client_name || '—'}</Td>
                    <Td align="right" className="font-mono">
                      {slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : '—'}
                    </Td>
                    <Td className="font-mono text-[11px]">
                      {formatOccupiedUntil(slot.occupied_until)}
                    </Td>
                    <Td>
                      {slot.is_ad_slot ? (
                        <Chip
                          tone={busy ? 'amber' : 'green'}
                          label={busy ? 'დაკავებული' : 'თავისუფალი'}
                        />
                      ) : (
                        <Chip tone="neutral" label="—" />
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BannersShell>
  );
}

function Th({
  children,
  align
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      } whitespace-nowrap`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className = ''
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      } align-top ${className}`}
    >
      {children}
    </td>
  );
}

function Chip({
  label,
  tone
}: {
  label: string;
  tone: 'blue' | 'green' | 'amber' | 'neutral';
}) {
  const tones: Record<typeof tone, string> = {
    blue: 'bg-blue-lt text-blue border-blue-bd',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-ora-lt text-ora border-ora-bd',
    neutral: 'bg-sur-2 text-text-3 border-bdr'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
