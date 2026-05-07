'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Boxes, Box, Filter, Snowflake, Flame, Fan,
  ArrowLeftRight, PanelTopOpen, Shuffle, Droplet, Volume2,
  ChevronDown, Trash2, Plus, Power, Zap,
  Move3d, RectangleHorizontal, RectangleVertical, Square,
  GripVertical, AlertTriangle, Info,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AhuUnit } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import type { SectionConfig, SectionType, FilterClass, FilterForm, FilterParams } from '@/lib/ahu-ashrae/sections';
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

// ─── Quick-toggle chips (canonical ASHRAE order, left → right) ────────────────
type ChipDef =
  | { kind: 'simple'; type: SectionType; rank: number; label: string; sub?: string; icon: LucideIcon }
  | { kind: 'filter'; filterClass: FilterClass; rank: number; label: string; sub: string; icon: LucideIcon };

const CHIPS: ChipDef[] = [
  { kind: 'simple',  type: 'damper',         rank: 10,  label: 'დემპერი',       icon: PanelTopOpen },
  { kind: 'filter',  filterClass: 'G4',      rank: 20,  label: 'G4',             sub: 'მსხვილი',     icon: Filter },
  { kind: 'filter',  filterClass: 'M5',      rank: 21,  label: 'M5',             sub: 'საშუალო',     icon: Filter },
  { kind: 'filter',  filterClass: 'F7',      rank: 22,  label: 'F7',             sub: 'წვრილი',      icon: Filter },
  { kind: 'filter',  filterClass: 'F9',      rank: 23,  label: 'F9',             sub: 'წვრილი',      icon: Filter },
  { kind: 'filter',  filterClass: 'carbon',  rank: 24,  label: 'ნახშირი',       sub: 'გაზი/სუნი',   icon: Filter },
  { kind: 'filter',  filterClass: 'electric',rank: 25,  label: 'ESP',            sub: 'ელექტროსტ.',  icon: Zap },
  { kind: 'filter',  filterClass: 'H13',     rank: 26,  label: 'H13',            sub: 'HEPA',         icon: Filter },
  { kind: 'simple',  type: 'heat_recovery',  rank: 30,  label: 'რეკუპერატორი',  icon: ArrowLeftRight },
  { kind: 'simple',  type: 'mixing_box',     rank: 35,  label: 'შერევა',        icon: Shuffle },
  { kind: 'simple',  type: 'preheat',        rank: 40,  label: 'წინა გათბობა',  icon: Flame },
  { kind: 'simple',  type: 'cooling_coil',   rank: 50,  label: 'გაგრილება',     icon: Snowflake },
  { kind: 'simple',  type: 'reheat',         rank: 60,  label: 'უკანა გათბობა', icon: Flame },
  { kind: 'simple',  type: 'humidifier',     rank: 70,  label: 'გამატენიანებ.', icon: Droplet },
  { kind: 'simple',  type: 'fan',            rank: 80,  label: 'ვენტილატორი',   icon: Fan },
  { kind: 'simple',  type: 'silencer',       rank: 90,  label: 'ხმოვანი დამც.', icon: Volume2 },
];

// ─── Filter form (physical construction) ──────────────────────────────────────
const FILTER_FORM_LABEL: Record<FilterForm, string> = {
  panel:       'Panel (ბრტყელი)',
  pleated:     'Pleated (ნაკეცი)',
  bag:         'Bag / Pocket (ჯიბე)',
  w_type:      'W-type (კომპაქტ. ხისტი)',
  v_bank:      'V-bank',
  cassette:    'Cassette (HEPA)',
  cylindrical: 'Cylindrical (ნახშ.)',
  plate:       'Plate (ESP)',
};

const FILTER_FORM_SHORT: Record<FilterForm, string> = {
  panel:       'panel',
  pleated:     'pleat',
  bag:         'bag',
  w_type:      'W',
  v_bank:      'V',
  cassette:    'cass',
  cylindrical: 'cyl',
  plate:       'plate',
};

/** Realistic forms per class (ISO 16890 / EN 1822 practice). */
const FILTER_FORM_OPTIONS: Record<FilterClass, FilterForm[]> = {
  G4:       ['panel', 'pleated'],
  M5:       ['panel', 'pleated', 'bag'],
  F7:       ['bag', 'w_type', 'v_bank', 'pleated'],
  F9:       ['bag', 'w_type', 'v_bank'],
  H13:      ['cassette', 'v_bank'],
  H14:      ['cassette'],
  carbon:   ['panel', 'cylindrical', 'v_bank'],
  electric: ['plate'],
};

const DEFAULT_FORM_BY_CLASS_UI: Record<FilterClass, FilterForm> = {
  G4:       'panel',
  M5:       'bag',
  F7:       'bag',
  F9:       'bag',
  H13:      'cassette',
  H14:      'cassette',
  carbon:   'panel',
  electric: 'plate',
};

