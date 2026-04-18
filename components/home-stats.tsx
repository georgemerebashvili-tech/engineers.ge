import {Container} from './container';
import {CALCULATORS} from '@/lib/calculators';
import {formatGel} from '@/lib/hero-ads';

type StatCard = {
  title: string;
  value: string;
  interval: string;
  trend: 'up' | 'down' | 'neutral';
  series: number[];
};

const statCards: StatCard[] = [
  {
    title: 'უნიკალური ვიზიტორები',
    value: '14k',
    interval: 'ბოლო 30 დღე',
    trend: 'up',
    series: [
      200, 240, 220, 260, 240, 380, 300, 340, 380, 420, 400, 460, 480, 520, 540,
      560, 600, 640, 680, 720, 760, 800, 820, 840, 860, 890, 910, 940, 980, 1020
    ]
  },
  {
    title: 'კალკულაციები',
    value: '2,418',
    interval: 'ბოლო 30 დღე',
    trend: 'up',
    series: [
      40, 52, 48, 61, 55, 70, 63, 58, 72, 66, 80, 75, 82, 78, 85, 91, 86, 94,
      88, 102, 96, 108, 104, 115, 110, 120, 118, 125, 130, 138
    ]
  },
  {
    title: 'აქტიური კალკულატორი',
    value: `${CALCULATORS.length}`,
    interval: 'ხელმისაწვდომი',
    trend: 'neutral',
    series: Array(30).fill(7)
  }
];

const calcUsage = [
  {slug: 'heat-loss', count: 892, pct: 37},
  {slug: 'wall-thermal', count: 523, pct: 22},
  {slug: 'hvac', count: 412, pct: 17},
  {slug: 'silencer', count: 256, pct: 11},
  {slug: 'ahu-ashrae', count: 198, pct: 8},
  {slug: 'silencer-kaya', count: 85, pct: 4},
  {slug: 'procurement', count: 52, pct: 2}
] as const;

function Sparkline({series, trend}: {series: number[]; trend: StatCard['trend']}) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  const step = series.length > 1 ? w / (series.length - 1) : 0;
  const points = series
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color =
    trend === 'up' ? 'var(--grn)' : trend === 'down' ? 'var(--red)' : 'var(--text-3)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
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
      <div className="mt-2 flex-1">
        <Sparkline series={card.series} trend={card.trend} />
      </div>
    </div>
  );
}

function BarChart() {
  const labels = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
  const data = [820, 1120, 940, 1340, 1080, 620, 480];
  const max = Math.max(...data);
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">გვერდების ნახვები</p>
      <p className="mt-0.5 text-[10px] text-text-3">ბოლო 7 დღე</p>
      <div className="mt-3 flex h-40 items-end gap-2">
        {data.map((v, i) => {
          const h = Math.round((v / max) * 100);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-[4px] bg-blue"
                style={{height: `${h}%`, opacity: 0.85}}
                title={`${labels[i]}: ${v}`}
              />
              <span className="font-mono text-[9px] text-text-3">{labels[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-bdr pt-2 text-[10px] text-text-3">
        <span>ჯამი: {formatGel(data.reduce((a, b) => a + b, 0))}</span>
        <span className="font-mono">max {formatGel(max)}</span>
      </div>
    </div>
  );
}

function TopCalcCard() {
  const topCalc = CALCULATORS.find((c) => c.slug === calcUsage[0].slug);
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">ყველაზე პოპულარული</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[22px]" aria-hidden>
          {topCalc?.icon}
        </span>
        <p className="text-[15px] font-bold leading-tight text-navy">
          {topCalc?.title ?? 'თბოდანაკარგი'}
        </p>
      </div>
      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-pill border border-grn-bd bg-grn-lt px-2 py-[2px] font-mono text-[10px] font-bold text-grn">
        ▲ {calcUsage[0].count} / 30 დღე
      </span>
      {topCalc?.standard && (
        <p className="mt-2 font-mono text-[10px] text-text-3">{topCalc.standard}</p>
      )}
    </div>
  );
}

function UsageRanking() {
  return (
    <div className="flex h-full flex-col rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <p className="text-[11px] font-semibold text-text-2">გამოყენების რეიტინგი</p>
      <p className="mt-0.5 text-[10px] text-text-3">ბოლო 30 დღის განმავლობაში</p>
      <ul className="mt-3 space-y-2.5">
        {calcUsage.map((u, i) => {
          const calc = CALCULATORS.find((c) => c.slug === u.slug);
          return (
            <li key={u.slug}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-text-3">
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm" aria-hidden>
                    {calc?.icon}
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
                  style={{width: `${u.pct}%`, transition: 'width .3s ease'}}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HomeStats() {
  return (
    <section className="border-t border-bdr bg-bg py-10 md:py-14">
      <Container>
        <header className="mb-4">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-navy">
            USAGE · 30D
          </p>
          <h2 className="mt-0.5 text-[15px] font-bold text-navy md:text-[18px]">
            ხშირად გამოყენებადი კალკულატორები
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 md:gap-3">
          {statCards.map((c) => (
            <StatCardView key={c.title} card={c} />
          ))}
          <TopCalcCard />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 md:mt-3 md:grid-cols-12 md:gap-3">
          <div className="md:col-span-7">
            <BarChart />
          </div>
          <div className="md:col-span-5">
            <UsageRanking />
          </div>
        </div>
      </Container>
    </section>
  );
}
