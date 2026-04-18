'use client';

import {useMemo} from 'react';
import {formatGel, type HeroAdSlot} from '@/lib/hero-ads';
import {BannersShell} from './shell';

export function BannersStats({slots}: {slots: HeroAdSlot[]}) {
  const adSlots = useMemo(() => slots.filter((s) => s.is_ad_slot), [slots]);
  const totalPrice = useMemo(
    () => adSlots.reduce((sum, s) => sum + (s.price_gel ?? 0), 0),
    [adSlots]
  );
  const sorted = useMemo(
    () => [...adSlots].sort((a, b) => b.price_gel - a.price_gel),
    [adSlots]
  );
  const max = adSlots.length > 0 ? Math.max(...adSlots.map((s) => s.price_gel)) : 0;
  const avg =
    adSlots.length > 0 ? Math.round(totalPrice / adSlots.length) : 0;
  const topSlot =
    adSlots.length > 0
      ? adSlots.reduce((t, s) => (s.price_gel > t.price_gel ? s : t))
      : null;

  return (
    <BannersShell
      title="ბანერები · სტატისტიკა"
      description="ფასების განაწილება, TOP slot-ები, საშუალო."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-card border border-bdr bg-sur p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
            ყველაზე ძვირი slot
          </p>
          <p className="mt-2 text-[24px] font-bold text-navy">
            {max > 0 ? `${formatGel(max)} ₾` : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-text-2">
            {topSlot?.display_name ?? ''}
          </p>
        </div>
        <div className="rounded-card border border-bdr bg-sur p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
            საშუალო ფასი
          </p>
          <p className="mt-2 text-[24px] font-bold text-navy">
            {avg > 0 ? `${formatGel(avg)} ₾` : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-text-2">
            {adSlots.length} slot-ზე
          </p>
        </div>
        <div className="rounded-card border border-bdr bg-sur p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
            ჯამი / თვე
          </p>
          <p className="mt-2 text-[24px] font-bold text-navy">
            {formatGel(totalPrice)} ₾
          </p>
          <p className="mt-0.5 text-[11px] text-text-2">ყველა slot-ის ფასი</p>
        </div>
      </div>

      <div className="mt-5 rounded-card border border-bdr bg-sur p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-navy">
          ფასების განაწილება
        </h3>
        <div className="flex flex-col gap-2.5">
          {sorted.map((slot) => {
            const pct = Math.round((slot.price_gel / (max || 1)) * 100);
            return (
              <div key={slot.slot_key}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-navy">
                    {slot.display_name}
                  </span>
                  <span className="font-mono text-text-2">
                    {formatGel(slot.price_gel)} ₾
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sur-2">
                  <div
                    style={{width: `${pct}%`}}
                    className="h-full bg-blue transition-[width] duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BannersShell>
  );
}
