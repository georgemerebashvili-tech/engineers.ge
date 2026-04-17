import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calculator,
  Check,
  FileText,
  HardHat,
  Home,
  Menu,
  Moon,
  Globe,
  Terminal,
  TrendingUp,
  Users,
  Wind,
  X,
  AlertTriangle,
  Flame,
  Snowflake,
  Layers3,
  Ruler,
  Gauge
} from 'lucide-react';

/**
 * Self-contained design preview page at /preview — does not depend on any
 * shared components. Read docs/DESIGN.md + docs/STYLE.md for the rules this
 * demonstrates.
 */
export default function DesignPreview() {
  return (
    <div className="bg-bg">
      <PreviewNav />
      <PreviewHero />
      <KpiStrip />
      <DisciplinesSection />
      <CalculatorsSection />
      <StyleSampler />
      <PreviewFooter />
    </div>
  );
}

// ───────── Container ─────────
function Container({
  className = '',
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1120px] px-4 md:px-5 ${className}`}>
      {children}
    </div>
  );
}

// ───────── Nav ─────────
const NAV_LINKS = ['მთავარი', 'კალკულატორები', 'ცნობარი', 'ბლოგი', 'შესახებ'];

function PreviewNav() {
  return (
    <header className="sticky top-0 z-50 bg-sur shadow-sticky">
      <div className="border-b border-bdr">
        <Container className="flex h-[52px] items-center justify-between">
          <a href="/preview" className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold tracking-[0.02em] text-navy">
              engineers.ge
            </span>
            <span className="hidden font-mono text-[9px] font-normal uppercase tracking-[0.08em] text-text-3 sm:inline">
              ENG TOOLS · KA
            </span>
          </a>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l}
                href="#"
                className="text-xs font-semibold text-text-2 transition-colors hover:text-blue"
              >
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <IconBtn label="Language">
              <Globe size={14} />
            </IconBtn>
            <IconBtn label="Theme">
              <Moon size={14} />
            </IconBtn>
            <button
              aria-label="Menu"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-bdr-2 bg-sur-2 text-text-3 md:hidden"
            >
              <Menu size={14} />
            </button>
          </div>
        </Container>
      </div>
    </header>
  );
}

function IconBtn({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="hidden h-7 w-7 items-center justify-center rounded-[5px] border border-bdr-2 bg-sur-2 text-text-3 transition-colors hover:border-blue hover:text-blue md:inline-flex"
    >
      {children}
    </button>
  );
}

// ───────── Hero ─────────
function PreviewHero() {
  return (
    <section className="bg-sur">
      <Container className="py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-pill border border-blue-bd bg-blue-lt px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-blue">
              <Activity size={10} /> Beta · EN 12831 · 2024
            </div>
            <h1 className="max-w-[28rem] text-2xl font-bold leading-[1.15] tracking-[0.01em] text-navy md:text-[32px]">
              საინჟინრო ხელსაწყოები
              <br />
              <span className="text-text-2">ერთ ინტერფეისში.</span>
            </h1>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-text-2">
              HVAC, თერმოფიზიკა, სამშენებლო კალკულატორები. სტანდარტებზე
              დაფუძნებული, ქართულ ენაზე, სწრაფი და ზუსტი.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a
                href="/heat-loss-calculator.html"
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-blue px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-2"
              >
                გახსენი HVAC კალკულატორი
                <ArrowRight size={14} />
              </a>
              <a
                href="#calculators"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 py-1.5 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
              >
                ყველა ინსტრუმენტი
              </a>
            </div>
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-2 border-t border-bdr pt-4">
              {[
                ['კალკულატორი', '12'],
                ['სტანდარტი', '07'],
                ['მასალა დბ', '240+']
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-text-3">
                    {l}
                  </dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold text-navy">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-card border border-bdr bg-sur shadow-card">
            <div className="flex items-center gap-2 border-b border-bdr bg-sur-2 px-3 py-2">
              <Terminal size={12} className="text-text-3" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
                heat-loss · preview
              </span>
              <span className="ml-auto rounded-pill bg-grn-lt px-2 py-[1px] font-mono text-[9px] font-semibold text-grn">
                OK
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-bdr">
              <PreviewStat label="Q heating" value="4,820" unit="W" tone="ora" />
              <PreviewStat label="Q cooling" value="3,210" unit="W" tone="blue" />
            </div>
            <div className="border-t border-bdr px-3 py-2.5 font-mono text-[11px] leading-[1.8] text-text-2">
              <Formula k="U" v="0.24" u="W/m²K" />
              <Formula k="A" v="128.4" u="m²" />
              <Formula k="ΔT" v="38" u="K" />
              <div className="mt-1 border-t border-bdr pt-1">
                <span className="text-text-3">Q =</span>{' '}
                <span className="font-semibold text-ora">
                  U · A · ΔT = 1,172 W
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PreviewStat({
  label,
  value,
  unit,
  tone
}: {
  label: string;
  value: string;
  unit: string;
  tone: 'ora' | 'blue';
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-text-3">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-lg font-bold ${tone === 'ora' ? 'text-ora' : 'text-blue'}`}
      >
        {value}
        <span className="ml-1 text-[10px] font-medium text-text-3">{unit}</span>
      </div>
    </div>
  );
}

