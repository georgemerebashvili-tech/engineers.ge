'use client';

import React from 'react';
import {
  Plus, Wind, FolderOpen, FolderClosed, ChevronDown, ChevronRight,
  Trash2, MapPin,
} from 'lucide-react';
import type { AhuProject } from '@/lib/ahu-ashrae/types';
import { resolveCity } from '@/lib/ahu-ashrae/climate-data';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

interface Props {
  projects: AhuProject[];
  activeProjectId: string | null;
  activeUnitId: string | null;
  expandedProjects: Set<string>;
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onOpenUnit: (projectId: string, unitId: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteUnit: (projectId: string, unitId: string) => void;
}

export function AhuProjectsRail({
  projects, activeProjectId, activeUnitId, expandedProjects,
  onNewProject, onOpenProject, onToggleExpand,
  onOpenUnit, onDeleteProject, onDeleteUnit,
}: Props) {
  const totalUnits = projects.reduce((s, p) => s + p.units.length, 0);

  return (
    <aside
      className="w-[230px] shrink-0 border-r flex flex-col overflow-hidden"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--bdr)' }}>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            AHU Workspace
          </div>
          <div className="text-[11px] font-mono" style={{ color: 'var(--text)' }}>
            {projects.length} პროექტი · {totalUnits} AHU
          </div>
        </div>
        <button
          onClick={onNewProject}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all"
          style={{ background: 'var(--blue)', color: '#fff' }}
          title="ახალი პროექტი"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.length === 0 ? (
          <EmptyRail onNewProject={onNewProject} />
        ) : (
          <ul className="px-1.5 space-y-0.5">
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                isActive={activeProjectId === p.id}
                activeUnitId={activeUnitId}
                isExpanded={expandedProjects.has(p.id)}
                onOpen={() => onOpenProject(p.id)}
                onToggle={() => onToggleExpand(p.id)}
                onOpenUnit={(unitId) => onOpenUnit(p.id, unitId)}
                onDelete={() => onDeleteProject(p.id)}
                onDeleteUnit={(unitId) => onDeleteUnit(p.id, unitId)}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyRail({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
      <div
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}
      >
        <FolderOpen size={18} strokeWidth={1.5} />
      </div>
      <div className="text-[11px] leading-snug" style={{ color: 'var(--text-3)' }}>
        ჯერ პროექტი არ გაქვს. დაიწყე ახალი AHU პროექტის რეგისტრაციით.
      </div>
      <button
        onClick={onNewProject}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all"
        style={{ background: 'var(--blue)', color: '#fff' }}
      >
        <Plus size={12} /> პროექტი
      </button>
    </div>
  );
}

// ─── Project row ─────────────────────────────────────────────────────────────

function ProjectRow({
  project, isActive, activeUnitId, isExpanded,
  onOpen, onToggle, onOpenUnit, onDelete, onDeleteUnit,
}: {
  project: AhuProject;
  isActive: boolean;
  activeUnitId: string | null;
  isExpanded: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onOpenUnit: (unitId: string) => void;
  onDelete: () => void;
  onDeleteUnit: (unitId: string) => void;
}) {
  const city = resolveCity(project.location, project.customCity);
  const hasUnits = project.units.length > 0;

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded-md transition-all"
        style={{
          background: isActive && !activeUnitId ? 'var(--blue-lt)' : 'transparent',
          borderLeft: isActive && !activeUnitId ? '2px solid var(--blue)' : '2px solid transparent',
        }}
      >
        <button
          onClick={onToggle}
          className="p-1 transition-colors"
          style={{ color: 'var(--text-3)' }}
          aria-label="გაშლა"
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button
          onClick={onOpen}
          className="flex-1 flex items-center gap-1.5 py-1.5 pr-2 text-left min-w-0"
          style={{ color: isActive && !activeUnitId ? 'var(--blue)' : 'var(--text)' }}
        >
          {isExpanded
            ? <FolderOpen size={13} className="shrink-0" style={{ color: 'var(--blue)' }} />
            : <FolderClosed size={13} className="shrink-0" style={{ color: 'var(--text-3)' }} />}
          <span className="text-xs font-semibold truncate">{project.name}</span>
          {hasUnits && (
            <span
              className="ml-auto text-[9px] font-mono px-1 py-px rounded"
              style={{ background: 'var(--bdr)', color: 'var(--text-3)' }}
            >
              {project.units.length}
            </span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`წავშალოთ "${project.name}" და მისი ${project.units.length} AHU?`)) onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 transition-all"
          style={{ color: 'var(--text-3)' }}
          title="პროექტის წაშლა"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* City sub-info */}
      {city && isExpanded && (
        <div className="ml-6 -mt-0.5 mb-1 flex items-center gap-1 text-[9px] font-mono" style={{ color: 'var(--text-3)' }}>
          <MapPin size={9} />
          <span>{city.name}</span>
        </div>
      )}

      {/* Units */}
      {isExpanded && hasUnits && (
        <ul className="ml-4 border-l space-y-px pb-1" style={{ borderColor: 'var(--bdr)' }}>
          {project.units.map((u) => {
            const isUnitActive = isActive && activeUnitId === u.id;
            const ahuSpec = u.ahuType ? getAhuTypeSpec(u.ahuType) : null;
            return (
              <li key={u.id}>
                <div
                  className="group flex items-center gap-1 ml-1 rounded-md transition-all"
                  style={{
                    background: isUnitActive ? 'var(--blue-lt)' : 'transparent',
                    borderLeft: isUnitActive ? '2px solid var(--blue)' : '2px solid transparent',
                  }}
                >
                  <button
                    onClick={() => onOpenUnit(u.id)}
                    className="flex-1 flex items-center gap-1.5 py-1 px-1.5 text-left min-w-0"
                    style={{ color: isUnitActive ? 'var(--blue)' : 'var(--text-2)' }}
                  >
                    <Wind size={11} className="shrink-0" style={{ color: ahuSpec?.accent ?? 'var(--text-3)' }} />
                    <span className="text-[11px] font-medium truncate">{u.name}</span>
                    {ahuSpec && (
                      <span
                        className="ml-auto text-[8px] font-bold uppercase shrink-0 px-1 py-px rounded"
                        style={{
                          background: `color-mix(in srgb, ${ahuSpec.accent} 12%, var(--sur))`,
                          color: ahuSpec.accent,
                        }}
                      >
                        {ahuSpec.shortLabel.slice(0, 7)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`წავშალოთ ${u.name}?`)) onDeleteUnit(u.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                    style={{ color: 'var(--text-3)' }}
                    title="AHU წაშლა"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {isExpanded && !hasUnits && (
        <div
          className="ml-6 mb-1 px-2 py-1 text-[10px] italic"
          style={{ color: 'var(--text-3)' }}
        >
          ცარიელია — დაამატე AHU
        </div>
      )}
    </li>
  );
}