function chipMatches(s: SectionConfig, chip: ChipDef): boolean {
  if (chip.kind === 'simple') return s.spec.type === chip.type;
  return s.spec.type === 'filter' && s.spec.params.filterClass === chip.filterClass;
}

function rankOfSection(s: SectionConfig): number {
  const c = CHIPS.find((x) => chipMatches(s, x));
  return c?.rank ?? 99;
}

function chipColor(chip: ChipDef): string {
  return chip.kind === 'filter'
    ? SECTION_VISUALS.filter.color
    : SECTION_VISUALS[chip.type].color;
}

interface Props {
  state: AhuWizardState;
  unit: AhuUnit;
  onUpdate: (patch: Partial<AhuWizardState>) => void;
  chain?: ChainResult;
}

export function StepComponents({ state, unit, onUpdate, chain }: Props) {
  const airflow = state.airflow.supplyAirflow;
  const tier = pickTier(airflow);
  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;
  const flowLabel = ahuSpec?.shortLabel ?? '—';
  const sections = state.sections ?? [];

  // Persistent list of standards violations in the current chain
  const violations: OrderViolation[] = useMemo(
    () => validateOrder(sections, unit.ahuType ?? undefined),
    [sections, unit.ahuType],
  );

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

  const setFilterForm = (idx: number, form: FilterForm) => {
    const next = sections.map((s, i) => {
      if (i !== idx || s.spec.type !== 'filter') return s;
      const params: FilterParams = { ...s.spec.params, form };
      return { ...s, spec: { type: 'filter' as const, params } };
    });
    setSections(next);
  };

  const setFilterClass = (idx: number, filterClass: FilterClass) => {
    const next = sections.map((s, i) => {
      if (i !== idx || s.spec.type !== 'filter') return s;
      const allowed = FILTER_FORM_OPTIONS[filterClass];
      const currentForm = s.spec.params.form ?? DEFAULT_FORM_BY_CLASS_UI[s.spec.params.filterClass];
      const form = allowed.includes(currentForm) ? currentForm : DEFAULT_FORM_BY_CLASS_UI[filterClass];
      const params: FilterParams = { ...s.spec.params, filterClass, form };
      return { ...s, spec: { type: 'filter' as const, params } };
    });
    setSections(next);
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
  // Ref mirrors keep event handlers reading fresh values without stale closures
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<{ idx: number; pos: 'before' | 'after' } | null>(null);

  const handleDragStart = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    dragFromRef.current = idx;
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    if (dragFromRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const cur = dragOverRef.current;
    if (cur?.idx === idx && cur.pos === pos) return;
    const next = { idx, pos };
    dragOverRef.current = next;
    setDragOver(next);
  };
  const handleDrop = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = dragFromRef.current;
    if (from === null) return;
    const over = dragOverRef.current;
    let target = idx + (over?.idx === idx && over.pos === 'after' ? 1 : 0);
    // splice() math: when moving forward, the removal shifts indexes left by 1
    if (from < target) target -= 1;
    target = Math.max(0, Math.min(target, sections.length - 1));
    reorderSection(from, target);
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragFrom(null);
    setDragOver(null);
  };
  const handleDragEnd = () => {
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragFrom(null);
    setDragOver(null);
  };

  // Enabled sections mapped to viewer data + process state from chain
  const viewerSections = useMemo(
    () => sections
      .filter((s) => s.enabled)
      .map((s, i) => {
        const v = SECTION_VISUALS[s.spec.type];
        // chain.states[0] = outdoor inlet; chain.states[i+1] = outlet of enabled section i
        const outletNode = chain?.states[i + 1];
        return {
          id: s.id,
          label: s.label,
          color: v.color,
          width: v.width3D,
          type: s.spec.type,
          outletTdb: outletNode?.state.tdb,
          outletRh: outletNode?.state.rh,
          outletW: outletNode?.state.w,
          energyKw: outletNode?.energy,
          deltaP: outletNode?.deltaP,
        };
      }),
    [sections, chain],
  );

  const inletState = chain?.states[0]
    ? { tdb: chain.states[0].state.tdb, rh: chain.states[0].state.rh, w: chain.states[0].state.w }
    : undefined;

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
    <div className="space-y-5">
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
        <div className="flex flex-col gap-1.5 mb-4">
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
              onSetFilterForm={(form) => setFilterForm(i, form)}
              onSetFilterClass={(cls) => setFilterClass(i, cls)}
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        <AddSectionPicker onAdd={addSection}  />

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
                inletState={inletState}
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
  onSetFilterForm: (form: FilterForm) => void;
  onSetFilterClass: (cls: FilterClass) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}
