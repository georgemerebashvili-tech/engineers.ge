import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {NavBar} from '@/components/nav-bar';
import {Footer} from '@/components/footer';
import {CalcFrame} from '@/components/calc-frame';
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
  params
}: {
  params: Promise<{slug: string}>;
}) {
  const {slug} = await params;
  const calc = getCalc(slug);
  if (!calc) notFound();

  const src = `/calc/${slug}.html`;

  return (
    <>
      <NavBar />
      <main className="flex-1 bg-bg">
        <CalcFrame
          slug={slug}
          title={calc.title}
          icon={calc.icon}
          standard={calc.standard}
          src={src}
        />
      </main>
      <Footer />
    </>
  );
}
