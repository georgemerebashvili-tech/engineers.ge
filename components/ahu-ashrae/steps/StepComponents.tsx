'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Boxes, Box, Filter, Snowflake, Flame, Fan, Wind,
  ArrowLeftRight, PanelTopOpen, Shuffle, Droplet, Volume2,
  ChevronUp, ChevronDown, Trash2, Plus, RefreshCw, Power,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AhuUnit } from '@/lib/ahu-ashrae/types';
import type { SectionConfig, SectionType } from '@/lib/ahu-ashrae/sections';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';
import { SECTION_VISUALS, makeDefaultParams } from '@/lib/ahu-ashrae/section-visuals';
import { listPresets, buildPreset, type PresetId } from '@/lib/ahu-ashrae/section-presets';

const AhuStlViewer = dynamic(
  () => import('../AhuStlViewer').then((m) => m.AhuStlViewer),
  { ssr: false, loading: () => <ViewerLoading /> },
);

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

  const setSections = (next: SectionConfig[]) => {
    onUpdate({ sections: next.map((s, i) => ({ ...s, order: i })) });
  };

  const handlePresetChange = (id: PresetId) => {
    const oaF = state.airflow.oaFraction ?? 0.3;
    const built = buildPreset(id, { oaFraction: oaF });
    onUpdate({ sectionPresetId: id, sections: built });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-5">
      {/* ── Section editor ── */}
      <section
        className="rounded-xl border p-5"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Boxes size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              სექციათა ჯაჭვი
            </h2>
          </div>
          <PresetSelector value={state.sectionPresetId} onChange={handlePresetChange} />
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
              onMove={(dir) => moveSection(i, dir)}
              onToggle={() => toggleSection(i)}
              onRemove={() => removeSection(i)}
            />
          ))}
        </div>

        <AddSectionPicker onAdd={addSection} />

        <div
          className="mt-4 rounded-lg border p-3 text-[11px]"
          style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)', color: 'var(--text-2)' }}
        >
          <strong>შენიშვნა:</strong> სექციები ცვლის ჰაერის T/W/RH/ΔP-ს თანმიმდევრულად. რასაც გათიშავ — ჯაჭვში არ მონაწილეობს. დეტალური რედაქტირება (target T, ΔP, ეფექტურობა) — შემდეგ iteration-ში.
        </div>
      </section>

      {/* ── 3D viewer ── */}
      <section
        className="rounded-xl border p-5 flex flex-col"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Box size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              3D ნახვა
            </h2>
          </div>
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {viewerSections.length} სექცია
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
          orbit / zoom — მაუსით. სექციათა რიგი ცოცხლად აისახება.
        </p>

        <div
          className="flex-1 rounded-lg overflow-hidden min-h-[420px] border"
          style={{ borderColor: 'var(--bdr)', background: 'linear-gradient(180deg, #eef3f9 0%, #d8e2ee 100%)' }}
        >
          {viewerSections.length > 0 ? (
            <AhuStlViewer sections={viewerSections} />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PresetSelector({ value, onChange }: { value?: PresetId; onChange: (id: PresetId) => void }) {
  return (
    <div className="flex items-center gap-2">
      <RefreshCw size={12} style={{ color: 'var(--text-3)' }} />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as PresetId)}
        className="text-[11px] font-medium rounded-md border px-2 py-1"
        style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur)', color: 'var(--text)' }}
      >
        <option value="" disabled>preset…</option>
        {listPresets().map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}

interface RowProps {
  section: SectionConfig;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onRemove: () => void;
}
function SectionRow({ section, index, total, onMove, onToggle, onRemove }: RowProps) {
  const Icon = ICON_MAP[section.spec.type];
  const visual = SECTION_VISUALS[section.spec.type];
  const enabled = section.enabled;
  return (
    <div
      className="flex items-center gap-2 px-2 py-2 rounded-lg border"
      style={{
        background: enabled ? 'var(--sur)' : 'var(--sur-2)',
        borderColor: enabled ? 'var(--bdr)' : 'var(--bdr)',
        opacity: enabled ? 1 : 0.55,
      }}
    >
      {/* Color chip */}
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
        <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{section.label}</div>
        <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
          {TYPE_LABELS_KA[section.spec.type]} · #{index + 1}
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
