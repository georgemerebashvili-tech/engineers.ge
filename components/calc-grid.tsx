import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Container} from './container';
import {CALCULATORS} from '@/lib/calculators';

export function CalcGrid() {
  return (
    <section id="calculators" className="py-16 md:py-24">
      <Container>
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue mb-2">
              ხელსაწყოები
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
              კალკულატორები
            </h2>
          </div>
          <div className="text-xs text-text-3 font-mono">
            {CALCULATORS.length} აქტიური · უფასო
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CALCULATORS.map((c) => (
            <Link
              key={c.slug}
              href={`/calc/${c.slug}`}
              className="group relative bg-sur border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] hover:border-blue hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl" aria-hidden>
                  {c.icon}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue bg-blue-lt border border-blue-bd rounded-full px-2 py-0.5">
                  {c.tag}
                </span>
              </div>
              <h3 className="text-base font-bold text-navy mb-1.5 group-hover:text-blue transition-colors">
                {c.title}
              </h3>
              <p className="text-xs text-text-2 leading-relaxed mb-3 line-clamp-2">
                {c.desc}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-bdr">
                {c.standard ? (
                  <span className="text-[9px] text-text-3 font-mono">
                    {c.standard}
                  </span>
                ) : (
                  <span />
                )}
                <ArrowUpRight
                  size={14}
                  className="text-text-3 group-hover:text-blue transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
