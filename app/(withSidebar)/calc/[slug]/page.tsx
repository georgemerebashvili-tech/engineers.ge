import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {CalcFrame} from '@/components/calc-frame';
import {Breadcrumbs, type Crumb} from '@/components/breadcrumbs';
import {ProjectGate} from '@/components/projects/project-gate';
import {ProjectTabs} from '@/components/projects/project-tabs';
import {CALCULATORS, getCalc} from '@/lib/calculators';
import {
  breadcrumbsJsonLd,
  calcApplicationJsonLd,
  jsonLdScript
} from '@/lib/structured-data';

// Route each calc slug → landing-page section anchor on '/'
const CATEGORY_BY_SLUG: Record<string, Crumb> = {
  'heat-loss': {label: 'თბოდანაკარგები', href: '/#calculators'},
  'wall-thermal': {label: 'თბოგადაცემა', href: '/#calculators'},
  'hvac': {label: 'გათბობა · კონდიცირება', href: '/#calculators'},
  'silencer': {label: 'ჰიდრავლიკა · აკუსტიკა', href: '/#calculators'},
  'silencer-kaya': {label: 'ჰიდრავლიკა · აკუსტიკა', href: '/#calculators'},
  'ahu-ashrae': {label: 'ვენტილაცია', href: '/#calculators'},
  'stair-pressurization': {label: 'სახანძრო სისტემები', href: '/#calculators'},
  'elevator-shaft-press': {label: 'სახანძრო სისტემები', href: '/#calculators'},
  'parking-ventilation': {label: 'სახანძრო სისტემები', href: '/#calculators'},
  'floor-pressurization': {label: 'სახანძრო სისტემები', href: '/#calculators'},
  'wall-editor': {label: 'CAD · გეგმები', href: '/#calculators'},
  'building-composer': {label: 'CAD · გეგმები', href: '/#calculators'},
  'ifc-viewer': {label: 'CAD · გეგმები', href: '/#calculators'},
  'floor-plan': {label: 'CAD · გეგმები', href: '/#calculators'},
  'duct-layout': {label: 'CAD · გეგმები', href: '/#calculators'},
  'hvac-python': {label: 'გათბობა · კონდიცირება', href: '/#calculators'}
};

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({slug: c.slug}));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{slug: string}>;
}): Promise<Metadata> {
  const {slug} = await params;
  const calc = getCalc(slug);
  if (!calc) return {};
  const url = `/calc/${slug}`;
  const fullTitle = calc.standard
    ? `${calc.title} · ${calc.standard}`
    : calc.title;
  return {
    title: calc.title,
    description: calc.desc,
    keywords: [
      calc.title,
      calc.tag,
      ...(calc.standard ? [calc.standard] : []),
      'engineers.ge',
      'კალკულატორი',
      'საქართველო'
    ],
    alternates: {canonical: url},
    openGraph: {
      type: 'website',
      locale: 'ka_GE',
      siteName: 'engineers.ge',
      title: fullTitle,
      description: calc.desc,
      url
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: calc.desc
    }
  };
}

export default async function CalcPage({
  params,
  searchParams
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{project?: string; state?: string}>;
}) {
  const {slug} = await params;
  const {project, state} = await searchParams;
  const calc = getCalc(slug);
  if (!calc) notFound();

  const useGate = calc.useProjects && !project && !state;

  if (useGate) {
    return <ProjectGate slug={slug} calcTitle={calc.title} calcIcon={calc.icon} />;
  }

  const query = new URLSearchParams();
  const locale = await getLocale();
  if (locale) query.set('lang', locale);
  if (project) query.set('project', project);
  if (state) query.set('state', state);
  const src = query.size
    ? `/calc/${slug}.html?${query.toString()}`
    : `/calc/${slug}.html`;

  const crumbs: Crumb[] = [];
  const cat = CATEGORY_BY_SLUG[slug];
  if (cat) crumbs.push(cat);
  crumbs.push({label: calc.title});

  const appJsonLd = calcApplicationJsonLd({
    slug,
    title: calc.title,
    description: calc.desc,
    category: calc.tag,
    standard: calc.standard
  });
  const crumbsJsonLd = breadcrumbsJsonLd([
    {name: 'engineers.ge', url: '/'},
    ...(cat ? [{name: cat.label, url: cat.href ?? '/#calculators'}] : []),
    {name: calc.title, url: `/calc/${slug}`}
  ]);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLdScript(appJsonLd)}}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLdScript(crumbsJsonLd)}}
      />
      <div className="flex items-center gap-3 px-4 py-1.5 border-b bg-sur shrink-0">
        <Breadcrumbs items={crumbs} />
      </div>
      {calc.useProjects && project && (
        <ProjectTabs slug={slug} activeId={project} />
      )}
      <div className="flex-1 min-h-0">
        <CalcFrame
          slug={slug}
          title={calc.title}
          icon={calc.icon}
          standard={calc.standard}
          src={src}
        />
      </div>
    </div>
  );
}
