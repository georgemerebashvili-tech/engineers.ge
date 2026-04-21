'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  Plus,
  ArrowUpRight,
  Trash2,
  Copy,
  Download,
  Upload,
  FolderOpen,
  Search,
  X
} from 'lucide-react';
import {
  buildDeleteProjectPrompt,
  listProjects,
  getProject,
  createProject,
  deleteProject,
  duplicateProject,
  exportProject,
  importProject,
  getLastProjectId,
  setLastProjectId,
  getAlwaysShowGateOnEntry,
  setProjectBuilding,
  formatRelative
} from '@/lib/projects';
import {getBuilding} from '@/lib/buildings';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {getTemplatesForSlug} from '@/lib/project-templates';

type Props = {
  slug: string;
  calcTitle: string;
  calcIcon?: string;
};

const PREVIEW_LIMIT = 7;

export function ProjectGate({slug, calcTitle, calcIcon}: Props) {
  const router = useRouter();
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [bootReady, setBootReady] = useState(false);
  const [lastProjectId, setLastProjectIdState] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const projects = useMemo(() => listProjects(slug), [refreshIndex, slug]);

  useEffect(() => {
    if (creating) nameInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manualGate = params.get('gate') === '1';
    const buildingParam = params.get('building');
    if (buildingParam) {
      const b = getBuilding(buildingParam);
      if (b) {
        setBuildingId(b.id);
        setBuildingName(b.name);
      }
    }
    const lastId = getLastProjectId(slug);
    const lastProject = lastId ? getProject(lastId) : null;
    if (lastProject?.slug === slug) {
      setLastProjectIdState(lastProject.id);
    } else {
      if (lastId) setLastProjectId(slug, null);
      setLastProjectIdState(null);
    }
    // When arriving from a building, always show the gate (user is picking/creating for that project)
    if (buildingParam || manualGate || getAlwaysShowGateOnEntry(slug) || !lastProject || lastProject.slug !== slug) {
      setBootReady(true);
      return;
    }
    router.replace(`/calc/${slug}?project=${lastProject.id}`);
  }, [refreshIndex, router, slug]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const visible = showAll || query ? filtered : filtered.slice(0, PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const commitNew = () => {
    const name = newName.trim();
    const p = createProject(slug, {}, name || undefined);
    if (buildingId) setProjectBuilding(p.id, buildingId);
    setLastProjectId(slug, p.id);
    router.push(`/calc/${slug}?project=${p.id}`);
  };

  const openTemplate = (key: string) => {
    const tmpl = getTemplatesForSlug(slug).find((t) => t.key === key);
    if (!tmpl) return;
    const p = createProject(slug, tmpl.state, tmpl.name);
    if (buildingId) setProjectBuilding(p.id, buildingId);
    setLastProjectId(slug, p.id);
    router.push(`/calc/${slug}?project=${p.id}`);
  };

  const templates = getTemplatesForSlug(slug);

  const cancelNew = () => {
    setCreating(false);
    setNewName('');
  };

  const handleOpen = (id: string) => {
    setLastProjectId(slug, id);
    router.push(`/calc/${slug}?project=${id}`);
  };

  const handleDelete = (id: string) => {
    const project = getProject(id);
    if (!project) return;
    const building = project.buildingId ? getBuilding(project.buildingId) : null;
    if (!confirm(buildDeleteProjectPrompt(project, building?.name))) return;
    deleteProject(id);
    setRefreshIndex((value) => value + 1);
  };

  const handleDuplicate = (id: string) => {
    duplicateProject(id);
    setRefreshIndex((value) => value + 1);
  };

  const handleExport = (id: string) => {
    const json = exportProject(id);
    const p = projects.find((x) => x.id === id);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p?.name || 'project'}.json`.replace(/[^a-z0-9\u10A0-\u10FF.-]/gi, '-');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = importProject(text);
        if (imported.slug === slug) {
          setLastProjectId(slug, imported.id);
          setLastProjectIdState(imported.id);
        }
        setRefreshIndex((value) => value + 1);
      } catch (e) {
        alert('JSON წაკითხვა ვერ მოხერხდა: ' + (e as Error).message);
      }
    };
    input.click();
  };

  const lastProject = useMemo(
    () => projects.find((project) => project.id === lastProjectId) || null,
    [lastProjectId, projects]
  );

  if (!bootReady) {
    return <div className="w-full bg-bg min-h-[calc(100vh-56px)]" />;
  }

  return (
    <div className="w-full bg-bg min-h-[calc(100vh-56px)]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10 md:pt-12 pb-10">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumbs
            items={
              buildingId && buildingName
                ? [
                    {label: 'ჩემი პროექტები', href: '/dashboard/projects'},
                    {label: buildingName, href: `/dashboard/projects/${buildingId}`},
                    {label: calcTitle}
                  ]
                : [{label: calcTitle}]
            }
          />
        </div>
        {buildingId && buildingName && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-bd bg-blue-lt px-3 py-1 text-[11px] font-semibold text-blue">
            🔗 ახალი კალკულაცია დაერთება პროექტს „{buildingName}“
          </div>
        )}
        {/* Header */}
        <div className="mb-4 flex items-end gap-3">
          {calcIcon && (
            <span className="text-3xl" aria-hidden>
              {calcIcon}
            </span>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-navy tracking-tight">
              {calcTitle}
            </h1>
            <p className="text-xs text-text-3 font-mono mt-1">
              {projects.length === 0
                ? 'ჯერ არცერთი პროექტი'
                : `${projects.length} პროექტი`}
            </p>
          </div>
        </div>

        {/* Toolbar: search + actions */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 max-w-md">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ძიება სახელით…"
              className="w-full rounded-full border border-bdr bg-sur pl-9 pr-8 py-2 text-sm text-navy placeholder:text-text-3 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue-lt"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="გასუფთავება"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-3 hover:bg-sur-2 hover:text-navy"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {projects.length > PREVIEW_LIMIT && !query && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-sur px-3 py-2 text-xs font-semibold text-text-2 transition-colors hover:text-blue hover:border-blue"
            >
              {showAll ? 'დაკეცვა' : `ყველა · ${projects.length}`}
            </button>
          )}
          {lastProject && (
            <button
              type="button"
              onClick={() => handleOpen(lastProject.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-3 py-2 text-xs font-semibold text-blue transition-colors hover:border-blue hover:bg-blue hover:text-white"
            >
              <ArrowUpRight size={13} /> ბოლო პროექტი
            </button>
          )}
          <button
            type="button"
            onClick={handleImport}
            className="inline-flex items-center gap-1.5 rounded-full border bg-sur px-3 py-2 text-xs font-semibold text-text-2 transition-colors hover:text-blue hover:border-blue"
          >
            <Upload size={13} /> იმპორტი
          </button>
        </div>

        {/* Demo templates (if available for this slug) */}
        {templates.length > 0 && (
          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-bold text-navy">სწრაფი დაწყება</h2>
              <span className="text-[10px] text-text-3 font-mono">
                ნიმუში პროექტები — click → ჩატვირთვა
              </span>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              {templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => openTemplate(t.key)}
                  className="group flex h-[140px] flex-col items-start gap-2 rounded-[var(--radius-card)] border-2 border-bdr bg-sur p-4 text-left transition-all hover:border-blue hover:bg-blue-lt hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-3 group-hover:text-blue">
                      დემო
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-navy group-hover:text-blue leading-tight">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-text-3 leading-snug mt-1 line-clamp-2">
                      {t.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* New project card */}
          {creating ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-blue bg-blue-lt p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-bd bg-sur text-blue">
                <Plus size={28} strokeWidth={2} />
              </div>
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitNew();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelNew();
                  }
                }}
                placeholder="პროექტის სახელი"
                maxLength={80}
                className="w-full rounded-md border border-bdr bg-sur px-3 py-1.5 text-center text-sm font-semibold text-navy placeholder:text-text-3 focus:border-blue focus:outline-none"
              />
              <div className="flex w-full items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelNew}
                  className="flex-1 rounded-md border bg-sur px-2 py-1 text-[11px] font-semibold text-text-2 hover:text-navy"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={commitNew}
                  className="flex-1 rounded-md border border-blue bg-blue px-2 py-1 text-[11px] font-semibold text-white hover:bg-navy-2"
                >
                  შექმნა
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="group relative flex h-[240px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-bdr bg-sur transition-all hover:border-blue hover:bg-blue-lt"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-bd bg-blue-lt text-blue transition-all group-hover:bg-blue group-hover:text-white">
                <Plus size={28} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-navy transition-colors group-hover:text-blue">
                ახალი პროექტი
              </span>
              <span className="font-mono text-[10px] text-text-3">
                დააწერე სახელი
              </span>
            </button>
          )}

          {/* Project cards */}
          {visible.map((p) => (
            <div
              key={p.id}
              className="group relative bg-sur border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] hover:border-blue hover:-translate-y-0.5 transition-all"
            >
              <span className="absolute top-2 left-2 z-10 text-[9px] font-bold font-mono text-blue bg-blue-lt border border-blue-bd rounded-full px-2 py-0.5">
                {p.version}
              </span>

              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  type="button"
                  onClick={() => handleDuplicate(p.id)}
                  title="დუბლიკატი"
                  className="w-7 h-7 inline-flex items-center justify-center bg-sur border rounded-md text-text-2 hover:text-blue hover:border-blue"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(p.id)}
                  title="ექსპორტი"
                  className="w-7 h-7 inline-flex items-center justify-center bg-sur border rounded-md text-text-2 hover:text-blue hover:border-blue"
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  title="წაშლა"
                  className="w-7 h-7 inline-flex items-center justify-center bg-sur border rounded-md text-text-2 hover:text-red hover:border-red"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpen(p.id)}
                className="block w-full text-left"
              >
                <div className="aspect-[4/3] bg-bg border-b flex items-center justify-center overflow-hidden">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-3">
                      <FolderOpen size={36} strokeWidth={1.4} />
                      <span className="text-[10px] font-mono">არ არის preview</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="text-[15px] font-bold text-navy leading-tight truncate">{p.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-text-3">
                    <span className="inline-flex items-center gap-1" title={`შექმნილია ${new Date(p.createdAt).toLocaleString('ka-GE')}`}>
                      <span className="text-text-3/70">შექმნილი</span>
                      <span className="text-text-2">{new Date(p.createdAt).toLocaleDateString('ka-GE', {year: '2-digit', month: '2-digit', day: '2-digit'})}</span>
                    </span>
                    <span className="text-text-3/40">·</span>
                    <span className="inline-flex items-center gap-1" title={`განახლდა ${new Date(p.updatedAt).toLocaleString('ka-GE')}`}>
                      <span className="text-text-3/70">შეცვლილი</span>
                      <span className="text-text-2">{formatRelative(p.updatedAt)}</span>
                    </span>
                  </div>
                </div>
              </button>

              <div className="px-3 pb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpen(p.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue bg-blue-lt border border-blue-bd rounded-full px-3 py-1.5 hover:bg-blue hover:text-white hover:border-blue transition-colors"
                >
                  გახსნა <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {query && filtered.length === 0 && (
          <div className="mt-6 text-center text-xs text-text-3 font-mono">
            {`„${query}“-ზე შედეგი ვერ მოიძებნა`}
          </div>
        )}

        {!query && hiddenCount > 0 && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-sur px-4 py-2 text-xs font-semibold text-blue transition-colors hover:bg-blue-lt"
            >
              ყველა · კიდევ {hiddenCount}
            </button>
          </div>
        )}

        {projects.length === 0 && (
          <div className="mt-6 text-center text-xs text-text-3 font-mono">
            დააჭირე &quot;ახალი პროექტი&quot; ან იმპორტი გააკეთე JSON-იდან
          </div>
        )}
      </div>
    </div>
  );
}
