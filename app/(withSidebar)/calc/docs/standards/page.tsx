import type {Metadata} from 'next';
import Link from 'next/link';
import {BookOpen, ExternalLink, ShieldCheck, Flame, Wind, Thermometer} from 'lucide-react';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {Container} from '@/components/container';

export const metadata: Metadata = {
  title: 'სტანდარტები · Standards Reference',
  description: 'საინჟინრო სტანდარტების საცნობარო — EN 12101-6, NFPA 92, ASHRAE 62.1, ISO 6946, EN 12831, СП 7.13130 — სახანძრო ვენტილაცია, თბოგადაცემა, HVAC',
  keywords: [
    'სტანდარტი',
    'EN 12101-6',
    'NFPA 92',
    'ASHRAE 62.1',
    'ISO 6946',
    'EN 12831',
    'СП 7.13130',
    'matsne',
    'ტექრეგლამენტი',
    'engineers.ge'
  ],
  alternates: {canonical: '/calc/docs/standards'},
  openGraph: {
    type: 'article',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'სტანდარტები · Standards Reference — engineers.ge',
    description: 'საინჟინრო სტანდარტების საცნობარო — EN / NFPA / ASHRAE / ISO / СП',
    url: '/calc/docs/standards'
  }
};

type Standard = {
  code: string;
  title_ka: string;
  title_en: string;
  scope: string;
  body: string;
  year?: string;
  url?: string;
  appliesTo: Array<{label: string; href: string}>;
};

type Category = {
  key: string;
  title: string;
  icon: React.ComponentType<{size?: number; strokeWidth?: number; className?: string}>;
  color: string;
  standards: Standard[];
};