function SectionRow({
  section, index, total, isDragSource, dragOverPos, hasViolation,
  onMove, onToggle, onRemove, onSetFilterForm, onSetFilterClass,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: RowProps) {
  const Icon = ICON_MAP[section.spec.type];
  const visual = SECTION_VISUALS[section.spec.type];
  const enabled = section.enabled;
  // Only allow drag to start from the grip handle
  const dragAllowed = useRef(false);
  return (
    <div className="relative">
      {dragOverPos === 'before' && <DropIndicator side="top" />}
      <div
        draggable
        onDragStart={(e) => {
          if (!dragAllowed.current) { e.preventDefault(); return; }
          dragAllowed.current = false;
          onDragStart(e);
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className="flex items-center gap-2 px-2 py-2 rounded-lg border transition-shadow"
        style={{
          background: enabled ? 'var(--sur)' : 'var(--sur-2)',
          borderColor: hasViolation ? '#f87171' : 'var(--bdr)',
          opacity: isDragSource ? 0.4 : enabled ? 1 : 0.55,
          boxShadow: hasViolation ? '0 0 0 1px #fca5a5 inset' : undefined,
          cursor: 'default',
        }}
      >
        {/* Drag handle — only this activates drag */}
        <span
          className="shrink-0 p-1 rounded text-[var(--text-3)] hover:bg-[var(--bdr)]"
          style={{ cursor: 'grab' }}
          title="გადატანა — დააჭირე და გადაიტანე"
          onMouseDown={() => { dragAllowed.current = true; }}
          onMouseUp={() => { dragAllowed.current = false; }}
          onMouseLeave={() => { dragAllowed.current = false; }}
        >
          <GripVertical size={13} />
        </span>

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
          <div className="text-[10px] font-mono flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-3)' }}>
            <span>{TYPE_LABELS_KA[section.spec.type]} · #{index + 1}</span>
            {section.spec.type === 'filter' && (
              <FilterRowPickers
                params={section.spec.params}
                onSetClass={onSetFilterClass}
                onSetForm={onSetFilterForm}
              />
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

function FilterRowPickers({
  params, onSetClass, onSetForm,
}: {
  params: FilterParams;
  onSetClass: (cls: FilterClass) => void;
  onSetForm: (form: FilterForm) => void;
}) {
  const currentClass = params.filterClass;
  const currentForm = params.form ?? DEFAULT_FORM_BY_CLASS_UI[currentClass];
  const formOptions = FILTER_FORM_OPTIONS[currentClass];
  const allClasses: FilterClass[] = ['G4', 'M5', 'F7', 'F9', 'carbon', 'electric', 'H13', 'H14'];
  return (
    <span
      className="inline-flex items-center gap-1"
      onMouseDown={(e) => e.stopPropagation()}
      draggable={false}
    >
      <select
        value={currentClass}
        onChange={(e) => onSetClass(e.target.value as FilterClass)}
        className="rounded px-1 py-0.5 border text-[10px] font-mono cursor-pointer focus:outline-none focus:ring-1"
        style={{
          background: 'var(--blue-lt)',
          borderColor: 'var(--blue-bd)',
          color: 'var(--blue)',
        }}
        title="ფილტრის კლასი"
        onClick={(e) => e.stopPropagation()}
      >
        {allClasses.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={currentForm}
        onChange={(e) => onSetForm(e.target.value as FilterForm)}
        className="rounded px-1 py-0.5 border text-[10px] font-mono cursor-pointer focus:outline-none focus:ring-1"
        style={{
          background: 'var(--sur-2)',
          borderColor: 'var(--bdr-2)',
          color: 'var(--text-2)',
        }}
        title="ფილტრის ფორმა / კონსტრუქცია"
        onClick={(e) => e.stopPropagation()}
      >
        {formOptions.map((f) => (
          <option key={f} value={f}>
            {FILTER_FORM_SHORT[f]}
          </option>
        ))}
      </select>
    </span>
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
            {v.conflictWith >= 0 ? (
              <>
                <span className="font-mono opacity-70">#{v.conflictWith + 1}→#{v.index + 1}</span>{' '}
                <span className="opacity-80">
                  ({TYPE_LABELS_KA[sections[v.conflictWith]?.spec.type] ?? '—'} → {TYPE_LABELS_KA[sections[v.index]?.spec.type] ?? '—'})
                </span>
                : {v.message}
              </>
            ) : (
              <>
                <span className="font-mono opacity-70">#{v.index + 1}</span>{' '}
                <span className="opacity-80">({TYPE_LABELS_KA[sections[v.index]?.spec.type] ?? '—'})</span>
                : {v.message}
              </>
            )}
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

function AddSectionPicker({ onAdd, ahuType }: { onAdd: (t: SectionType) => void; ahuType?: string }) {
  const [open, setOpen] = useState(false);
  const allTypes: SectionType[] = [
    'damper', 'filter', 'mixing_box', 'heat_recovery',
    'preheat', 'cooling_coil', 'reheat', 'humidifier', 'fan', 'silencer',
  ];
  // heat_recovery requires an exhaust stream — unavailable in direct-flow (supply_only) units
  const types = ahuType === 'supply_only'
    ? allTypes.filter((t) => t !== 'heat_recovery')
    : allTypes;
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
