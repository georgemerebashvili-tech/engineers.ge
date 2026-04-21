'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ArrowLeft, FolderOpen, Printer} from 'lucide-react';
import {getBuilding, type Building} from '@/lib/buildings';
import {formatRelative, listProjectsByBuilding, type Project} from '@/lib/projects';
import {getCalc} from '@/lib/calculators';

interface Props {
  buildingId: string;
}

export function ProjectPrintView({buildingId}: Props) {
  const [building, setBuilding] = useState<Building | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const b = getBuilding(buildingId);
    setBuilding(b);
    setProjects(listProjectsByBuilding(buildingId));
  }, [buildingId]);

  useEffect(() => {
    if (building) {
      const id = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(id);
    }
  }, [building]);

  if (building === undefined) {
    return <div className="p-10 text-center text-[13px] text-text-3">იტვირთება…</div>;
  }

  if (building === null) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-bold text-navy">პროექტი ვერ მოიძებნა</h1>
        <p className="mt-1 text-[12px] text-text-3">
          ეს ბრაუზერი ვერ ხედავს ამ პროექტს (პროექტები ლოკალურად ინახება).
        </p>
        <Link
          href="/dashboard/projects"
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <ArrowLeft size={13} /> ჩემი პროექტები
        </Link>
      </div>
    );
  }

  const now = new Date();
  const datestr = now.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-white text-[12px] text-navy">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-bdr bg-sur-2 px-4 py-2">
        <Link
          href={`/dashboard/projects/${buildingId}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-2 hover:text-blue"
        >
          <ArrowLeft size={13} /> დაბრუნება პროექტზე
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue px-3 text-[12px] font-semibold text-white hover:bg-navy"
        >
          <Printer size={13} /> ბეჭდვა
        </button>
      </div>

      <main className="mx-auto max-w-[820px] px-8 py-10 print:px-0 print:py-6">
        <header className="mb-6 border-b border-navy/20 pb-4">
          <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.15em] text-text-3">
            engineers.ge · პროექტის რეპორტი
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{building.name}</h1>
          <div className="mt-2 grid gap-0.5 font-mono text-[10px] text-text-2 sm:grid-cols-2">
            <div>შექმნილი: {new Date(building.createdAt).toLocaleDateString('ka-GE')}</div>
            <div>განახლდა: {new Date(building.updatedAt).toLocaleDateString('ka-GE')}</div>
            <div>ID: {building.id.slice(0, 12)}</div>
            <div>ანგარიშის თარიღი: {datestr}</div>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
            მიბმული კალკულაციები · {projects.length}
          </h2>
          {projects.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-bdr bg-sur p-4 text-[12px] text-text-3">
              <FolderOpen size={14} /> ამ პროექტზე ჯერ არ არის მიბმული კალკულაცია.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-[11.5px]">
              <thead className="border-b border-navy/20 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                <tr>
                  <th className="py-1.5 pr-3">#</th>
                  <th className="py-1.5 pr-3">სახელი</th>
                  <th className="py-1.5 pr-3">ტიპი</th>
                  <th className="py-1.5 pr-3">სტანდარტი</th>
                  <th className="py-1.5 pr-3">ვერსია</th>
                  <th className="py-1.5">განახლდა</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => {
                  const c = getCalc(p.slug);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-bdr last:border-b-0"
                      style={{pageBreakInside: 'avoid'}}
                    >
                      <td className="py-1.5 pr-3 font-mono text-text-3">{i + 1}</td>
                      <td className="py-1.5 pr-3 font-semibold">{p.name}</td>
                      <td className="py-1.5 pr-3">{c?.title ?? p.slug}</td>
                      <td className="py-1.5 pr-3 font-mono text-[10.5px] text-text-3">
                        {c?.standard ?? '—'}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[10.5px] text-text-3">
                        {p.version}
                      </td>
                      <td className="py-1.5 font-mono text-[10.5px] text-text-3">
                        {formatRelative(p.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label="კალკულაციების სულ"
            value={String(projects.length)}
          />
          <SummaryCard
            label="უნიკალური ტიპი"
            value={String(new Set(projects.map((p) => p.slug)).size)}
          />
        </section>

        <footer className="mt-10 border-t border-navy/20 pt-3 text-center font-mono text-[9.5px] text-text-3">
          ავტომატურად გენერირდა engineers.ge-ზე · ლოკალური მონაცემები · {datestr}
        </footer>
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          html,
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-md border border-bdr bg-sur p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-text-3">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-bold text-navy">{value}</div>
    </div>
  );
}