const CATEGORIES: Category[] = [
  {
    key: 'fire-safety',
    title: 'სახანძრო სისტემები',
    icon: Flame,
    color: '#c0201a',
    standards: [
      {
        code: 'EN 12101-6',
        title_ka: 'კიბის სათავსო კონტროლის სისტემები — Pressurization Systems',
        title_en: 'Smoke and heat control systems — Part 6: Specification for pressure differential systems',
        scope: 'EU · UK',
        body: 'CEN',
        year: '2022',
        url: 'https://www.en-standard.eu/bs-en-12101-6-2022',
        appliesTo: [
          {label: 'სადარბაზოს დაწნეხვა', href: '/calc/stair-pressurization'},
          {label: 'ლიფტის შახტი', href: '/calc/elevator-shaft-press'},
          {label: 'კორიდორის დაწნეხვა', href: '/calc/floor-pressurization'}
        ]
      },
      {
        code: 'NFPA 92',
        title_ka: 'კვამლის კონტროლის სისტემები',
        title_en: 'Standard for Smoke Control Systems',
        scope: 'USA',
        body: 'NFPA',
        year: '2024',
        url: 'https://www.nfpa.org/codes-and-standards/nfpa-92-standard-development/92',
        appliesTo: [
          {label: 'სადარბაზოს დაწნეხვა', href: '/calc/stair-pressurization'},
          {label: 'პარკინგის smoke extract', href: '/calc/parking-ventilation'}
        ]
      },
      {
        code: 'EN 12101-3',
        title_ka: 'ვენტილატორები სახანძრო მიზნებისთვის',
        title_en: 'Smoke and heat control systems — Part 3: Specification for powered smoke and heat exhaust ventilators',
        scope: 'EU',
        body: 'CEN',
        year: '2015',
        appliesTo: [
          {label: 'პარკინგის ვენტილაცია', href: '/calc/parking-ventilation'}
        ]
      },
      {
        code: 'СП 7.13130',
        title_ka: 'გათბობა, ვენტილაცია, კონდიცირება — სახანძრო მოთხოვნები',
        title_en: 'Heating, ventilation and air conditioning — Fire safety requirements',
        scope: 'RU · EAEU',
        body: 'МЧС России',
        year: '2013',
        appliesTo: [
          {label: 'სადარბაზოს დაწნეხვა', href: '/calc/stair-pressurization'},
          {label: 'კორიდორის დაწნეხვა', href: '/calc/floor-pressurization'}
        ]
      }
    ]
  },
  {
    key: 'hvac',
    title: 'ვენტილაცია და HVAC',
    icon: Wind,
    color: '#1f6fd4',
    standards: [
      {
        code: 'ASHRAE 62.1',
        title_ka: 'ვენტილაცია — სხვა-საცხოვრებელი შენობებისთვის',
        title_en: 'Ventilation for Acceptable Indoor Air Quality',
        scope: 'USA · ინტერნაციონალური',
        body: 'ASHRAE',
        year: '2022',
        url: 'https://www.ashrae.org/technical-resources/bookstore/standards-62-1-62-2',
        appliesTo: [
          {label: 'HVAC კალკულატორი', href: '/calc/hvac'},
          {label: 'AHU · ASHRAE რეპორტი', href: '/calc/ahu-ashrae'},
          {label: 'პარკინგის ვენტილაცია', href: '/calc/parking-ventilation'}
        ]
      },
      {
        code: 'EN 16798-1',
        title_ka: 'შიდა ჰაერის ხარისხი და ენერგო-ეფექტურობა',
        title_en: 'Energy performance of buildings — Ventilation for buildings',
        scope: 'EU',
        body: 'CEN',
        year: '2019',
        appliesTo: [
          {label: 'HVAC კალკულატორი', href: '/calc/hvac'},
          {label: 'AHU · ASHRAE რეპორტი', href: '/calc/ahu-ashrae'}
        ]
      },
      {
        code: 'ISO 7235',
        title_ka: 'აკუსტიკა — ხმაურდამხშობების ტესტირება',
        title_en: 'Acoustics — Laboratory measurement procedures for ducted silencers',
        scope: 'ISO · ინტერნაციონალური',
        body: 'ISO',
        year: '2003',
        appliesTo: [
          {label: 'ხმაურდამხშობი სელექშენი', href: '/calc/silencer'},
          {label: 'KAYA სელექცია', href: '/calc/silencer-kaya'}
        ]
      }
    ]
  },
  {
    key: 'thermal',
    title: 'თბოგადაცემა · თბოდანაკარგები',
    icon: Thermometer,
    color: '#c05010',
    standards: [
      {
        code: 'ISO 6946',
        title_ka: 'შენობის კომპონენტები — თბური წინაღობა და თბოგადაცემის კოეფიციენტი',
        title_en: 'Building components and building elements — Thermal resistance and thermal transmittance',
        scope: 'ISO · ინტერნაციონალური',
        body: 'ISO',
        year: '2017',
        appliesTo: [
          {label: 'კედლის U-ფაქტორი', href: '/calc/wall-thermal'}
        ]
      },
      {
        code: 'ISO 13788',
        title_ka: 'შენობის კომპონენტები — კონდენსაციის რისკის შეფასება',
        title_en: 'Hygrothermal performance of building components',
        scope: 'ISO',
        body: 'ISO',
        year: '2012',
        appliesTo: [
          {label: 'კედლის U-ფაქტორი (Glaser)', href: '/calc/wall-thermal'}
        ]
      },
      {
        code: 'EN 12831-1',
        title_ka: 'შენობის თბური დატვირთვის გამოთვლა',
        title_en: 'Energy performance of buildings — Method for calculation of the design heat load',
        scope: 'EU',
        body: 'CEN',
        year: '2017',
        appliesTo: [
          {label: 'თბოდანაკარგები', href: '/calc/heat-loss'}
        ]
      }
    ]
  }
];

const GEORGIA_SOURCES = [
  {
    title: 'სამშენებლო უსაფრთხოების ტექნიკური რეგლამენტი',
    body: 'matsne.gov.ge',
    url: 'https://matsne.gov.ge/',
    note: 'მიზანმიმართული Google-ის ძებნა "სამშენებლო ნორმები" matsne-ზე'
  },
  {
    title: 'სახანძრო უსაფრთხოების ტექნიკური რეგლამენტი',
    body: 'matsne.gov.ge',
    url: 'https://matsne.gov.ge/',
    note: 'საქართველოს მთავრობის განკარგულებები — სახანძრო ნორმები'
  }
];

