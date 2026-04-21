'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  Plus,
  Printer,
  Share2,
  Trash2
} from 'lucide-react';
import {
  createBuilding,
  deleteBuilding,
  listBuildings,
  updateBuilding,
  type Building
} from '@/lib/buildings';
import {formatRelative, listProjectsByBuilding, type Project} from '@/lib/projects';
import {getCalc} from '@/lib/calculators';
import {ShareProjectDialog} from '@/components/share-project-dialog';

interface BuildingRowData {
  building: Building;
  projects: Project[];
}

export function BuildingsHub() {
  const [version, setVersion] = useState(0);
  const [rows, setRows] = useState<BuildingRowData[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [shareFor, setShareFor] = useState<BuildingRowData | null>(null);

  useEffect(() => {
    const all = listBuildings();
    setRows(
      all.map((building) => ({building, projects: listProjectsByBuilding(building.id)}))
    );
  }, [version]);

  const bump = () => setVersion((v) => v + 1);

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    createBuilding(trimmed);
    setNewName('');
    setCreating(false);
    bump();
  };

  const rename = (b: Building) => {
    const next = prompt('პროექტის ახალი სახელი', b.name)?.trim();
    if (!next || next === b.name) return;
    updateBuilding(b.id, {name: next});
    bump();
  };

  const remove = (row: BuildingRowData) => {
    const n = row.projects.length;
    const msg =
      n > 0
        ? `წაიშალოს "${row.building.name}"? მასზე მიბმული ${n} კალკულაცია აღარ იქნება ამ პროექტში (თავად კალკულაციები შენახული დარჩება).`
        : `წაიშალოს "${row.building.name}"?`;
    if (!confirm(msg)) return;
    deleteBuilding(row.building.id);
    bump();
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPrint = (id: string) => {
    window.open(`/print/project/${id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <section className="mb-5">
        {creating ? (
          <form
            onSubmit={submitCreate}
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt/40 p-3"
          >
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="მაგ. სპორტდარბაზი"
              className="h-9 min-w-[220px] flex-1 rounded-md border border-bdr bg-sur px-3 text-[13px] text-navy outline-none focus:border-blue"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} /> შექმნა
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
              className="inline-flex h-9 items-center rounded-md border border-bdr bg-sur px-3 text-[12px] font-semibold text-text-2 hover:text-navy"
            >
              გაუქმება
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy"
          >
            <Plus size={14} /> ახალი პროექტი
          </button>
        )}
      </section>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-bdr bg-sur p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-bdr bg-sur-2 text-text-3">
            <FolderOpen size={20} />
          </span>
          <h3 className="mt-3 text-[14px] font-bold text-navy">პროექტები ჯერ არ გაქვს</h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-text-3">
            დაიწყე სახელით — მაგ. „სპორტდარბაზი“, „სუპერმარკეტი“, „საოფისე შენობა N12“ —
            შემდეგ მასზე მიაბი კედლის U-ფაქტორი, თბოდანაკარგები და სხვა კალკულაციები.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead className="bg-sur-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="px-3 py-2">პროექტი</th>
                <th className="px-3 py-2">კალკულაციები</th>
                <th className="px-3 py-2">განახლდა</th>
                <th className="px-3 py-2 text-right">მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const {building, projects} = row;
                const isOpen = expanded.has(building.id);
                return (
                  <ProjectRow
                    key={building.id}
                    row={row}
                    isOpen={isOpen}
                    onToggle={() => toggle(building.id)}
                    onRename={() => rename(building)}
                    onRemove={() => remove(row)}
                    onShare={() => setShareFor(row)}
                    onPrint={() => openPrint(building.id)}
                    onRefresh={bump}
                    projects={projects}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shareFor && (
        <ShareProjectDialog
          open={!!shareFor}
          onClose={() => setShareFor(null)}
          building={shareFor.building}
          projects={shareFor.projects}
        />
      )}
    </>
  );
}

interface RowProps {
  row: BuildingRowData;
  projects: Project[];
  isOpen: boolean;
  onToggle: () => void;
  onRename: () => void;
  onRemove: () => void;
  onShare: () => void;
  onPrint: () => void;
  onRefresh: () => void;
}

function ProjectRow({
  row,
  projects,
  isOpen,
  onToggle,
  onRename,
  onRemove,
  onShare,
  onPrint
}: RowProps) {
  const {building} = row;
  const preview = useMemo(() => projects.slice(0, 3), [projects]);
  const remaining = projects.length - preview.length;

  return (
    <>
      <tr className="border-t border-bdr transition-colors hover:bg-sur-2/60">
        <td className="px-2 py-2 align-middle">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
            aria-label={isOpen ? 'ჩაკეცვა' : 'გაშლა'}
            aria-expanded={isOpen}
            disabled={projects.length === 0}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-3 py-2 align-middle">
          <Link
            href={`/dashboard/projects/${building.id}`}
            className="truncate font-semibold text-navy transition-colors hover:text-blue"
          >
            {building.name}
          </Link>
        </td>
        <td className="px-3 py-2 align-middle">
          {projects.length === 0 ? (
            <span className="font-mono text-[10.5px] text-text-3">— ცარიელია</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {preview.map((p) => {
                const c = getCalc(p.slug);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-1.5 text-[11.5px] text-text-2"
                    title={p.name}
                  >
                    <span aria-hidden className="w-3 text-center">{c?.icon ?? '📁'}</span>
                    <span className="truncate">{c?.title ?? p.slug}</span>
                  </li>
                );
              })}
              {remaining > 0 && (
                <li className="font-mono text-[10px] text-text-3">
                  +{remaining} კიდევ
                </li>
              )}
            </ul>
          )}
        </td>
        <td className="px-3 py-2 align-middle font-mono text-[10.5px] text-text-3">
          {formatRelative(building.updatedAt)}
        </td>
        <td className="px-3 py-2 align-middle">
          <div className="flex items-center justify-end gap-1">
            <IconBtn title="გაზიარება · QR" onClick={onShare}>
              <Share2 size={12} />
            </IconBtn>
            <IconBtn
              title="რეპორტის ბეჭდვა"
              onClick={onPrint}
              disabled={projects.length === 0}
            >
              <Printer size={12} />
            </IconBtn>
            <IconBtn title="გადარქმევა" onClick={onRename}>
              <Pencil size={12} />
            </IconBtn>
            <IconBtn title="წაშლა" onClick={onRemove} hoverTone="red">
              <Trash2 size={12} />
            </IconBtn>
          </div>
        </td>
      </tr>
      {isOpen && projects.length > 0 && (
        <tr className="border-t border-bdr bg-sur-2/40">
          <td colSpan={5} className="px-4 py-3">
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => {
                const c = getCalc(p.slug);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border border-bdr bg-sur px-2.5 py-1.5"
                  >
                    <span aria-hidden className="text-sm">
                      {c?.icon ?? '📁'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-semibold text-navy">{p.name}</div>
                      <div className="truncate font-mono text-[9.5px] text-text-3">
                        {c?.title ?? p.slug} · {formatRelative(p.updatedAt)}
                      </div>
                    </div>
                    <Link
                      href={`/calc/${p.slug}?project=${p.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-bd bg-blue-lt px-2 text-[10.5px] font-semibold text-blue transition-colors hover:border-blue hover:bg-blue hover:text-white"
                    >
                      <ArrowUpRight size={11} /> გახსნა
                    </Link>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  hoverTone = 'blue'
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  hoverTone?: 'blue' | 'red';
}) {
  const hoverCls =
    hoverTone === 'red'
      ? 'hover:border-red hover:text-red'
      : 'hover:border-blue hover:text-blue';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors ${hoverCls} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
