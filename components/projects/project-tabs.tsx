'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {Plus, X, ChevronDown, ArrowLeft, Pencil, Check, Copy, Trash2, Search} from 'lucide-react';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  duplicateProject,
  deleteProject,
  formatRelative,
  type Project
} from '@/lib/projects';

const OPEN_KEY = 'eng_projects_active';
const PROJECTS_KEY = 'eng_projects_v1';

function readOpenIds(slug: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OPEN_KEY + ':' + slug);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeOpenIds(slug: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPEN_KEY + ':' + slug, JSON.stringify(ids));
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function normalizeOpenIds(ids: string[], activeId: string, knownIds: Set<string>): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    if (!knownIds.has(id) && id !== activeId) continue;
    seen.add(id);
    next.push(id);
  }
  if (activeId && !seen.has(activeId)) next.push(activeId);
  return next;
}

type Props = {
  slug: string;
  activeId: string;
};

export function ProjectTabs({slug, activeId}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [projectsVersion, setProjectsVersion] = useState(0);
  const [openIds, setOpenIds] = useState<string[]>(() => readOpenIds(slug));
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allProjects = useMemo(() => listProjects(slug), [slug, projectsVersion]);
  const knownIds = useMemo(() => new Set(allProjects.map((project) => project.id)), [allProjects]);
  const active = allProjects.find((project) => project.id === activeId) || getProject(activeId);
  const openProjects = useMemo(
    () => openIds.map((id) => allProjects.find((project) => project.id === id)).filter((x): x is Project => !!x),
    [allProjects, openIds]
  );
  const filteredProjects = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return allProjects;
    return allProjects.filter((project) => project.name.toLowerCase().includes(query));
  }, [allProjects, menuQuery]);

  const syncOpenIds = useCallback((nextIds: string[]) => {
    setOpenIds((current) => {
      if (sameIds(current, nextIds)) return current;
      return nextIds;
    });
    writeOpenIds(slug, nextIds);
  }, [slug]);

  useEffect(() => {
    setOpenIds(readOpenIds(slug));
    setMenuOpen(false);
    setMenuQuery('');
    setRenaming(false);
  }, [slug]);

  useEffect(() => {
    const normalized = normalizeOpenIds(openIds, activeId, knownIds);
    if (!sameIds(normalized, openIds)) syncOpenIds(normalized);
  }, [activeId, knownIds, openIds, syncOpenIds]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMenuQuery('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key && event.key !== PROJECTS_KEY && event.key !== `${OPEN_KEY}:${slug}`) return;
      setProjectsVersion((value) => value + 1);
      setOpenIds(readOpenIds(slug));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [slug]);

  // Ctrl+T → new tab; Ctrl+W → close active tab (caught only when focus is
  // outside the iframe; inside iframe the editor handles its own shortcuts).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 't') {
        e.preventDefault();
        const p = createProject(slug, {}, undefined);
        setProjectsVersion((value) => value + 1);
        router.push(`${pathname}?project=${p.id}`);
      } else if (k === 'w' && activeId) {
        e.preventDefault();
        const next = openIds.filter((id) => id !== activeId);
        syncOpenIds(next);
        if (next.length) {
          router.push(`${pathname}?project=${next[next.length - 1]}`);
        } else {
          router.push(pathname);
        }
      } else if (k === 'tab' && openProjects.length > 1) {
        e.preventDefault();
        const currentIndex = Math.max(0, openProjects.findIndex((project) => project.id === activeId));
        const delta = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + openProjects.length) % openProjects.length;
        router.push(`${pathname}?project=${openProjects[nextIndex].id}`);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeId, openIds, openProjects, pathname, router, slug, syncOpenIds]);

  const switchTo = (id: string) => {
    if (!openIds.includes(id)) syncOpenIds([...openIds, id]);
    router.push(`${pathname}?project=${id}`);
  };

  const closeTab = (id: string, e?: ReactMouseEvent) => {
    e?.stopPropagation();
    const next = openIds.filter((value) => value !== id);
    syncOpenIds(next);
    if (id === activeId) {
      if (next.length) {
        router.push(`${pathname}?project=${next[next.length - 1]}`);
      } else {
        router.push(pathname);
      }
    }
  };

  const addNew = () => {
    const p = createProject(slug, {}, undefined);
    setProjectsVersion((value) => value + 1);
    switchTo(p.id);
    setMenuOpen(false);
    setMenuQuery('');
  };

  const goBack = () => {
    router.push(pathname); // removes ?project=
  };

  const saveRename = () => {
    const nextName = renameInputRef.current?.value.trim();
    if (nextName && active) {
      updateProject(active.id, {name: nextName});
      setProjectsVersion((value) => value + 1);
    }
    setRenaming(false);
  };

  return (
    <div className="flex items-center gap-0 bg-sur border-b border-bdr px-2 overflow-x-auto" style={{minHeight: 36}}>
      <button
        type="button"
        onClick={goBack}
        title="ყველა პროექტი"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-2 hover:text-blue px-2 py-1 rounded transition-colors flex-shrink-0"
      >
        <ArrowLeft size={12} /> ყველა
      </button>
      <span className="h-4 w-px bg-bdr mx-1 flex-shrink-0" />

      {/* Open tabs */}
      <div className="flex items-stretch gap-0.5 overflow-x-auto">
        {openProjects.map(p => (
          <div
            key={p.id}
            onClick={() => switchTo(p.id)}
            className={`group flex items-center gap-1.5 px-2.5 h-full cursor-pointer rounded-t transition-colors flex-shrink-0 ${
              p.id === activeId
                ? 'bg-bg border-t-2 border-blue text-navy'
                : 'text-text-2 hover:bg-sur-2'
            }`}
            style={{lineHeight: '32px'}}
          >
            {p.id === activeId && renaming ? (
              <>
                <input
                  ref={renameInputRef}
                  type="text"
                  defaultValue={active?.name || ''}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') { e.stopPropagation(); setRenaming(false); }
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  className="text-[11px] font-semibold bg-sur border border-blue rounded px-1.5 py-0.5 outline-none w-[120px]"
                />
                <button
                  onClick={e => { e.stopPropagation(); saveRename(); }}
                  className="text-grn hover:opacity-70"
                  title="შენახვა"
                >
                  <Check size={12} />
                </button>
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold truncate max-w-[140px]">
                  {p.name}
                </span>
                {p.id === activeId && (
                  <button
                    onClick={e => { e.stopPropagation(); setRenaming(true); }}
                    className="text-text-3 hover:text-blue opacity-0 group-hover:opacity-100 transition-opacity"
                    title="გადარქმევა"
                  >
                    <Pencil size={10} />
                  </button>
                )}
                <button
                  onClick={(e) => closeTab(p.id, e)}
                  className={`text-text-3 hover:text-red transition-colors opacity-0 group-hover:opacity-100 ${
                    p.id === activeId ? 'opacity-60' : ''
                  }`}
                  title="ტაბის დახურვა"
                >
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add button */}
        <button
          type="button"
          onClick={addNew}
          title="ახალი პროექტი (Ctrl+T)"
          className="inline-flex items-center justify-center w-7 h-[32px] text-text-2 hover:text-blue hover:bg-sur-2 rounded transition-colors flex-shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Dropdown */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setMenuOpen((value) => {
              const next = !value;
              if (!next) setMenuQuery('');
              return next;
            });
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-2 hover:text-blue bg-sur-2 border rounded-full px-3 py-1 transition-colors"
        >
          ყველა ({allProjects.length}) <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-sur border rounded-md shadow-lg w-[280px] max-h-[400px] overflow-y-auto py-1">
            <div className="px-2 pb-2">
              <div className="relative">
                <Search
                  size={12}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
                />
                <input
                  type="search"
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  placeholder="ძებნა პროექტებში…"
                  className="w-full rounded-md border border-bdr bg-sur-2 py-1.5 pl-7 pr-2 text-[11px] text-text outline-none focus:border-blue"
                />
              </div>
            </div>
            {filteredProjects.length === 0 && (
              <div className="px-3 py-4 text-xs text-text-3 text-center italic">
                {allProjects.length === 0 ? 'ცარიელი სია' : 'შედეგი არ არის'}
              </div>
            )}
            {filteredProjects.map(p => (
              <div
                key={p.id}
                className={`group w-full px-3 py-2 hover:bg-blue-lt transition-colors flex items-center justify-between gap-2 ${
                  p.id === activeId ? 'bg-blue-lt' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => { switchTo(p.id); setMenuOpen(false); }}
                  className={`flex-1 min-w-0 text-left flex items-center gap-2 ${
                    p.id === activeId ? 'text-blue' : 'text-text'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">
                      {p.name}
                    </div>
                    <div className="text-[9px] text-text-3 font-mono truncate">
                      {formatRelative(p.updatedAt)}
                    </div>
                  </div>
                  {openIds.includes(p.id) && (
                    <span className="text-[8px] font-mono text-grn bg-grn-lt border border-grn px-1 rounded flex-shrink-0">
                      OPEN
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    title="დუბლირება"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dup = duplicateProject(p.id);
                      if (dup) setProjectsVersion((value) => value + 1);
                    }}
                    className="h-6 w-6 inline-flex items-center justify-center text-text-3 hover:text-blue hover:bg-sur rounded"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    type="button"
                    title="წაშლა"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`წაშალო "${p.name}"?`)) return;
                      deleteProject(p.id);
                      const next = openIds.filter((id) => id !== p.id);
                      syncOpenIds(next);
                      setProjectsVersion((value) => value + 1);
                      if (p.id === activeId) {
                        if (next.length) router.push(`${pathname}?project=${next[next.length - 1]}`);
                        else router.push(pathname);
                      }
                    }}
                    className="h-6 w-6 inline-flex items-center justify-center text-text-3 hover:text-red hover:bg-red-lt rounded"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
            <div className="border-t my-1" />
            <button
              type="button"
              onClick={addNew}
              className="w-full text-left px-3 py-2 hover:bg-blue-lt text-blue text-[11px] font-semibold inline-flex items-center gap-1.5"
            >
              <Plus size={12} /> ახალი პროექტი
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
