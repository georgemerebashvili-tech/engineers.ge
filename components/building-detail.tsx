'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  FolderOpen,
  Link2,
  Pencil,
  Plus,
  Printer,
  Share2,
  Unlink,
  Trash2
} from 'lucide-react';
import {ShareProjectDialog} from '@/components/share-project-dialog';
import {Container} from '@/components/container';
import {CALCULATORS, getCalc} from '@/lib/calculators';
import {getBuilding, updateBuilding, deleteBuilding, type Building} from '@/lib/buildings';
import {
  buildDeleteProjectPrompt,
  deleteProject,
  formatRelative,
  listProjectsByBuilding,
  listUnassignedProjects,
  setProjectBuilding,
  type Project
} from '@/lib/projects';

const PROJECT_AWARE_SLUGS = CALCULATORS.filter((c) => c.useProjects).map((c) => c.slug);

export function BuildingDetail({buildingId}: {buildingId: string}) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [building, setBuilding] = useState<Building | null>(null);
  const [linked, setLinked] = useState<Project[]>([]);
  const [unassigned, setUnassigned] = useState<Project[]>([]);
  const [picker, setPicker] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const b = getBuilding(buildingId);
    setBuilding(b);
    setLinked(listProjectsByBuilding(buildingId));
    setUnassigned(listUnassignedProjects());
  }, [buildingId, version]);

  useEffect(() => {
    const close = () => setAddMenu(false);
    if (!addMenu) return;
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [addMenu]);

  const bump = () => setVersion((v) => v + 1);

  const grouped = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of linked) {
      const arr = map.get(p.slug) ?? [];
      arr.push(p);
      map.set(p.slug, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [linked]);

  if (!building) {
    return (
      <Container className="py-8">
        <Link
          href="/dashboard/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-2 hover:text-blue"
        >
          <ArrowLeft size={14} /> ჩემი პროექტები
        </Link>
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3">
            <FolderOpen size={20} />
          </span>
          <h3 className="mt-3 text-[14px] font-bold text-navy">პროექტი ვერ მოიძებნა</h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-text-3">
            შესაძლოა წაშლილი იყოს ან სხვა ბრაუზერშია შენახული (ამჟამად პროექტები ლოკალურად ინახება).
          </p>
        </div>
      </Container>
    );
  }

  const rename = () => {
    const next = prompt('პროექტის ახალი სახელი', building.name)?.trim();
    if (!next || next === building.name) return;
    updateBuilding(building.id, {name: next});
    bump();
  };

  const remove = () => {
    const n = linked.length;
    const msg =
      n > 0
        ? `წაიშალოს "${building.name}"? მასზე მიბმული ${n} კალკულაცია აღარ იქნება ამ პროექტში (თავად კალკულაციები შენახული დარჩება).`
        : `წაიშალოს "${building.name}"?`;
    if (!confirm(msg)) return;
    deleteBuilding(building.id);
    router.push('/dashboard/projects');
  };

  const linkProject = (projectId: string) => {
    setProjectBuilding(projectId, building.id);
    bump();
  };

  const unlinkProject = (p: Project) => {
    if (!confirm(`მოვხსნათ "${p.name}" პროექტიდან "${building.name}"? კალკულაცია შენახული დარჩება.`)) return;
    setProjectBuilding(p.id, null);
    bump();
  };

  const deleteLinked = (p: Project) => {
    if (!confirm(buildDeleteProjectPrompt(p, building.name))) return;
    deleteProject(p.id);
    bump();
  };

  const openCalc = (p: Project) => {
    router.push(`/calc/${p.slug}?project=${p.id}`);
  };

  return (
    <Container className="py-6 md:py-8">
      <Link
        href="/dashboard/projects"
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-2 hover:text-blue"
      >
        <ArrowLeft size={14} /> ჩემი პროექტები
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
            პროექტი
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
            {building.name}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-text-3">
            შექმნილი {formatRelative(building.createdAt)} · განახლდა {formatRelative(building.updatedAt)} ·{' '}
            {linked.length} კალკულაცია
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <Share2 size={13} /> გაზიარება
          </button>
          <a
            href={`/print/project/${building.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <Printer size={13} /> ბეჭდვა
          </a>
          <button
            type="button"
            onClick={rename}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <Pencil size={13} /> სახელი
          </button>
          <button
            type="button"
            onClick={remove}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 transition-colors hover:border-red hover:text-red"
          >
            <Trash2 size={13} /> წაშლა
          </button>
        </div>
      </header>
      {shareOpen && (
        <ShareProjectDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          building={building}
          projects={linked}
        />
      )}

      <section className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setAddMenu((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy"
          >
            <Plus size={14} /> ახალი კალკულაცია
            <ChevronDown size={13} />
          </button>
          {addMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 max-h-[60vh] overflow-y-auto rounded-md border border-bdr bg-sur p-1 shadow-lg">
              {PROJECT_AWARE_SLUGS.map((slug) => {
                const c = getCalc(slug);
                if (!c) return null;
                return (
                  <Link
                    key={slug}
                    href={`/calc/${slug}?building=${building.id}`}
                    onClick={() => setAddMenu(false)}
                    className="flex items-center gap-2 rounded px-2 py-2 text-[12px] text-text-2 hover:bg-sur-2 hover:text-blue"
                  >
                    <span aria-hidden>{c.icon}</span>
                    <span className="flex-1 truncate">{c.title}</span>
                    {c.standard && (
                      <span className="shrink-0 font-mono text-[9px] text-text-3">{c.standard}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPicker((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
        >
          <Link2 size={13} /> {picker ? 'დამალვა' : 'არსებულის მიბმა'}
          {!picker && unassigned.length > 0 && (
            <span className="ml-1 rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] text-text-3">
              {unassigned.length}
            </span>
          )}
        </button>
      </section>

      {picker && (
        <section className="mb-6 rounded-[var(--radius-card)] border border-bdr bg-sur p-3">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-3 font-mono">
            შენი თავისუფალი კალკულაციები ({unassigned.length})
          </h3>
          {unassigned.length === 0 ? (
            <p className="text-[12px] text-text-3">
              ყველა არსებული კალკულაცია უკვე მიბმულია რომელიმე პროექტზე.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {unassigned.map((p) => {
                const c = getCalc(p.slug);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border border-bdr bg-sur-2 px-2.5 py-2"
                  >
                    <span aria-hidden>{c?.icon ?? '📁'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-navy">{p.name}</div>
                      <div className="truncate font-mono text-[10px] text-text-3">
                        {c?.title ?? p.slug} · განახლდა {formatRelative(p.updatedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => linkProject(p.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2.5 text-[11px] font-semibold text-blue hover:border-blue hover:bg-blue hover:text-white"
                    >
                      <Link2 size={12} /> მიბმა
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {linked.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3">
            <FolderOpen size={20} />
          </span>
          <h3 className="mt-3 text-[14px] font-bold text-navy">ჯერ კალკულაცია არ არის მიბმული</h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-text-3">
            დააჭირე „ახალი კალკულაცია“-ს, რომ ამ პროექტზე მიმაგრებული შექმნა —
            კედლის U-ფაქტორი, EN 12831, HVAC ან სხვა — ყველაფერი ერთ ადგილას იქნება.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([slug, items]) => {
            const c = getCalc(slug);
            return (
              <section key={slug}>
                <h2 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-3 font-mono">
                  <span aria-hidden className="text-sm">
                    {c?.icon ?? '📁'}
                  </span>
                  {c?.title ?? slug}
                  <span className="rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] text-[9px] text-text-3">
                    {items.length}
                  </span>
                  {c?.standard && (
                    <span className="font-mono text-[9px] text-text-3">· {c.standard}</span>
                  )}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => (
                    <li
                      key={p.id}
                      className="overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-card)]"
                    >
                      <button
                        type="button"
                        onClick={() => openCalc(p)}
                        className="block w-full p-3 text-left"
                      >
                        <h3 className="line-clamp-2 text-[13px] font-bold text-navy">{p.name}</h3>
                        <div className="mt-1 font-mono text-[10px] text-text-3">
                          განახლდა {formatRelative(p.updatedAt)}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 border-t border-bdr bg-sur-2 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => openCalc(p)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 text-[11px] font-semibold text-blue transition-colors hover:border-blue hover:bg-blue hover:text-white"
                        >
                          <ArrowUpRight size={11} /> გახსნა
                        </button>
                        <button
                          type="button"
                          onClick={() => unlinkProject(p)}
                          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-ora hover:text-ora"
                          title="პროექტიდან მოხსნა"
                          aria-label="პროექტიდან მოხსნა"
                        >
                          <Unlink size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLinked(p)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-red hover:text-red"
                          title="კალკულაციის წაშლა"
                          aria-label="კალკულაციის წაშლა"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Container>
  );
}
