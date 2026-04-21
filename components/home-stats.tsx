import {Container} from './container';
import {CALCULATORS} from '@/lib/calculators';
import {formatGel} from '@/lib/hero-ads';
import {getHomeStats, type HomeStatsData} from '@/lib/home-stats';

type StatCard = {
  title: string;
  value: string;
  interval: string;
  trend: 'up' | 'down' | 'neutral';
};

function buildCards(stats: HomeStatsData): StatCard[] {
  const formatShort = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return formatGel(n);
  };
  return [
    {
      title: 'უნიკალური ვიზიტორები',
      value: formatShort(stats.uniqueVisitors30d),
      interval: 'ბოლო 30 დღე',
      trend: stats.uniqueVisitors30d > 0 ? 'up' : 'neutral'
    },
    {
      title: 'კალკულაციები',
      value: formatGel(stats.calcEvents30d),
      interval: 'ბოლო 30 დღე',
      trend: stats.calcEvents30d > 0 ? 'up' : 'neutral'
    },
    {
      title: 'აქტიური კალკულატორი',
      value: `${CALCULATORS.length}`,
      interval: 'ხელმისაწვდომი',
      trend: 'neutral'
    }
  ];
}

function TrendPill({trend}: {trend: StatCard['trend']}) {
  if (trend === 'neutral') {
    return (
      <span className="inline-flex rounded-pill border border-bdr-2 bg-sur-2 px-2 py-[2px] font-mono text-[10px] font-bold text-text-3">
        = STABLE
      </span>
    );
  }
  const up = trend === 'up';
  return (
    <span
      className={`inline-flex rounded-pill border px-2 py-[2px] font-mono text-[10px] font-bold ${
        up
          ? 'border-grn-bd bg-grn-lt text-grn'
          : 'border-[#f8a0a0] bg-red-lt text-red'
      }`}
    >
      {up ? '▲ UP' : '▼ DOWN'}
    </span>
  );
}

function StatCardView({card}: {card: StatCard}) {
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-text-2">{card.title}</p>
        <TrendPill trend={card.trend} />
      </div>
      <p className="mt-1.5 font-mono text-[22px] font-bold leading-none text-navy">
        {card.value}
      </p>
      <p className="mt-1 text-[10px] text-text-3">{card.interval}</p>
    </div>
  );
}

function BarChart({days}: {days: {label: string; count: number}[]}) {
  const total = days.reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const hasData = total > 0;
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">გვერდების ნახვები</p>
      <p className="mt-0.5 text-[10px] text-text-3">ბოლო 7 დღე</p>
      <div className="relative mt-5 flex h-40 items-end gap-2">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-bdr" />
        {days.map((d, i) => {
          const active = d.count > 0;
          const h = active ? Math.max(8, Math.round((d.count / max) * 100)) : 6;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <span
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] font-semibold ${
                    active ? 'text-navy' : 'text-text-3'
                  }`}
                >
                  {d.count}
                </span>
                <div
                  className={`w-full rounded-[4px] transition-all ${
                    active ? 'bg-blue opacity-90' : 'bg-sur-2 border border-bdr'
                  }`}
                  style={{height: `${h}%`}}
                  title={`${d.label}: ${d.count}`}
                />
              </div>
              <span className="font-mono text-[9px] text-text-3">{d.label}</span>
            </div>
          );
        })}
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-pill border border-bdr bg-sur-2 px-2.5 py-[3px] font-mono text-[10px] font-semibold text-text-3">
              მონაცემები ჯერ არ არის
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-bdr pt-2 text-[10px] text-text-3">
        <span>ჯამი: {formatGel(total)}</span>
        <span className="font-mono">max {formatGel(hasData ? max : 0)}</span>
      </div>
    </div>
  );
}

function TopCalcCard({usage}: {usage: {slug: string; count: number}[]}) {
  const top = usage[0];
  const topCalc = top ? CALCULATORS.find((c) => c.slug === top.slug) : null;
  if (!top || !topCalc) {
    return (
      <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
        <p className="text-[11px] font-semibold text-text-2">ყველაზე პოპულარული</p>
        <p className="mt-3 text-[12px] text-text-3">მონაცემი ჯერ არ არის</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">ყველაზე პოპულარული</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[22px]" aria-hidden>
          {topCalc.icon}
        </span>
        <p className="text-[15px] font-bold leading-tight text-navy">{topCalc.title}</p>
      </div>
      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-pill border border-grn-bd bg-grn-lt px-2 py-[2px] font-mono text-[10px] font-bold text-grn">
        ▲ {top.count} / 30 დღე
      </span>
      {topCalc.standard && (
        <p className="mt-2 font-mono text-[10px] text-text-3">{topCalc.standard}</p>
      )}
    </div>
  );
}

function UsageRanking({usage}: {usage: {slug: string; count: number}[]}) {
  if (usage.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
        <p className="text-[11px] font-semibold text-text-2">გამოყენების რეიტინგი</p>
        <p className="mt-3 text-[12px] text-text-3">მონაცემი ჯერ არ არის — კალკულაციები როცა დაიწყება, აქ გამოჩნდება.</p>
      </div>
    );
  }
  const max = Math.max(1, ...usage.map((u) => u.count));
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">გამოყენების რეიტინგი</p>
      <p className="mt-0.5 text-[10px] text-text-3">ბოლო 30 დღის განმავლობაში</p>
      <ul className="mt-3 space-y-2.5">
        {usage.slice(0, 7).map((u, i) => {
          const calc = CALCULATORS.find((c) => c.slug === u.slug);
          const pct = Math.round((u.count / max) * 100);
          return (
            <li key={u.slug}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-text-3">
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm" aria-hidden>
                    {calc?.icon ?? '•'}
                  </span>
                  <span className="truncate text-[12px] font-medium text-text">
                    {calc?.title ?? u.slug}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-text-3">
                  {formatGel(u.count)}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-pill bg-sur-2">
                <div
                  className={i < 3 ? 'h-full bg-blue' : 'h-full bg-blue-bd'}
                  style={{width: `${pct}%`, transition: 'width .3s ease'}}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function HomeStats() {
  const stats = await getHomeStats();
  const cards = buildCards(stats);
  const days =
    stats.pageViewsByDay7d.length === 7
      ? stats.pageViewsByDay7d
      : ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'].map((label) => ({label, count: 0}));

  return (
    <section className="border-t border-bdr bg-bg py-6 md:py-10 lg:py-14">
      <Container>
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-navy">
              USAGE · 30D
            </p>
            <h2 className="mt-0.5 text-[15px] font-bold text-navy md:text-[18px]">
              ხშირად გამოყენებადი კალკულატორები
            </h2>
          </div>
          {!stats.available && (
            <span className="rounded-pill border border-bdr bg-sur-2 px-2 py-[2px] font-mono text-[9px] font-bold text-text-3">
              DB OFFLINE
            </span>
          )}
        </header>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 md:gap-3">
          {cards.map((c) => (
            <StatCardView key={c.title} card={c} />
          ))}
          <TopCalcCard usage={stats.calcUsage30d} />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 md:mt-3 md:grid-cols-12 md:gap-3">
          <div className="md:col-span-7">
            <BarChart days={days} />
          </div>
          <div className="md:col-span-5">
            <UsageRanking usage={stats.calcUsage30d} />
          </div>
        </div>
      </Container>
    </section>
  );
}
