'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Boxes, Box, Filter, Snowflake, Flame, Fan,
  ArrowLeftRight, PanelTopOpen, Shuffle, Droplet, Volume2,
  ChevronUp, ChevronDown, Trash2, Plus, Power,
  Move3d, RectangleHorizontal, RectangleVertical, Square,
  GripVertical, AlertTriangle, Info,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AhuUnit } from '@/lib/ahu-ashrae/types';
import type { SectionConfig, SectionType } from '@/lib/ahu-ashrae/sections';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';
import { SECTION_VISUALS, makeDefaultParams, CASING_KG_PER_M } from '@/lib/ahu-ashrae/section-visuals';
import {
  validateOrder,
  tryReorder,
  ORDER_RULE_LEGEND,
  type OrderViolation,
} from '@/lib/ahu-ashrae/section-order-rules';
import { AhuOrthoSchematic, type AhuOrthoView } from '../AhuOrthoSchematic';

type AhuViewMode = 'persp' | AhuOrthoView;

const AhuStlViewer = dynamic(
  () => import('../AhuStlViewer').then((m) => m.AhuStlViewer),
  { ssr: false, loading: () => <ViewerLoading /> },
);

const VIEW_BUTTONS: Array<{ id: AhuViewMode; icon: LucideIcon; label: string; title: string }> = [
  { id: 'persp', icon: Move3d,              label: '3D',     title: 'პერსპექტივა — orbit' },
  { id: 'side',  icon: RectangleHorizontal, label: 'გვერდი', title: 'გვერდხედი — სიგრძე × სიმაღლე' },
  { id: 'front', icon: Square,              label: 'წინა',   title: 'წინხედი — სიღრმე × სიმაღლე' },
  { id: 'top',   icon: RectangleVertical,   label: 'ზემო',   title: 'ზედხედი — სიგრძე × სიღრმე' },
];

const ICON_MAP: Record<SectionType, LucideIcon> = {
  damper: PanelTopOpen,
  filter: Filter,
  mixing_box: Shuffle,
  heat_recovery: ArrowLeftRight,
  preheat: Flame,
  cooling_coil: Snowflake,
  reheat: Flame,
  humidifier: Droplet,
  fan: Fan,
  silencer: Volume2,
};

const TYPE_LABELS_KA: Record<SectionType, string> = {
  damper: 'დემპერი',
  filter: 'ფილტრი',
  mixing_box: 'შერევის ყუთი',
  heat_recovery: 'რეკუპერატორი',
  preheat: 'წინა გათბობა',
  cooling_coil: 'გამაგრილებელი',
  reheat: 'უკანა გათბობა',
  humidifier: 'გამატენიანებელი',
  fan: 'ვენტილატორი',
  silencer: 'ხმოვანი დამცავი',
};

interface Props {
  state: AhuWizardState;
  unit: AhuUnit;
  onUpdate: (patch: Partial<AhuWizardState>) => void;
}

