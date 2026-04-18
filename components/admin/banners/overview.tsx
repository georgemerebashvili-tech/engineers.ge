'use client';

import {useMemo} from 'react';
import {TrendingUp, TrendingDown, Minus} from 'lucide-react';
import {HeroTreemap} from '@/components/hero-treemap';
import {formatGel, type HeroAdSlot} from '@/lib/hero-ads';
import {BannersShell} from './shell';

type Trend = 'up' | 'down' | 'neutral';

function Sparkline({data, trend}: {data: number[]; trend: Trend}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke =
    trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#6b7280';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function StatCard({
  title,
  value,
  interval,
  trend,
  data
}: {
  title: string;
  value: string;
  interval: string;
  trend: Trend;
  data: number[];
}) {
  const Icon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
      ? 'text-red-600'
      : 'text-text-3';
  return (
    <div className="rounded-card border border-bdr bg-sur p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
          {title}
        </p>
        <Icon size={14} className={trendColor} />
      </div>
      <p className="mt-2 text-[22px] font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-2">{interval}</p>
      <div className="mt-3">
        <Sparkline data={data} trend={trend} />
      </div>
    </div>
  );
}

export function BannersOverview({slots}: {slots: HeroAdSlot[]}) {
  const adSlots = useMemo(() => slots.filter((s) => s.is_ad_slot), [slots]);
  const totalPrice = useMemo(
    () => adSlots.reduce((sum, s) => sum + (s.price_gel ?? 0), 0),
    [adSlots]
  );
  const occupiedCount = useMemo(
    () => adSlots.filter((s) => !!s.occupied_until).length,
    [adSlots]
  );
  const freeCount = adSlots.length - occupiedCount;
  const utilization =
    adSlots.length > 0 ? Math.round((occupiedCount / adSlots.length) * 100) : 0;

  const statCards: {
    title: string;
    value: string;
    interval: string;
    trend: Trend;
    data: number[];
  }[] = [
    {
      title: 'სარეკლამო სლოტები',
      value: `${adSlots.length}`,
      interval: 'hero treemap',
      trend: 'neutral',
      data: Array(30).fill(adSlots.length)
    },
    {
      title: 'დაკავებული',
      value: `${occupiedCount}/${adSlots.length}`,
      interval: `${utilization}% დატვირთულობა`,
      trend: occupiedCount > freeCount ? 'up' : 'neutral',
      data: [3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, occupiedCount]
    },
    {
      title: 'თავისუფალი',
      value: `${freeCount}`,
      interval: 'მზადაა განთავსებისთვის',
      trend: freeCount > 0 ? 'up' : 'down',
      data: Array(30).fill(freeCount)
    },
    {
      title: 'შემოსავალი / თვე',
      value: `${formatGel(totalPrice)} ₾`,
      interval: 'ყველა slot-ის ფასი',
      trend: 'up',
      data: [
        400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1500, 1700, 1900, 2100, 2300, 2500,
        2800, 3100, 3400, 3700, 4000, 4200, 4400, 4600, 4800, 4900, 5000, 5100, 5150, totalPrice
      ]
    }
  ];

  return (
    <BannersShell
      title="ბანერები · მიმოხილვა"
      description="Hero ads, დატვირთულობა, შემოსავალი და live treemap — ერთ ადგილას."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </div>
      <div className="mt-5 rounded-card border border-bdr bg-sur p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-navy">
          ცოცხალი preview · მთავარი გვერდი
        </h3>
        <HeroTreemap slots={slots} />
      </div>
    </BannersShell>
  );
}
