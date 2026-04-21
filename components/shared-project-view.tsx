'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Download,
  Eye,
  FolderOpen,
  Printer,
  ShieldCheck
} from 'lucide-react';
import {Container} from '@/components/container';
import {decodeSnapshot, type ProjectSnapshot} from '@/lib/project-snapshot';
import {getCalc} from '@/lib/calculators';
import {createBuilding} from '@/lib/buildings';
import {createProject, setProjectBuilding, formatRelative} from '@/lib/projects';

type Status = 'loading' | 'empty' | 'invalid' | 'ok';

export function SharedProjectView() {
  const [status, setStatus] = useState<Status>('loading');
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (!hash) {
      setStatus('empty');
      return;
    }
    const decoded = decodeSnapshot(hash);
    if (!decoded) {
      setStatus('invalid');
      return;
    }
    setSnapshot(decoded);
    setStatus('ok');
  }, []);

  if (status === 'loading') {
    return (
      <Container className="py-10">
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-8 text-center text-[13px] text-text-3">
          იტვირთება…
        </div>
      </Container>
    );
  }

  if (status === 'empty' || status === 'invalid') {
    return (
      <Container className="py-10">
        <div className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-bdr bg-sur p-8 text-center shadow-[var(--shadow-card)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-red/20 bg-red/5 text-red">
            <AlertTriangle size={20} />
          </span>
          <h1 className="mt-3 text-[17px] font-bold text-navy">
            {status === 'empty' ? 'ბმული არასრულია' : 'ბმული დაზიანებულია'}
          </h1>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-text-2">
            {status === 'empty'
              ? 'გაზიარებული პროექტის ბმული შეიცავს # სიმბოლოს შემდეგ მონაცემებს. როგორც ჩანს, ის მოქცეული არ არის მთლიანობაში — სთხოვე გამგზავნს ხელახლა გამოგზავნოს სრული URL.'
              : 'პროექტის ფორმატი ვერ იკითხება. შესაძლოა დაზიანდა კოპირებისას ან განახლდა ფორმატი. სთხოვე გამგზავნს ახალი ბმული.'}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          >
            <ArrowLeft size={13} /> მთავარზე დაბრუნება
          </Link>
        </div>
      </Container>
    );
  }

  if (!snapshot) return null;

  const {b: building, p: projects} = snapshot;
  const hasState = projects.some((p) => p.state !== undefined);

  const importAsCopy = () => {
    const copy = createBuilding(`${building.name} (ასლი)`);
    for (const p of projects) {
      const project = createProject(p.slug, p.state ?? {}, p.name);
      setProjectBuilding(project.id, copy.id);
    }
    setImportedId(copy.id);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <Container className="py-6 md:py-8">
      <header className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-blue">
          <ShieldCheck size={11} /> SHARED · READ-ONLY
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          {building.name}
        </h1>
        <p className="mt-1 font-mono text-[11px] text-text-3">
          შექმნილი {formatRelative(building.createdAt)} · განახლდა{' '}
          {formatRelative(building.updatedAt)} · {projects.length} კალკულაცია
        </p>
      </header>

      <div className="mb-5 rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt/40 p-3 text-[12px] text-navy">
        <div className="flex items-start gap-2">
          <Eye size={14} className="mt-0.5 shrink-0 text-blue" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">ეს არის გაზიარებული პროექტის სურათი.</div>
            <p className="mt-0.5 text-[11.5px] text-text-2">
              მონაცემები ჩაწერილია თვითონ URL-ში, სერვერზე არაფერი ინახება. ცვლილებები
              ორიგინალ პროექტში არ აისახება.
              {!hasState && ' (ავტორმა ამ ბმულში მხოლოდ მეტა-მონაცემები გაუზიარა — კალკულაციების გახსნა შესაძლებელია ორიგინალ პროექტში.)'}
            </p>
            {importedId && (
              <p className="mt-1 text-[11.5px] text-blue">
                ✓ დაკოპირებულია შენს ბრაუზერში. იხილე{' '}
                <Link href={`/dashboard/projects/${importedId}`} className="font-bold underline">
                  ჩემი პროექტები → {building.name} (ასლი)
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={printReport}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <Printer size={13} /> რეპორტის ბეჭდვა
        </button>
        <button
          type="button"
          onClick={importAsCopy}
          disabled={!hasState || !!importedId}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-3 text-[12px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={13} /> ასლად ჩემთან მოტანა
        </button>
        <a
          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(snapshot, null, 2))}`}
          download={`${building.name}.json`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <Download size={13} /> JSON
        </a>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3">
            <FolderOpen size={20} />
          </span>
          <h3 className="mt-3 text-[14px] font-bold text-navy">
            ცარიელი პროექტი
          </h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-text-3">
            ამ პროექტზე ჯერ არ არის მიბმული კალკულაცია.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead className="bg-sur-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <tr>
                <th className="px-3 py-2">კალკულაცია</th>
                <th className="px-3 py-2">ტიპი</th>
                <th className="px-3 py-2">ვერსია</th>
                <th className="px-3 py-2">განახლდა</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const c = getCalc(p.slug);
                return (
                  <tr key={p.id} className="border-t border-bdr">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-sm">
                          {c?.icon ?? '📁'}
                        </span>
                        <span className="font-semibold text-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle font-mono text-[11px] text-text-2">
                      {c?.title ?? p.slug}
                      {c?.standard && (
                        <span className="ml-1 text-text-3">· {c.standard}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle font-mono text-[11px] text-text-3">
                      {p.version}
                    </td>
                    <td className="px-3 py-2 align-middle font-mono text-[11px] text-text-3">
                      {formatRelative(p.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-10 border-t border-bdr pt-4 text-center font-mono text-[10px] text-text-3">
        engineers.ge · გაზიარებული პროექტი
      </footer>
    </Container>
  );
}