function Formula({k, v, u}: {k: string; v: string; u: string}) {
  return (
    <div>
      <span className="text-text-3">{k}</span>{' '}
      <span className="text-navy">= {v}</span>{' '}
      <span className="text-text-3">{u}</span>
    </div>
  );
}

// ───────── KPI Strip ─────────
const KPIS = [
  {
    label: 'გამოთვლა',
    value: '1,240',
    delta: '+12%',
    icon: Calculator,
    tone: 'navy',
    spark: [8, 10, 9, 12, 14, 13, 16, 18, 17, 20, 22, 24]
  },
  {
    label: 'ვიზიტორი',
    value: '3,480',
    delta: '+8%',
    icon: Users,
    tone: 'blue',
    spark: [6, 8, 10, 9, 11, 13, 14, 12, 15, 17, 18, 20]
  },
  {
    label: 'სტატია',
    value: '156',
    delta: '+3%',
    icon: FileText,
    tone: 'ora',
    spark: [10, 11, 10, 12, 13, 12, 14, 15, 14, 16, 17, 17]
  },
  {
    label: 'გამოწერა',
    value: '24.8k',
    delta: '+15%',
    icon: TrendingUp,
    tone: 'grn',
    spark: [4, 6, 8, 7, 10, 12, 14, 13, 16, 18, 21, 24]
  }
] as const;

const KPI_FILL: Record<(typeof KPIS)[number]['tone'], string> = {
  navy: 'bg-blue-lt text-navy',
  blue: 'bg-blue-lt text-blue',
  ora: 'bg-ora-lt text-ora',
  grn: 'bg-grn-lt text-grn'
};

const KPI_STROKE: Record<(typeof KPIS)[number]['tone'], string> = {
  navy: 'stroke-navy',
  blue: 'stroke-blue',
  ora: 'stroke-ora',
  grn: 'stroke-grn'
};

function Spark({
  data,
  tone
}: {
  data: readonly number[];
  tone: (typeof KPIS)[number]['tone'];
}) {
  const w = 80;
  const h = 26;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        className={KPI_STROKE[tone]}
      />
    </svg>
  );
}

