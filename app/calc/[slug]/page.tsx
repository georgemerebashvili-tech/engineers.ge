import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Maximize2} from 'lucide-react';
import type {Metadata} from 'next';
import {NavBar} from '@/components/nav-bar';
import {Footer} from '@/components/footer';
import {Container} from '@/components/container';
import {ShareBar} from '@/components/share-bar';
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
        <Container className="py-4 md:py-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-blue transition-colors"
              >
                <ArrowLeft size={14} /> უკან
              </Link>
              <span className="h-4 w-px bg-bdr" />
              <span className="text-lg" aria-hidden>
                {calc.icon}
              </span>
              <h1 className="text-sm md:text-base font-bold text-navy truncate">
                {calc.title}
              </h1>
              {calc.standard && (
                <span className="hidden md:inline text-[10px] font-mono text-text-3 bg-sur-2 border rounded-full px-2 py-0.5">
                  {calc.standard}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-2 hover:text-blue bg-sur border rounded-full px-3 py-1.5 transition-colors"
                title="გახსენი ცალკე ფანჯარაში"
              >
                <Maximize2 size={12} /> სრული ეკრანი
              </a>
              <ShareBar title={calc.title} />
            </div>
          </div>

          <div className="bg-sur border rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <iframe
              src={src}
              title={calc.title}
              className="w-full block"
              style={{height: 'calc(100vh - 180px)', minHeight: 600, border: 0}}
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
            />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
