'use client';

import React from 'react';
import { Plus, Wind, Trash2, Calendar, MapPin, User, ArrowRight, FolderOpen } from 'lucide-react';
import type { AhuProject } from '@/lib/ahu-ashrae/types';
import { getCityById } from '@/lib/ahu-ashrae/climate-data';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

interface Props {
  projects: AhuProject[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AhuProjectsList({ projects, onNew, onOpen, onDelete }: Props) {
  return (
    <div className="flex flex-col" style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
          >
            <Wind size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
              ASHRAE · AHU SELECTION
            </div>
            <div className="text-base font-bold" style={{ color: 'var(--navy)' }}>
              AHU პროექტები
            </div>
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all"
          style={{ background: 'var(--blue)', color: '#fff' }}
        >
          <Plus size={14} /> ახალი პროექტი
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {projects.length === 0 ? (
          <EmptyState onNew={onNew} />
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
                შენი პროექტები
              </h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                {projects.length} {projects.length === 1 ? 'პროექტი' : 'პროექტი'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => onOpen(p.id)}
                  onDelete={() => onDelete(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="rounded-xl border p-8 md:p-12 flex flex-col items-center text-center gap-5"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', borderStyle: 'dashed' }}
    >
      <div
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
      >
        <FolderOpen size={28} strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1.5" style={{ color: 'var(--navy)' }}>
          ჯერ არ გაქვს AHU პროექტი
        </h3>
        <p className="text-xs max-w-md" style={{ color: 'var(--text-2)' }}>
          AHU სელექციის დასაწყებად დაარეგისტრირე ახალი პროექტი. შეიყვანე ობიექტის სახელი,
          მდებარეობა (ASHRAE კლიმატი ავტომატურად ჩაიტვირთება) და დაიწყე დაპროექტება.
        </p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all"
        style={{ background: 'var(--blue)', color: '#fff' }}
      >
        <Plus size={16} /> პირველი პროექტის რეგისტრაცია
      </button>

      <div className="mt-3 grid grid-cols-3 gap-3 max-w-md text-[10px]" style={{ color: 'var(--text-3)' }}>
        <Step n="1" label="რეგისტრაცია" />
        <Step n="2" label="დამუშავება" />
        <Step n="3" label="AHU სტილი" />
      </div>
    </div>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: 'var(--bdr)', color: 'var(--text-2)' }}
      >
        {n}
      </span>
      <span className="font-mono uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project, onOpen, onDelete,
}: {
  project: AhuProject;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const city = getCityById(project.location);
  const ahuType = project.ahuType ? getAhuTypeSpec(project.ahuType) : null;

  return (
    <div
      className="group relative rounded-xl border p-4 transition-all hover:-translate-y-0.5 cursor-pointer"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', boxShadow: 'var(--shadow-card)' }}
      onClick={onOpen}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('წავშალოთ ეს პროექტი?')) onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-3)' }}
        title="წაშლა"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex items-start gap-2 mb-3">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
        >
          <Wind size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--navy)' }}>
            {project.name}
          </h3>
          {ahuType ? (
            <span
              className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
              style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
            >
              {ahuType.shortLabel}
            </span>
          ) : (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              draft
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {city && (
          <Row icon={<MapPin size={11} />} label={`${city.name} · ${city.nameEn}`} />
        )}
        {project.engineer && (
          <Row icon={<User size={11} />} label={project.engineer} />
        )}
        <Row icon={<Calendar size={11} />} label={`შექმნილი: ${project.date}`} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--bdr)' }}>
        <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-3)' }}>
          ID · {project.id.slice(-7)}
        </span>
        <span
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          გახსნა <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-2)' }}>
      <span style={{ color: 'var(--text-3)' }}>{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
