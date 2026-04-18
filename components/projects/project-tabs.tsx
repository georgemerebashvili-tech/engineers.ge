'use client';

import {useEffect, useState, useRef} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {Plus, X, ChevronDown, ArrowLeft, Pencil, Check} from 'lucide-react';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  type Project
} from '@/lib/projects';

const OPEN_KEY = 'eng_projects_active';

function readOpenIds(slug: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OPEN_KEY + ':' + slug);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function writeOpenIds(slug: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPEN_KEY + ':' + slug, JSON.stringify(ids));
}

type Props = {
  slug: string;
  activeId: string;
};

export function ProjectTabs({slug, activeId}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = readOpenIds(slug);
    if (!ids.includes(activeId)) {
      const next = [...ids, activeId];
      writeOpenIds(slug, next);
      setOpenIds(next);
    } else {
      setOpenIds(ids);
    }
    setAllProjects(listProjects(slug));
    const p = getProject(activeId);
    setActive(p);
    setRenameValue(p?.name || '');
  }, [slug, activeId]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const openProjects = openIds
    .map(id => allProjects.find(p => p.id === id))
    .filter((x): x is Project => !!x);

  const switchTo = (id: string) => {
    router.push(`${pathname}?project=${id}`);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openIds.filter(x => x !== id);
    writeOpenIds(slug, next);
    setOpenIds(next);
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
    switchTo(p.id);
    setMenuOpen(false);
  };

  const goBack = () => {
    router.push(pathname); // removes ?project=
  };

  const saveRename = () => {
    if (renameValue.trim() && active) {
      updateProject(active.id, {name: renameValue.trim()});
      setActive({...active, name: renameValue.trim()});
      setAllProjects(listProjects(slug));
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
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') { setRenaming(false); setRenameValue(active?.name || ''); }
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
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-2 hover:text-blue bg-sur-2 border rounded-full px-3 py-1 transition-colors"
        >
          ყველა ({allProjects.length}) <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-sur border rounded-md shadow-lg w-[280px] max-h-[400px] overflow-y-auto py-1">
            {allProjects.length === 0 && (
              <div className="px-3 py-4 text-xs text-text-3 text-center italic">
                ცარიელი სია
              </div>
            )}
            {allProjects.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { switchTo(p.id); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-lt transition-colors flex items-center justify-between gap-2 ${
                  p.id === activeId ? 'bg-blue-lt text-blue' : 'text-text'
                }`}
              >
                <span className="text-[11px] font-semibold truncate">
                  {p.name}
                </span>
                {openIds.includes(p.id) && (
                  <span className="text-[8px] font-mono text-grn bg-grn-lt border border-grn px-1 rounded">
                    OPEN
                  </span>
                )}
              </button>
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
