import type {Metadata} from 'next';
import Link from 'next/link';
import {
  Flame,
  Wind,
  Siren,
  Layers,
  Thermometer,
  Gauge,
  Ruler,
  Building2,
  BookOpen,
  Coins,
  ArrowUpRight,
  Home as HomeIcon,
  Sparkles,
  Tag
} from 'lucide-react';
import {Container} from '@/components/container';
import {CALCULATORS, getCalc} from '@/lib/calculators';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'engineers.ge კაბინეტი — საინჟინრო ხელსაწყოები, პროექტები, referral ბალანსი',
  alternates: {canonical: '/dashboard'},
  robots: {index: false, follow: true}
};

type Section = {
  key: string;
  title: string;
  icon: React.ComponentType<{size?: number; strokeWidth?: number; className?: string}>;
  color: string;
  slugs: string[];
};

const SECTIONS: Section[] = [
  {
    key: 'fire-safety',
    title: 'სახანძრო სისტემები',
    icon: Siren,
    color: '#c0201a',
    slugs: ['stair-pressurization', 'elevator-shaft-press', 'parking-ventilation', 'floor-pressurization']
  },
  {
    key: 'thermal',
    title: 'თერმული სისტემები',
    icon: Thermometer,
    color: '#c05010',
    slugs: ['heat-loss', 'wall-thermal', 'hvac']
  },
  {
    key: 'ventilation',
    title: 'ვენტილაცია და აკუსტიკა',
    icon: Wind,
    color: '#1f6fd4',
    slugs: ['ahu-ashrae', 'silencer', 'silencer-kaya']
  },
  {
    key: 'cad',
    title: 'CAD · გეგმები',
    icon: Ruler,
    color: '#0f6e3a',
    slugs: ['wall-editor', 'building-composer', 'ifc-viewer']
  }
];

const QUICK_ACTIONS = [
  {
    href: '/calc/wall-editor',
    icon: Ruler,
    title: 'ახალი გეგმა',
    desc: 'დახატე კედლები, ოთახები, ფანჯრები',
    color: 'var(--blue)',
    bg: 'var(--blue-lt)'
  },
  {
    href: '/calc/heat-loss',
    icon: Flame,
    title: 'თბოდანაკარგი',
    desc: 'EN 12831 · შენობის სითბური დატვირთვა',
    color: 'var(--ora)',
    bg: 'var(--ora-lt)'
  },
  {
    href: '/calc/stair-pressurization',
    icon: Siren,
    title: 'სადარბაზოს დაწნეხვა',
    desc: 'EN 12101-6 · 3D სიმულაცია',
    color: 'var(--red)',
    bg: 'var(--red-lt)'
  },
  {
    href: '/dashboard/referrals',
    icon: Coins,
    title: 'მოიწვიე · 3000₾',
    desc: 'referral პროგრამა',
    color: 'var(--grn)',
    bg: 'var(--grn-lt)'
  }
];

export default function DashboardPage() {
  return (
    <Container className="py-6 md:py-8">
      <header className="mb-6">
        <div className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          <HomeIcon size={11} /> DASHBOARD
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          მოგესალმები — engineers.ge
        </h1>
        <p className="mt-1 text-sm text-text-2">
          {CALCULATORS.length} საინჟინრო ხელსაწყო, უფასო და ქართულად. აირჩიე ქვემოთ ან გამოიყენე მარცხენა მენიუ.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-3 font-mono">
          სწრაფი დაწყება
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5 transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-[var(--shadow-card)]"
              >
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{background: a.bg, color: a.color}}
                  aria-hidden
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-bold text-navy group-hover:text-blue">
                    {a.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-text-3 line-clamp-2">{a.desc}</p>
                </div>
                <ArrowUpRight
                  size={14}
                  className="shrink-0 text-text-3 transition-colors group-hover:text-blue"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-3 font-mono">
          ყველა ხელსაწყო კატეგორიებად
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const items = s.slugs.map((slug) => getCalc(slug)).filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div
                key={s.key}
                className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5"
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px]"
                    style={{background: `color-mix(in srgb, ${s.color} 12%, var(--sur))`, color: s.color}}
                    aria-hidden
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <h3 className="text-sm font-bold text-navy">{s.title}</h3>
                  <span className="ml-auto font-mono text-[10px] text-text-3">
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((c) => (
                    <li key={c!.slug}>
                      <Link
                        href={`/calc/${c!.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-text-2 transition-colors hover:bg-sur-2 hover:text-blue"
                      >
                        <span className="truncate">
                          <span aria-hidden className="mr-1">
                            {c!.icon}
                          </span>
                          {c!.title}
                        </span>
                        {c!.standard && (
                          <span className="shrink-0 font-mono text-[9px] text-text-3">
                            {c!.standard}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/calc/docs/physics"
          className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5 transition-colors hover:border-blue"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-blue-lt text-blue" aria-hidden>
            <BookOpen size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-bold text-navy group-hover:text-blue">ფორმულები</h3>
            <p className="mt-0.5 text-[11px] text-text-3">EN / NFPA / ASHRAE / ISO საცნობარო</p>
          </div>
        </Link>
        <Link
          href="/promotions"
          className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5 transition-colors hover:border-blue"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-ora-lt text-ora" aria-hidden>
            <Tag size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-bold text-navy group-hover:text-blue">აქციები</h3>
            <p className="mt-0.5 text-[11px] text-text-3">მიმდინარე შეთავაზებები</p>
          </div>
        </Link>
        <Link
          href="/dashboard/referrals"
          className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5 transition-colors hover:border-blue"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-grn-lt text-grn" aria-hidden>
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-bold text-navy group-hover:text-blue">Referral</h3>
            <p className="mt-0.5 text-[11px] text-text-3">მოიწვიე კოლეგა · იშოვე 10₾</p>
          </div>
        </Link>
      </section>
    </Container>
  );
}
