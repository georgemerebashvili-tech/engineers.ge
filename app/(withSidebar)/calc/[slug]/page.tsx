import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {CalcFrame} from '@/components/calc-frame';
import {ProjectGate} from '@/components/projects/project-gate';
import {ProjectTabs} from '@/components/projects/project-tabs';
import {CALCULATORS, getCalc} from '@/lib/calculators';

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
  return {
    title: `${calc.title} — engineers.ge`,
    description: calc.desc
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
  if (project) query.set('project', project);
  if (state) query.set('state', state);
  const src = query.size
    ? `/calc/${slug}.html?${query.toString()}`
    : `/calc/${slug}.html`;

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
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