export default function StandardsPage() {
  const total = CATEGORIES.reduce((n, c) => n + c.standards.length, 0);
  return (
    <Container className="py-6 md:py-8">
      <Breadcrumbs className="mb-3" items={[{label: 'დოკუმენტაცია'}, {label: 'სტანდარტები'}]} />

      <header className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          <ShieldCheck size={11} /> STANDARDS REFERENCE
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          საინჟინრო სტანდარტების საცნობარო
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-2">
          {total} სტანდარტი, რომელთაც engineers.ge-ის კალკულატორები ეყრდნობა. კოდი, სახელი, scope, გამომცემელი და რომელ ხელსაწყოზე ეხება — ერთ სიაზე.
        </p>
        <p className="mt-1.5 font-mono text-[10px] text-text-3">
          ბოლო განახლება: 2026-04-20 · ⚠ ინფორმაცია საცნობაროა; ოფიციალური ცნობები სტანდარტ-გამომცემლის საიტიდან დაადასტურე.
        </p>
      </header>

      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <section key={cat.key}>
              <div className="mb-3 flex items-center gap-2 border-b border-bdr pb-2">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px]"
                  style={{
                    background: `color-mix(in srgb, ${cat.color} 12%, var(--sur))`,
                    color: cat.color
                  }}
                  aria-hidden
                >
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <h2 className="text-lg font-bold text-navy md:text-xl">{cat.title}</h2>
                <span className="ml-auto font-mono text-[10px] text-text-3">
                  {cat.standards.length}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {cat.standards.map((s) => (
                  <article
                    key={s.code}
                    className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold"
                        style={{
                          borderColor: `color-mix(in srgb, ${cat.color} 30%, transparent)`,
                          background: `color-mix(in srgb, ${cat.color} 8%, var(--sur))`,
                          color: cat.color
                        }}
                      >
                        {s.code}
                      </span>
                      {s.year && (
                        <span className="font-mono text-[10px] text-text-3">{s.year}</span>
                      )}
                    </div>
                    <h3 className="mb-1 text-[13px] font-bold leading-snug text-navy">
                      {s.title_ka}
                    </h3>
                    <p className="mb-2 text-[11px] leading-relaxed text-text-3">
                      {s.title_en}
                    </p>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[11px] text-text-2">
                      <span>
                        <span className="font-mono text-[10px] text-text-3">body:</span>{' '}
                        {s.body}
                      </span>
                      <span className="text-bdr-2">·</span>
                      <span>
                        <span className="font-mono text-[10px] text-text-3">scope:</span>{' '}
                        {s.scope}
                      </span>
                      {s.url && (
                        <>
                          <span className="text-bdr-2">·</span>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue hover:text-navy-2"
                          >
                            წყარო <ExternalLink size={10} />
                          </a>
                        </>
                      )}
                    </div>
                    <div className="border-t border-bdr pt-2">
                      <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-text-3">
                        ეხება ხელსაწყოებს
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.appliesTo.map((a) => (
                          <Link
                            key={a.href}
                            href={a.href}
                            className="inline-flex items-center gap-1 rounded-full border border-bdr bg-sur-2 px-2 py-0.5 text-[10.5px] text-text-2 transition-colors hover:border-blue hover:text-blue"
                          >
                            {a.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <section>
          <div className="mb-3 flex items-center gap-2 border-b border-bdr pb-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-grn-lt text-grn"
              aria-hidden
            >
              <BookOpen size={16} strokeWidth={1.8} />
            </span>
            <h2 className="text-lg font-bold text-navy md:text-xl">ქართული წყაროები</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {GEORGIA_SOURCES.map((src) => (
              <a
                key={src.title}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5 transition-colors hover:border-blue"
              >
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="flex-1 text-[13px] font-bold text-navy group-hover:text-blue">
                    {src.title}
                  </h3>
                  <ExternalLink
                    size={12}
                    className="text-text-3 group-hover:text-blue"
                    aria-hidden
                  />
                </div>
                <div className="font-mono text-[10px] text-text-3">{src.body}</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-text-2">{src.note}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt p-4">
          <h2 className="mb-1 text-[13px] font-bold text-blue">დამატებითი საცნობარო</h2>
          <p className="text-[12px] leading-relaxed text-text-2">
            ფორმულები, რომლებიც ამ სტანდარტებიდან გამომდინარეობს —{' '}
            <Link href="/calc/docs/physics" className="font-semibold text-blue hover:underline">
              /calc/docs/physics
            </Link>
            . ფორმულებს ახლავს KaTeX-ით რენდერი და კოდის მაგალითები.
          </p>
        </section>
      </div>
    </Container>
  );
}
