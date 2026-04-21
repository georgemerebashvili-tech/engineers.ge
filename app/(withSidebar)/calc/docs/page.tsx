import type {Metadata} from 'next';
import Link from 'next/link';
import {BookOpen, ShieldCheck, Package, ArrowUpRight} from 'lucide-react';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {Container} from '@/components/container';

export const metadata: Metadata = {
  title: 'დოკუმენტაცია',
  description: 'engineers.ge-ის დოკუმენტაცია — ფიზიკის ფორმულები, საინჟინრო სტანდარტები, EN/NFPA/ASHRAE/ISO რეფერენსი',
  alternates: {canonical: '/calc/docs'},
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'დოკუმენტაცია — engineers.ge',
    description: 'ფიზიკის ფორმულები + საინჟინრო სტანდარტები',
    url: '/calc/docs'
  }
};

const DOCS = [
  {
    href: '/calc/docs/physics',
    icon: BookOpen,
    title: 'ფიზიკის ფორმულები',
    desc: 'leakage flow, plume mass flow, smoke layer, door opening force, CO concentration, piston pressure — KaTeX rendered ფორმულები ერთ საცნობაროზე.',
    tags: ['EN 12101-6', 'NFPA 92', 'ASHRAE', 'ISO']
  },
  {
    href: '/calc/docs/standards',
    icon: ShieldCheck,
    title: 'სტანდარტები',
    desc: '10 სტანდარტი 3 კატეგორიად — სახანძრო, HVAC, თერმული. თითოეული კოდი + scope + გამომცემელი + რომელი ხელსაწყო იყენებს.',
    tags: ['EN / NFPA / ASHRAE / ISO / СП', 'ქართული წყაროები']
  },
  {
    href: '/calc/docs/tools',
    icon: Package,
    title: 'ხელსაწყოები · წყაროები',
    desc: 'ღია-წყაროიანი ბიბლიოთეკების კატალოგი — FloorspaceJS, MakerJS, web-ifc, three.js, Claude AI. საიდან მოდის, რატომ, რომელი კალკულატორი იყენებს, რა ლიცენზიით.',
    tags: ['GitHub · npm', 'MIT / Apache-2.0 / BSD-3 / MPL-2.0']
  }
];

export default function DocsIndexPage() {
  return (
    <Container className="py-6 md:py-8">
      <Breadcrumbs className="mb-3" items={[{label: 'დოკუმენტაცია'}]} />

      <header className="mb-5">
        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          DOCS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          დოკუმენტაცია
        </h1>
        <p className="mt-1 text-sm text-text-2">
          ფორმულები, რომლებიც engineers.ge-ის კალკულატორებში გამოიყენება, და სტანდარტების საცნობარო.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {DOCS.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-bdr bg-sur p-4 transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-blue-lt text-blue" aria-hidden>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h2 className="flex-1 text-lg font-bold text-navy group-hover:text-blue">
                  {d.title}
                </h2>
                <ArrowUpRight
                  size={16}
                  className="shrink-0 text-text-3 transition-colors group-hover:text-blue"
                  aria-hidden
                />
              </div>
              <p className="text-[12.5px] leading-relaxed text-text-2">{d.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {d.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-bdr bg-sur-2 px-2 py-0.5 font-mono text-[9.5px] text-text-3"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