export function StepComponents({ state, unit, onUpdate }: Props) {
  const airflow = state.airflow.supplyAirflow;
  const tier = pickTier(airflow);
  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;
  const flowLabel = ahuSpec?.shortLabel ?? '—';
  const sections = state.sections ?? [];

  // Persistent list of standards violations in the current chain
  const violations: OrderViolation[] = useMemo(() => validateOrder(sections), [sections]);

  // Transient explanation shown after a rejected drag/move (auto-dismisses)
  const [rejection, setRejection] = useState<{ msg: string; ts: number } | null>(null);
  useEffect(() => {
    if (!rejection) return;
    const t = setTimeout(() => setRejection(null), 5000);
    return () => clearTimeout(t);
  }, [rejection]);

  const setSections = (next: SectionConfig[]) => {
    onUpdate({ sections: next.map((s, i) => ({ ...s, order: i })) });
  };

  const reorderSection = (fromIdx: number, toIdx: number) => {
    const result = tryReorder(sections, fromIdx, toIdx);
    if (!result.ok) {
      setRejection({ msg: result.reason, ts: Date.now() });
      return false;
    }
    setSections(result.next);
    return true;
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    reorderSection(idx, idx + dir);
  };

  const toggleSection = (idx: number) => {
    const next = sections.map((s, i) => (i === idx ? { ...s, enabled: !s.enabled } : s));
    setSections(next);
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const addSection = (type: SectionType) => {
    const visual = SECTION_VISUALS[type];
    const id = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newSec: SectionConfig = {
      id, label: visual.defaultLabel, enabled: true, order: sections.length,
      spec: { type, params: makeDefaultParams(type) as never },
    };
    setSections([...sections, newSec]);
  };

  // ── Drag-and-drop state (HTML5 native DnD) ─────────────────────────────────
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<{ idx: number; pos: 'before' | 'after' } | null>(null);

  const handleDragStart = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Some browsers refuse to start drag without a payload
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    if (dragFrom === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOver((prev) => (prev?.idx === idx && prev.pos === pos ? prev : { idx, pos }));
  };
  const handleDrop = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragFrom === null) return;
    let target = idx + (dragOver?.idx === idx && dragOver.pos === 'after' ? 1 : 0);
    // splice() math: when moving forward, the removal shifts indexes left by 1
    if (dragFrom < target) target -= 1;
    target = Math.max(0, Math.min(target, sections.length - 1));
    reorderSection(dragFrom, target);
    setDragFrom(null);
    setDragOver(null);
  };
  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  // 3D viewer: only enabled sections, mapped to box visuals
  const viewerSections = useMemo(
    () => sections
      .filter((s) => s.enabled)
      .map((s) => {
        const v = SECTION_VISUALS[s.spec.type];
        return { id: s.id, label: s.label, color: v.color, width: v.width3D };
      }),
    [sections],
  );

  // Aggregate weight: components + casing per linear metre
  const totalWeightKg = useMemo(() => {
    if (viewerSections.length === 0) return 0;
    const totalLenM = viewerSections.reduce((s, x) => s + x.width, 0);
    const enabledTypes = sections.filter((s) => s.enabled).map((s) => s.spec.type);
    const componentKg = enabledTypes.reduce((sum, t) => sum + (SECTION_VISUALS[t]?.weightKg ?? 0), 0);
    const casingKg = totalLenM * CASING_KG_PER_M;
    return componentKg + casingKg;
  }, [sections, viewerSections]);

  const [viewMode, setViewMode] = useState<AhuViewMode>('persp');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,340px)_1fr] gap-5">
      {/* ── Section editor ── */}
      <section
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Boxes size={16} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            სექციათა ჯაჭვი
          </h2>
        </div>

        {/* Selected model summary */}
        <div
          className="rounded-lg p-3 mb-4 border flex items-center justify-between"
          style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
        >
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--blue)' }}>
              შერჩეული მოდელი
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--navy)' }}>
              AHU-{tier} · {flowLabel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--blue)' }}>
              ხარჯი / სექციები
            </div>
            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: 'var(--navy)' }}>
              {airflow.toLocaleString('en-US')} m³/h · {sections.filter((s) => s.enabled).length}/{sections.length}
            </div>
          </div>
        </div>

        {/* Persistent violation banner */}
        {violations.length > 0 && (
          <ViolationBanner
            violations={violations}
            sections={sections}
          />
        )}

        {/* Transient drag-rejection toast */}
        {rejection && (
          <div
            className="mb-3 rounded-lg border p-3 text-[11px] flex items-start gap-2"
            style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}
            role="status"
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold mb-0.5">გადატანა აკრძალულია</div>
              <div>{rejection.msg}</div>
            </div>
          </div>
        )}

        {/* Section list */}
        <div className="flex flex-col gap-1.5 mb-4" onDragEnd={handleDragEnd}>
          {sections.length === 0 && (
            <div
              className="rounded-lg border-2 border-dashed p-8 text-center text-xs"
              style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-3)' }}
            >
              ჯერ სექცია არ არის. აირჩიე preset ან დაამატე ხელით.
            </div>
          )}
          {sections.map((s, i) => (
            <SectionRow
              key={s.id}
              section={s}
              index={i}
              total={sections.length}
              isDragSource={dragFrom === i}
              dragOverPos={dragOver?.idx === i ? dragOver.pos : null}
              hasViolation={violations.some((v) => v.index === i || v.conflictWith === i)}
              onMove={(dir) => moveSection(i, dir)}
              onToggle={() => toggleSection(i)}
              onRemove={() => removeSection(i)}
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
            />
          ))}
        </div>

        <AddSectionPicker onAdd={addSection} />

        <RuleLegend />
      </section>

      {/* ── Viewer (single panel, view-mode toolbar) ── */}
      <section
        className="rounded-xl border p-4 flex flex-col min-w-0"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Box size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              {viewMode === 'persp' ? '3D ნახვა' : 'ორთოგრაფიული ხედი'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToolbar value={viewMode} onChange={setViewMode} />
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              {viewerSections.length} სექცია
            </div>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
          {viewMode === 'persp'
            ? 'orbit / zoom — მაუსით. სექციათა რიგი ცოცხლად აისახება.'
            : 'ორთოგრაფიული ხედი — ზომები მმ-ში, სრული გაბარიტი + წონა title block-ში.'}
        </p>

        <div
          className="flex-1 rounded-lg overflow-hidden border"
          style={{
            borderColor: 'var(--bdr)',
            background: viewMode === 'persp'
              ? 'linear-gradient(180deg, #eef3f9 0%, #d8e2ee 100%)'
              : '#f7f9fc',
            minHeight: 480,
          }}
        >
          {viewerSections.length > 0 ? (
            viewMode === 'persp' ? (
              <AhuStlViewer sections={viewerSections} />
            ) : (
              <AhuOrthoSchematic
                sections={viewerSections}
                view={viewMode}
                weightKg={totalWeightKg}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-3)' }}>
              არცერთი სექცია არ არის ჩართული
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ViewModeToolbar({
  value, onChange,
}: {
  value: AhuViewMode;
  onChange: (v: AhuViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
      {VIEW_BUTTONS.map((b) => {
        const Icon = b.icon;
        const active = value === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            title={b.title}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors"
            style={
              active
                ? { background: 'var(--blue)', color: '#fff' }
                : { background: 'var(--sur)', color: 'var(--text-3)' }
            }
          >
            <Icon size={11} />
            <span>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RowProps {
  section: SectionConfig;
  index: number;
  total: number;
  isDragSource: boolean;
  dragOverPos: 'before' | 'after' | null;
  hasViolation: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}
function SectionRow({
  section, index, total, isDragSource, dragOverPos, hasViolation,
  onMove, onToggle, onRemove,
  onDragStart, onDragOver, onDrop,
}: RowProps) {
  const Icon = ICON_MAP[section.spec.type];
  const visual = SECTION_VISUALS[section.spec.type];
  const enabled = section.enabled;
  return (
    <div className="relative">
      {dragOverPos === 'before' && <DropIndicator side="top" />}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="flex items-center gap-2 px-2 py-2 rounded-lg border transition-shadow"
        style={{
          background: enabled ? 'var(--sur)' : 'var(--sur-2)',
          borderColor: hasViolation ? '#f87171' : 'var(--bdr)',
          opacity: isDragSource ? 0.4 : enabled ? 1 : 0.55,
          boxShadow: hasViolation ? '0 0 0 1px #fca5a5 inset' : undefined,
          cursor: 'default',
        }}
      >
        {/* Drag handle */}
        <span
          className="shrink-0 p-1 rounded text-[var(--text-3)] hover:bg-[var(--bdr)]"
          style={{ cursor: 'grab' }}
          title="გადატანა — დააჭირე და გადაიტანე"
        >
          <GripVertical size={13} />
        </span>

        {/* Up/Down chevrons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-[var(--bdr)] disabled:opacity-30"
            title="ზევით"
          >
            <ChevronUp size={10} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-[var(--bdr)] disabled:opacity-30"
            title="ქვევით"
          >
            <ChevronDown size={10} />
          </button>
        </div>

        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ background: visual.color, color: '#fff' }}
        >
          <Icon size={14} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
            {section.label}
            {hasViolation && (
              <AlertTriangle size={11} style={{ color: '#dc2626' }} />
            )}
          </div>
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {TYPE_LABELS_KA[section.spec.type]} · #{index + 1}
            {section.spec.type === 'filter' && (
              <span className="ml-1.5 px-1 rounded" style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}>
                {section.spec.params.filterClass}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onToggle}
          className="p-1.5 rounded-md transition-colors shrink-0"
          style={{ color: enabled ? 'var(--grn)' : 'var(--text-3)' }}
          title={enabled ? 'გათიშვა' : 'ჩართვა'}
        >
          <Power size={13} />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md transition-colors shrink-0"
          style={{ color: 'var(--text-3)' }}
          title="წაშლა"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {dragOverPos === 'after' && <DropIndicator side="bottom" />}
    </div>
  );
}

function DropIndicator({ side }: { side: 'top' | 'bottom' }) {
  return (
    <div
      className="absolute left-0 right-0 h-0.5 rounded-full pointer-events-none"
      style={{
        background: 'var(--blue)',
        boxShadow: '0 0 0 2px rgba(21,101,192,0.25)',
        [side]: -2,
      } as React.CSSProperties}
    />
  );
}

function ViolationBanner({
  violations, sections,
}: {
  violations: OrderViolation[];
  sections: SectionConfig[];
}) {
  // Show first 3 unique-by-rule for compactness
  const seen = new Set<string>();
  const top = violations.filter((v) => {
    if (seen.has(v.rule)) return false;
    seen.add(v.rule);
    return true;
  }).slice(0, 3);
  const more = violations.length - top.length;
  return (
    <div
      className="mb-3 rounded-lg border p-3 text-[11px]"
      style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 font-bold">
        <AlertTriangle size={12} />
        ჯაჭვი არღვევს AHU-ს სტანდარტს ({violations.length})
      </div>
      <ul className="space-y-1 list-disc pl-4">
        {top.map((v, i) => (
          <li key={i}>
            <span className="font-mono opacity-70">#{v.conflictWith + 1}→#{v.index + 1}</span>{' '}
            <span className="opacity-80">
              ({TYPE_LABELS_KA[sections[v.conflictWith]?.spec.type] ?? '—'} → {TYPE_LABELS_KA[sections[v.index]?.spec.type] ?? '—'})
            </span>
            : {v.message}
          </li>
        ))}
      </ul>
      {more > 0 && (
        <div className="mt-1.5 opacity-70">… და კიდევ {more} დარღვევა.</div>
      )}
    </div>
  );
}

function RuleLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mt-4 rounded-lg border text-[11px]"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)', color: 'var(--text-2)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--navy)' }}>
          <Info size={12} />
          AHU-ს თანმიმდევრობის წესები
        </span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1 list-disc">
          {ORDER_RULE_LEGEND.map((r) => (
            <li key={r.code}>{r.ka}</li>
          ))}
          <li className="opacity-70 mt-2">
            <strong>შენიშვნა:</strong> სექციები ცვლის ჰაერის T/W/RH/ΔP-ს თანმიმდევრულად.
            რასაც გათიშავ — ჯაჭვში არ მონაწილეობს. მაუსით გადატანა (drag) შესაძლებელია მხოლოდ წესების ფარგლებში.
          </li>
        </ul>
      )}
    </div>
  );
}

function AddSectionPicker({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  const types: SectionType[] = [
    'damper', 'filter', 'mixing_box', 'heat_recovery',
    'preheat', 'cooling_coil', 'reheat', 'humidifier', 'fan', 'silencer',
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border-2 border-dashed px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        style={{ borderColor: 'var(--blue-bd)', color: 'var(--blue)', background: 'var(--blue-lt)' }}
      >
        <Plus size={14} /> სექციის დამატება
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border shadow-lg overflow-hidden"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)' }}
        >
          <div className="grid grid-cols-2 gap-0.5 p-1">
            {types.map((t) => {
              const Icon = ICON_MAP[t];
              const v = SECTION_VISUALS[t];
              return (
                <button
                  key={t}
                  onClick={() => { onAdd(t); setOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors text-xs hover:bg-[var(--blue-lt)]"
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded shrink-0"
                    style={{ background: v.color, color: '#fff' }}
                  >
                    <Icon size={11} />
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{TYPE_LABELS_KA[t]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-3)' }}>
      3D viewer იტვირთება…
    </div>
  );
}

function pickTier(airflow: number): number {
  const tiers = [2000, 5000, 10000, 15000, 20000];
  for (const t of tiers) if (airflow <= t) return t;
  return tiers[tiers.length - 1];
}
