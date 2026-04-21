'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpRight, Copy, FolderOpen, Pencil, Trash2} from 'lucide-react';
import {CALCULATORS, getCalc} from '@/lib/calculators';
import {
  deleteProject,
  duplicateProject,
  formatRelative,
  listProjects,
  type Project,
  updateProject
} from '@/lib/projects';

const PROJECTS_KEY = 'eng_projects_v1';
const USE_PROJECTS_SLUGS = new Set(
  CALCULATORS.filter((calc) => calc.useProjects).map((calc) => calc.slug)
);

export function DashboardProjectsPanel() {
  const router = useRouter();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key && event.key !== PROJECTS_KEY) return;
      setVersion((value) => value + 1);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const projects = useMemo(
    () =>
      listProjects()
        .filter((project) => USE_PROJECTS_SLUGS.has(project.slug))
        .slice(0, 8),
    [version]
  );

  const totalProjects = useMemo(
    () => listProjects().filter((project) => USE_PROJECTS_SLUGS.has(project.slug)).length,
    [version]
  );

  const openProject = (project: Project) => {
    router.push(`/calc/${project.slug}?project=${project.id}`);
  };

  const duplicateAndOpen = (project: Project) => {
    const copy = duplicateProject(project.id);
    setVersion((value) => value + 1);
    if (copy) router.push(`/calc/${copy.slug}?project=${copy.id}`);
  };

  const removeProject = (project: Project) => {
    if (!confirm(`წაიშალოს "${project.name}"? ქმედება შეუქცევადია.`)) return;
    deleteProject(project.id);
    setVersion((value) => value + 1);
  };

  const renameProject = (project: Project) => {
    const nextName = prompt('პროექტის ახალი სახელი', project.name)?.trim();
    if (!nextName || nextName === project.name) return;
    updateProject(project.id, {name: nextName});
    setVersion((value) => value + 1);
  };

  return (
    <section id="projects" className="mb-8 scroll-mt-24">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-3 font-mono">
            ჩემი პროექტები
          </h2>
          <p className="mt-1 text-[12px] text-text-2">
            local MVP {totalProjects > 0 ? `· ${totalProjects} პროექტი` : '· ჯერ ცარიელია'}
          </p>
        </div>
        <Link
          href="/calc/wall-editor"
          className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur px-3 py-2 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
        >
          ახალი პროექტი
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-5 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3">
            <FolderOpen size={16} />
          </span>
          <h3 className="mt-2 text-[13px] font-bold text-navy">პროექტები ჯერ არ გაქვს</h3>
          <p className="mt-1 text-[11px] text-text-3">
            გახსენი project-aware კალკულატორი, შეინახე `Save as`-ით და აქ recent list გამოჩნდება.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => {
            const calc = getCalc(project.slug);
            return (
              <article
                key={project.id}
                className="overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-card)]"
              >
                <button
                  type="button"
                  onClick={() => openProject(project)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[16/10] border-b border-bdr bg-sur-2">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        {calc?.icon ?? '📁'}
                      </div>
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-bdr bg-sur/90 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-2 backdrop-blur">
                      {calc?.icon ?? '📁'} {calc?.title ?? project.slug}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="line-clamp-2 text-[13px] font-bold text-navy">{project.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-text-3">
                      {calc?.desc ?? 'Project snapshot'}
                    </p>
                    <div className="mt-2 font-mono text-[10px] text-text-3">
                      განახლდა {formatRelative(project.updatedAt)}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 border-t border-bdr bg-sur-2 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => openProject(project)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2.5 text-[11px] font-semibold text-blue transition-colors hover:border-blue hover:bg-blue hover:text-white"
                  >
                    <ArrowUpRight size={12} />
                    გახსნა
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateAndOpen(project)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-blue hover:text-blue"
                    title="დუბლირება"
                    aria-label="დუბლირება"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => renameProject(project)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-blue hover:text-blue"
                    title="გადარქმევა"
                    aria-label="გადარქმევა"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProject(project)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-red hover:text-red"
                    title="წაშლა"
                    aria-label="წაშლა"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
