'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ArrowUpRight, FolderOpen, Pencil, Plus, Trash2} from 'lucide-react';
import {
  createBuilding,
  deleteBuilding,
  listBuildings,
  updateBuilding,
  type Building
} from '@/lib/buildings';
import {countProjectsByBuilding, formatRelative} from '@/lib/projects';

export function BuildingsHub() {
  const [version, setVersion] = useState(0);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const list = listBuildings();
    setBuildings(list);
    const next: Record<string, number> = {};
    for (const b of list) next[b.id] = countProjectsByBuilding(b.id);
    setCounts(next);
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

  const remove = (b: Building) => {
    const n = counts[b.id] ?? 0;
    const msg =
      n > 0
        ? `წაიშალოს "${b.name}"? მასზე მიბმული ${n} კალკულაცია აღარ იქნება ამ პროექტში (თავად კალკულაციები შენახული დარჩება).`
        : `წაიშალოს "${b.name}"?`;
    if (!confirm(msg)) return;
    deleteBuilding(b.id);
    bump();
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

      {buildings.length === 0 ? (
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => {
            const n = counts[b.id] ?? 0;
            return (
              <li
                key={b.id}
                className="group overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-card)] transition-colors hover:border-blue-bd"
              >
                <Link href={`/dashboard/projects/${b.id}`} className="block p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[14px] font-bold text-navy group-hover:text-blue">
                      {b.name}
                    </h3>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 text-text-3 transition-colors group-hover:text-blue"
                    />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-text-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-bdr bg-sur-2 px-2 py-0.5">
                      {n} კალკულაცია
                    </span>
                    <span>განახლდა {formatRelative(b.updatedAt)}</span>
                  </div>
                </Link>
                <div className="flex items-center justify-end gap-1 border-t border-bdr bg-sur-2 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => rename(b)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-blue hover:text-blue"
                    title="გადარქმევა"
                    aria-label="გადარქმევა"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-bdr bg-sur text-text-2 transition-colors hover:border-red hover:text-red"
                    title="წაშლა"
                    aria-label="წაშლა"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
