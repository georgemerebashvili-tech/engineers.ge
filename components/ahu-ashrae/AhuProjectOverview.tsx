'use client';

import React from 'react';
import {
  Plus, Wind, ArrowLeft, MapPin, User, Calendar,
  Trash2, ArrowRight, Layers, FileText,
} from 'lucide-react';
import type { AhuProject, AhuUnit } from '@/lib/ahu-ashrae/types';
import { getCityById } from '@/lib/ahu-ashrae/climate-data';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

interface Props {
  project: AhuProject;
  onNewUnit: () => void;
  onOpenUnit: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onBack: () => void;
}

export function AhuProjectOverview({
  project, onNewUnit, onOpenUnit, onDeleteUnit, onBack,
}: Props) {
  const city = getCityById(project.location);

  return (
    <div className="flex flex-col flex-1" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-3)' }}
            title="უკან"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
          >
            <Layers size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
              პროექტი
            </div>
            <div className="text-base font-bold truncate" style={{ color: 'var(--navy)' }}>
              {project.name}
            </div>
          </div>
        </div>
        <button
          onClick={onNewUnit}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 mr-12"
          style={{ background: 'var(--blue)', color: '#fff' }}
        >
          <Plus size={14} /> ახალი AHU
        </button>
      </header>

      {/* Project info */}
      <div
        className="border-b px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-1"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        {city && (
          <Info icon={<MapPin size={11} />} label={`${city.name} · ${city.nameEn}`} />
        )}
        {project.engineer && (
          <Info icon={<User size={11} />} label={project.engineer} />
        )}
        <Info icon={<Calendar size={11} />} label={`შექმნილი: ${project.date}`} />
        <Info
          icon={<Wind size={11} />}
          label={`${project.units.length} AHU ${project.units.length === 1 ? 'მოდული' : 'მოდული'}`}
        />
        {project.description && (
          <Info icon={<FileText size={11} />} label={project.description} />
        )}
      </div>

      {/* Content */}
      <main className="flex-1 p-6">
        {project.units.length === 0 ? (
          <EmptyUnits onNewUnit={onNewUnit} />
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
                AHU მოდულები
              </h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                {project.units.length} ერთეული
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {project.units.map((u) => (
                <UnitCard
                  key={u.id}
                  unit={u}
                  onOpen={() => onOpenUnit(u.id)}
                  onDelete={() => onDeleteUnit(u.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Info({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-2)' }}>
      <span style={{ color: 'var(--text-3)' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function EmptyUnits({ onNewUnit }: { onNewUnit: () => void }) {
  return (
    <div
      className="rounded-xl border p-8 md:p-12 flex flex-col items-center text-center gap-4"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', borderStyle: 'dashed' }}
    >
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
      >
        <Wind size={24} strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--navy)' }}>
          ჯერ AHU არ გაქვს ამ პროექტში
        </h3>
        <p className="text-xs max-w-md" style={{ color: 'var(--text-2)' }}>
          ერთ პროექტში შეიძლება იყოს 1–20+ AHU. დაამატე პირველი მოდული ASHRAE სელექციის დასაწყებად.
        </p>
      </div>
      <button
        onClick={onNewUnit}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all"
        style={{ background: 'var(--blue)', color: '#fff' }}
      >
        <Plus size={14} /> ახალი AHU
      </button>
    </div>
  );
}

function UnitCard({
  unit, onOpen, onDelete,
}: {
  unit: AhuUnit;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;
  const accent = ahuSpec?.accent ?? 'var(--text-3)';

  return (
    <div
      className="group relative rounded-xl border p-4 transition-all hover:-translate-y-0.5 cursor-pointer"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', boxShadow: 'var(--shadow-card)' }}
      onClick={onOpen}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`წავშალოთ ${unit.name}?`)) onDelete();
        }}
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-3)' }}
        title="წაშლა"
      >
        <Trash2 size={12} />
      </button>

      <div className="flex items-start gap-2 mb-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 12%, var(--sur))`, color: accent }}
        >
          <Wind size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--navy)' }}>
            {unit.name}
          </h3>
          {ahuSpec ? (
            <span
              className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: `color-mix(in srgb, ${ahuSpec.accent} 12%, var(--sur))`,
                color: ahuSpec.accent,
              }}
            >
              {ahuSpec.shortLabel}
            </span>
          ) : (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              draft · ტიპი არ არის შერჩეული
            </span>
          )}
        </div>
      </div>

      {unit.description && (
        <p className="text-[11px] mb-3 line-clamp-2" style={{ color: 'var(--text-2)' }}>
          {unit.description}
        </p>
      )}

      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
          <Calendar size={10} />
          <span>შექმნილი: {unit.date}</span>
        </div>
        {unit.modified !== unit.date && (
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
            <Calendar size={10} />
            <span>განახლებული: {unit.modified}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: 'var(--bdr)' }}>
        <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-3)' }}>
          {unit.id.slice(-7)}
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
