import Link from 'next/link';
import {
  ArrowUpRight,
  Flame,
  Wind,
  Snowflake,
  Siren,
  Layers,
  Thermometer,
  Gauge,
  type LucideIcon
} from 'lucide-react';
import {Container} from './container';
import {CalcCardExternal} from './calc-card-external';

type System = {
  slug: string;
  icons: {icon: LucideIcon; color: string}[];
  title: string;
  desc: string;
  toolsCount: number;
  href: string | null;
  accent: string;
  externalHtml?: string;
};

const SYSTEMS: System[] = [
  {
    slug: 'heating-cooling',
    icons: [
      {icon: Flame, color: 'var(--ora)'},
      {icon: Snowflake, color: 'var(--blue)'}
    ],
    title: 'გათბობა · კონდიცირება',
    desc: 'HVAC cooling/heating load, FCU/VRV, chiller + boiler სელექცია',
    toolsCount: 1,
    href: '/calc/hvac',
    accent: 'var(--ora)'
  },
  {
    slug: 'ventilation',
    icons: [{icon: Wind, color: 'var(--blue)'}],
    title: 'ვენტილაცია',
    desc: 'AHU სელექცია, ASHRAE 62.1, duct sizing, heat recovery',
    toolsCount: 1,
    href: '/calc/ahu-ashrae',
    accent: 'var(--blue)'
  },
  {
    slug: 'fire-safety',
    icons: [{icon: Siren, color: 'var(--red)'}],
    title: 'სახანძრო სისტემები',
    desc: 'EN 12101, კვამლის გაწოვა, კიბის ზეწოლა, sprinkler',
    toolsCount: 0,
    href: null,
    accent: 'var(--red)'
  },
  {
    slug: 'wall-thermal',
    icons: [{icon: Layers, color: 'var(--navy)'}],
    title: 'თბოგადაცემის კოეფიციენტის გაანგარიშება',
    desc: 'ISO 6946 U-ფაქტორი, multilayer, კონდენსაცია, Glaser',
    toolsCount: 1,
    href: '/calc/wall-thermal',
    accent: 'var(--navy)',
    externalHtml: '/calc/heat-transfer.html'
  },
  {
    slug: 'heat-loss',
    icons: [{icon: Thermometer, color: 'var(--ora)'}],
    title: 'თბოდანაკარგები',
    desc: 'EN 12831 · building heat load, zone-by-zone, PDF report',
    toolsCount: 1,
    href: '/calc/heat-loss',
    accent: 'var(--ora)',
    externalHtml: '/calc/heat-transfer.html'
  },
  {
    slug: 'fluid-dynamics',
    icons: [{icon: Gauge, color: 'var(--grn)'}],
    title: 'ჰიდრავლიკა · აეროდინამიკა',
    desc: 'Pipe/duct sizing, pressure drop, ხმაურდამხშობი, Reynolds',
    toolsCount: 2,
    href: '/calc/silencer',
    accent: 'var(--grn)'
  }
];

const totalTools = SYSTEMS.reduce((s, x) => s + x.toolsCount, 0);

export function CalcGrid() {
  return (
    <section id="calculators" className="pt-2 pb-4 md:pt-3 md:pb-5">
      <Container>
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
              საინჟინრო მიმართულებები
            </h2>
          </div>
          <div className="text-2xl text-text-3 font-mono">
            {SYSTEMS.length} სისტემა · {totalTools} აქტიური ხელსაწყო
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((s) => {
            const active = s.toolsCount > 0 && !!s.href;
            const card = (
              <div
                className={`group relative h-full bg-sur border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] transition-all ${
                  active ? 'hover:border-blue hover:-translate-y-0.5' : 'opacity-80'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {s.icons.map(({icon: Icon, color}, idx) => (
                      <span
                        key={idx}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border"
                        style={{
                          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                          background: `color-mix(in srgb, ${color} 12%, var(--sur))`,
                          color
                        }}
                        aria-hidden
                      >
                        <Icon size={20} strokeWidth={1.75} />
                      </span>
                    ))}
                  </div>
                  {active ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue bg-blue-lt border border-blue-bd rounded-full px-2 py-0.5">
                      {s.toolsCount} ხელსაწყო
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-3 bg-sur-2 border rounded-full px-2 py-0.5">
                      მალე
                    </span>
                  )}
                </div>
                <h3 className={`text-base font-bold text-navy mb-1.5 ${active ? 'group-hover:text-blue' : ''} transition-colors`}>
                  {s.title}
                </h3>
                <p className="text-xs text-text-2 leading-relaxed mb-3 line-clamp-2">
                  {s.desc}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-bdr">
                  <span className="text-[9px] text-text-3 font-mono uppercase tracking-wider">
                    {s.slug}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className={`${active ? 'text-text-3 group-hover:text-blue' : 'text-bdr-2'} transition-colors`}
                  />
                </div>
              </div>
            );

            if (active && s.externalHtml) {
              return (
                <CalcCardExternal key={s.slug} href={s.externalHtml} slug={s.slug}>
                  {card}
                </CalcCardExternal>
              );
            }
            if (active && s.href) {
              return (
                <Link key={s.slug} href={s.href} className="block h-full">
                  {card}
                </Link>
              );
            }
            return (
              <div key={s.slug} className="block h-full cursor-not-allowed" aria-disabled>
                {card}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