function KpiStrip() {
  return (
    <section className="border-b border-bdr bg-sur-2 py-3 md:py-4">
      <Container>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="flex items-center gap-2 rounded-card border border-bdr bg-sur px-3 py-2.5 shadow-card"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] ${KPI_FILL[k.tone]}`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-base font-semibold leading-none text-navy">
                      {k.value}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold text-grn">
                      <ArrowUpRight size={10} />
                      {k.delta}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-text-3">
                    {k.label}
                  </div>
                </div>
                <Spark data={k.spark} tone={k.tone} />
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

// ───────── Disciplines ─────────
const DISCIPLINES = [
  {
    eyebrow: 'ARCHITECTURE',
    title: 'არქიტექტურა',
    meta: 'მიცემები, ნორმატივები, ტიპოლოგიები',
    icon: Building2,
    tone: 'navy',
    calcCount: 4,
    views: '1.2k',
    growth: '+14%'
  },
  {
    eyebrow: 'MEP ENGINEERING',
    title: 'ინჟინერია',
    meta: 'HVAC, ელექტრო, სანიტარული, BMS',
    icon: Wind,
    tone: 'blue',
    calcCount: 6,
    views: '740',
    growth: '+9%'
  },
  {
    eyebrow: 'INTERIOR DESIGN',
    title: 'ინტერიერი',
    meta: 'მასალები, ტექსტურები, განათება',
    icon: Home,
    tone: 'ora',
    calcCount: 2,
    views: '420',
    growth: '+11%'
  },
  {
    eyebrow: 'STRUCTURAL',
    title: 'კონსტრუქცია',
    meta: 'არმატურა, ბეტონი, ფოლადი, ქანობი',
    icon: HardHat,
    tone: 'grn',
    calcCount: 5,
    views: '880',
    growth: '+7%'
  }
] as const;

type Tone = (typeof DISCIPLINES)[number]['tone'];
const TONE: Record<Tone, {fill: string; bar: string; chipBd: string; chip: string}> = {
  navy: {
    fill: 'bg-blue-lt text-navy',
    bar: 'bg-navy',
    chipBd: 'border-blue-bd',
    chip: 'bg-blue-lt text-navy'
  },
  blue: {
    fill: 'bg-blue-lt text-blue',
    bar: 'bg-blue',
    chipBd: 'border-blue-bd',
    chip: 'bg-blue-lt text-blue'
  },
  ora: {
    fill: 'bg-ora-lt text-ora',
    bar: 'bg-ora',
    chipBd: 'border-ora-bd',
    chip: 'bg-ora-lt text-ora'
  },
  grn: {
    fill: 'bg-grn-lt text-grn',
    bar: 'bg-grn',
    chipBd: 'border-grn-bd',
    chip: 'bg-grn-lt text-grn'
  }
};

function DisciplinesSection() {
  return (
    <section className="py-8 md:py-10">
      <Container>
        <SectionHeader
          eyebrow="DISCIPLINES · 4"
          title="მიმართულებები"
          right={
            <a
              href="#calculators"
              className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue hover:underline"
            >
              ყველა კალკულატორი
              <ArrowRight size={11} />
            </a>
          }
        />

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {DISCIPLINES.map((d) => {
            const Icon = d.icon;
            const t = TONE[d.tone];
            return (
              <a
                key={d.eyebrow}
                href="#"
                className="group relative overflow-hidden rounded-card border border-bdr bg-sur shadow-card transition-colors hover:border-blue"
              >
                <div aria-hidden className={`absolute left-0 top-0 h-full w-[3px] ${t.bar}`} />
                <div className="flex items-start gap-3 p-3.5 pl-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card ${t.fill}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
                        {d.eyebrow}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-pill border px-1.5 py-[1px] font-mono text-[9px] font-bold ${t.chip} ${t.chipBd}`}
                      >
                        <ArrowUpRight size={9} />
                        {d.growth}
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-bold leading-tight text-navy">
                      {d.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-text-2">{d.meta}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-bdr bg-sur-2 px-4 py-2">
                  <div className="flex items-center gap-4">
                    <InlineStat label="კალკულატორი" value={String(d.calcCount)} />
                    <span className="h-3 w-px bg-bdr" />
                    <InlineStat label="ნახვები" value={d.views} />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-blue px-2.5 py-1 font-sans text-[11px] font-semibold text-white transition-colors group-hover:bg-navy-2">
                    შესვლა
                    <ArrowRight size={11} />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function InlineStat({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-text-3">
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold text-navy">{value}</span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  right
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 border-b border-bdr-2 pb-2.5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[15px] font-bold tracking-[0.01em] text-navy md:text-lg">
          {title}
        </h2>
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

// ───────── Calculators ─────────
const CALC_ITEMS = [
  {
    index: '01',
    icon: Flame,
    title: 'თბური დანაკარგები',
    standard: 'EN 12831 · 2024',
    meta: 'ოთახების, ნაგებობის და ცალკეული ელემენტების სითბოს დანაკარგი.',
    status: 'ready',
    href: '/heat-loss-calculator.html'
  },
  {
    index: '02',
    icon: Snowflake,
    title: 'გაცივების დატვირთვა',
    standard: 'ASHRAE CLTD',
    meta: 'მზის რადიაცია, შიდა წყაროები, ადამიანები, ინფილტრაცია.',
    status: 'beta'
  },
  {
    index: '03',
    icon: Wind,
    title: 'სავენტილაციო ჰაერი',
    standard: 'EN 16798-1',
    meta: 'მინიმალური ჰაერის ცვლა, CO₂, IDA კლასი.',
    status: 'beta'
  },
  {
    index: '04',
    icon: Layers3,
    title: 'თერმული კედელი',
    standard: 'U-value · ISO 6946',
    meta: 'შრეების დიზაინი, კონდენსაციის რისკი, dew point.',
    status: 'ready'
  },
  {
    index: '05',
    icon: Ruler,
    title: 'არმატურის მოცულობა',
    standard: 'ÖNORM B4200',
    meta: 'კონსტრუქციული ელემენტების ფოლადის ხარჯი.',
    status: 'soon'
  },
  {
    index: '06',
    icon: Gauge,
    title: 'ბეტონის კუბატურა',
    standard: 'Volume calc',
    meta: 'ფუნდამენტი, ფილა, კოლონა, ბლოკი — ერთი ფორმიდან.',
    status: 'ready'
  }
] as const;

const STATUS: Record<
  (typeof CALC_ITEMS)[number]['status'],
  {label: string; cls: string}
> = {
  ready: {label: 'READY', cls: 'bg-grn-lt text-grn border-grn-bd'},
  beta: {label: 'BETA', cls: 'bg-blue-lt text-blue border-blue-bd'},
  soon: {label: 'SOON', cls: 'bg-ora-lt text-ora border-ora-bd'}
};

function CalculatorsSection() {
  return (
    <section id="calculators" className="py-10 md:py-14">
      <Container>
        <SectionHeader
          eyebrow={`CALCULATORS · ${CALC_ITEMS.length}`}
          title="კალკულატორები"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CALC_ITEMS.map((c) => {
            const Icon = c.icon;
            const s = STATUS[c.status];
            return (
              <a
                key={c.index}
                href={c.href ?? '#'}
                className="group flex flex-col overflow-hidden rounded-card border border-bdr bg-sur shadow-card transition-colors hover:border-blue"
              >
                <div className="flex items-center gap-2 border-b border-bdr bg-gradient-to-r from-sur-2 to-sur px-3 py-2">
                  <span className="rounded-[4px] bg-navy px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.04em] text-white">
                    {c.index}
                  </span>
                  <Icon size={14} className="text-text-3" />
                  <span
                    className={`ml-auto rounded-pill border px-2 py-[1px] font-mono text-[9px] font-bold tracking-[0.04em] ${s.cls}`}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="flex-1 p-3.5">
                  <h3 className="text-[13px] font-bold leading-tight text-navy">
                    {c.title}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] text-text-3">
                    {c.standard}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-2">
                    {c.meta}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-bdr bg-sur-2 px-3 py-1.5">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-text-3">
                    გახსენი
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-text-3 transition-colors group-hover:text-blue"
                  />
                </div>
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

// ───────── Style sampler ─────────
const SWATCHES = [
  {name: 'navy', hex: '#1a3a6b'},
  {name: 'blue', hex: '#1f6fd4'},
  {name: 'ora', hex: '#c05010'},
  {name: 'grn', hex: '#0f6e3a'},
  {name: 'red', hex: '#c0201a'},
  {name: 'bg', hex: '#f2f5fa'},
  {name: 'sur', hex: '#ffffff'},
  {name: 'bdr', hex: '#dde6f2'}
];

function StyleSampler() {
  return (
    <section className="border-t border-bdr bg-sur-2 py-10 md:py-14">
      <Container>
        <SectionHeader
          eyebrow="DESIGN SYSTEM · v0.1"
          title="სტილის წესები"
          right={
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
              docs/DESIGN.md
            </span>
          }
        />
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Palette">
            <div className="grid grid-cols-4 gap-1.5">
              {SWATCHES.map((s) => (
                <div key={s.name} className="text-center">
                  <div
                    className="h-10 w-full rounded-[5px] border border-bdr"
                    style={{background: s.hex}}
                  />
                  <div className="mt-1 font-mono text-[9px] font-semibold text-navy">
                    {s.name}
                  </div>
                  <div className="font-mono text-[9px] text-text-3">{s.hex}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Typography">
            <div className="space-y-1.5">
              <Row k={<span className="text-[32px] font-bold leading-none tracking-[0.01em] text-navy">Aa32</span>} v="hero · sans 700" />
              <Row k={<span className="text-lg font-bold text-navy">Aa18</span>} v="section · sans 700" />
              <Row k={<span className="text-[13px] text-text">Aa13 body</span>} v="base · sans 400" />
              <Row k={<span className="font-mono text-[11px] text-navy">1,234.56</span>} v="data · mono 500" />
              <Row k={<span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">LABEL</span>} v="label · mono 700" />
            </div>
          </Card>

          <Card title="Buttons">
            <div className="flex flex-wrap gap-1.5">
              <button className="rounded-[6px] bg-blue px-3.5 py-1.5 text-xs font-semibold text-white">
                Primary
              </button>
              <button className="rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 py-1.5 text-xs font-semibold text-text-2">
                Secondary
              </button>
              <button className="rounded-[4px] border border-[#f8a0a0] bg-red-lt px-2 py-0.5 text-[11px] font-semibold text-red">
                Danger
              </button>
              <button className="rounded-[5px] border-[1.5px] border-dashed border-bdr-2 bg-transparent px-2.5 py-0.5 text-[11px] font-semibold text-text-2">
                + Add
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Badge cls="border-grn-bd bg-grn-lt text-grn">OK</Badge>
              <Badge cls="border-blue-bd bg-blue-lt text-blue">BETA</Badge>
              <Badge cls="border-ora-bd bg-ora-lt text-ora">SOON</Badge>
            </div>
          </Card>

          <Card title="Inputs">
            <div className="space-y-2">
              <div>
                <Label>ტექსტური</Label>
                <input
                  type="text"
                  defaultValue="საცხოვრებელი სახლი"
                  className="mt-0.5 w-full rounded-[5px] border-[1.5px] border-bdr bg-white px-2.5 py-1.5 font-sans text-[13px] text-text outline-none focus:border-blue"
                />
              </div>
              <div className="flex gap-2">
                <NumInput label="U-value" value="0.24" unit="W/m²K" />
                <NumInput label="ΔT" value="38" unit="K" />
              </div>
            </div>
          </Card>

          <Card title="Spacing · 4px base">
            <div className="space-y-1">
              {[
                ['2', '8px', 'inner row gap'],
                ['3.5', '14px', 'card padding'],
                ['5', '20px', 'section h-pad'],
                ['10', '40px', 'section narrow'],
                ['14', '56px', 'section max']
              ].map(([token, px, role]) => (
                <div key={token} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="bg-blue-lt"
                    style={{width: px, height: 8, display: 'inline-block'}}
                  />
                  <span className="font-mono text-[10px] font-semibold text-navy">
                    {token}
                  </span>
                  <span className="font-mono text-[10px] text-text-3">{px}</span>
                  <span className="text-text-2">{role}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Do / Don't">
            <ul className="space-y-1 text-[11px]">
              <Rule ok>Container ≤ 1120px</Rule>
              <Rule ok>Numbers / inputs → mono, right-align</Rule>
              <Rule ok>Navy primary · blue interactive</Rule>
              <Rule ok>Subtle 1px borders + micro shadow</Rule>
              <Rule warn>Base font 13px (not 16)</Rule>
              <Rule bad>Hero &gt; 440px</Rule>
              <Rule bad>Gradient / glow buttons</Rule>
              <Rule bad>Radius &gt; 12px (except pill)</Rule>
              <Rule bad>Red/Orange as decorative accent</Rule>
            </ul>
          </Card>
        </div>
      </Container>
    </section>
  );
}

function Card({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-bdr bg-sur p-3.5 shadow-card">
      <h3 className="mb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({k, v}: {k: React.ReactNode; v: string}) {
  return (
    <div className="flex items-baseline justify-between border-b border-bdr pb-1 last:border-b-0 last:pb-0">
      <span>{k}</span>
      <span className="font-mono text-[10px] text-text-3">{v}</span>
    </div>
  );
}

function Badge({cls, children}: {cls: string; children: React.ReactNode}) {
  return (
    <span
      className={`rounded-pill border px-2 py-[1px] text-center font-mono text-[9px] font-bold ${cls}`}
    >
      {children}
    </span>
  );
}

function Label({children}: {children: React.ReactNode}) {
  return (
    <label className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-text-3">
      {children}
    </label>
  );
}

function NumInput({
  label,
  value,
  unit
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex-1">
      <Label>{label}</Label>
      <div className="mt-0.5 flex items-center gap-1">
        <input
          type="number"
          defaultValue={value}
          className="w-full rounded-[4px] border-[1.5px] border-bdr bg-white px-1.5 py-0.5 text-right font-mono text-[11px] font-medium text-text outline-none focus:border-blue"
        />
        <span className="font-mono text-[9px] text-text-3">{unit}</span>
      </div>
    </div>
  );
}

function Rule({
  ok,
  warn,
  bad,
  children
}: {
  ok?: boolean;
  warn?: boolean;
  bad?: boolean;
  children: React.ReactNode;
}) {
  const Icon = ok ? Check : bad ? X : AlertTriangle;
  const color = ok ? 'text-grn' : bad ? 'text-red' : 'text-ora';
  return (
    <li className="flex items-start gap-1.5 text-text-2">
      <Icon size={12} className={`mt-0.5 shrink-0 ${color}`} />
      <span>{children}</span>
    </li>
  );
}

// ───────── Footer ─────────
function PreviewFooter() {
  return (
    <footer className="mt-10 border-t border-bdr bg-sur">
      <Container className="py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {[
            {title: 'engineers.ge', lines: ['საინჟინრო ხელსაწყოები', 'ქართულ ენაზე.']},
            {title: 'ნავიგაცია', links: ['მთავარი', 'კალკულატორები', 'ცნობარი', 'ბლოგი']},
            {
              title: 'კალკულატორები',
              links: ['თბური დანაკარგი', 'თერმული კედელი', 'ბეტონი', 'სავენტილაციო']
            },
            {
              title: 'კონტაქტი',
              links: ['info@engineers.ge', 'Facebook', 'LinkedIn', 'Telegram']
            }
          ].map((col) => (
            <div key={col.title}>
              <h4 className="mb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-3">
                {col.title}
              </h4>
              {col.lines ? (
                <div className="space-y-0.5 text-[11px] text-text-2">
                  {col.lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1 text-[11px] text-text-2">
                  {col.links?.map((l) => (
                    <li key={l}>
                      <a href="#" className="transition-colors hover:text-blue">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Container>
      <div className="border-t border-bdr bg-sur-2">
        <Container className="flex flex-col gap-1 py-2.5 text-[10px] text-text-3 md:flex-row md:items-center md:justify-between">
          <p>© 2026 engineers.ge · ყველა უფლება დაცულია</p>
          <p className="font-mono">v0.1.0 · preview · Next.js · Vercel</p>
        </Container>
      </div>
    </footer>
  );
}
