'use client';

import React, { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Plus,
  PanelTopOpen, Filter, Shuffle, ArrowLeftRight,
  Flame, Snowflake, Droplet, Fan, Volume2,
  type LucideIcon,
} from 'lucide-react';
import type {
  HousingSection, SectionConfig, SectionParams,
  SectionType, SlotKey,
} from '@/lib/ahu-ashrae/sections/types';
import { makeHousingId, SLOT_KEYS } from '@/lib/ahu-ashrae/sections/types';
import type { FilterClass, FilterForm, FilterParams } from '@/lib/ahu-ashrae/sections';
import { SECTION_VISUALS, SLOT_RULES, makeDefaultParams } from '@/lib/ahu-ashrae/section-visuals';
import { getActiveDrag, setActiveDrag, type DragPayload } from '@/lib/ahu-ashrae/dnd-state';

// ─── Static helpers ───────────────────────────────────────────────────────────

const ICON_LOOKUP: Record<string, LucideIcon> = {
  PanelTopOpen, Filter, Shuffle, ArrowLeftRight, Flame, Snowflake, Droplet, Fan, Volume2,
};
function iconFor(type: SectionType): LucideIcon {
  return ICON_LOOKUP[SECTION_VISUALS[type].iconName] ?? Filter;
}

function makeFreshSection(type: SectionType, defaultParams?: unknown): SectionConfig {
  return {
    id: `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    label: SECTION_VISUALS[type].defaultLabel,
    enabled: true,
    order: 0,
    spec: { type, params: defaultParams ?? makeDefaultParams(type) } as SectionParams,
  };
}

const FILTER_FORM_OPTS: Record<FilterClass, FilterForm[]> = {
  G4: ['panel', 'pleated'],
  M5: ['panel', 'pleated', 'bag'],
  F7: ['bag', 'w_type', 'v_bank', 'pleated'],
  F9: ['bag', 'w_type', 'v_bank'],
  H13: ['cassette', 'v_bank'],
  H14: ['cassette'],
  carbon: ['panel', 'cylindrical', 'v_bank'],
  electric: ['plate'],
};
const DEFAULT_FORM: Record<FilterClass, FilterForm> = {
  G4: 'panel', M5: 'bag', F7: 'bag', F9: 'bag',
  H13: 'cassette', H14: 'cassette', carbon: 'panel', electric: 'plate',
};
const FORM_SHORT: Record<FilterForm, string> = {
  panel: 'Panel', pleated: 'Pleated', bag: 'Bag', w_type: 'W-type',
  v_bank: 'V-bank', cassette: 'Cassette', cylindrical: 'Cyl.', plate: 'ESP',
};
const ALL_FILTER_CLASSES: FilterClass[] = ['G4', 'M5', 'F7', 'F9', 'H13', 'H14', 'carbon', 'electric'];

// ─── Public interface ─────────────────────────────────────────────────────────

interface Props {
  housings: HousingSection[];
  violatedIds: ReadonlySet<string>;
  onHousingsChange: (h: HousingSection[]) => void;
  onDropError: (msg: string | null) => void;
}

export function AhuCasingSchematic({ housings, violatedIds, onHousingsChange, onDropError }: Props) {
  const totalMm = Math.round(
    housings.flatMap(h => SLOT_KEYS.map(k => h.slots[k]).filter(Boolean))
      .reduce((sum, s) => sum + SECTION_VISUALS[s!.spec.type].width3D, 0) * 1000,
  );

  // Track active palette/slot drag globally so all valid empty slots light up
  const [globalDrag, setGlobalDrag] = useState<DragPayload | null>(null);
  useEffect(() => {
    const onStart = () => requestAnimationFrame(() => setGlobalDrag(getActiveDrag()));
    const onEnd   = () => setGlobalDrag(null);
    document.addEventListener('dragstart', onStart);
    document.addEventListener('dragend',   onEnd);
    return () => {
      document.removeEventListener('dragstart', onStart);
      document.removeEventListener('dragend',   onEnd);
    };
  }, []);

  function addHousing() {
    onHousingsChange([...housings, { id: makeHousingId(), slots: { left: null, center: null, right: null } }]);
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[8px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--text-3)' }}>ჰაერი</span>
        <svg width="30" height="8" viewBox="0 0 30 8">
          <polyline points="0,4 24,4 18,1.5 24,4 18,6.5"
            fill="none" stroke="var(--text-3)" strokeWidth="1.4"
            strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {housings.length > 0 && (
          <span className="text-[8px] font-mono" style={{ color: 'var(--text-3)' }}>
            ≈ {totalMm} mm · {housings.length} სექცია
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-max">
          {housings.map((h, i) => (
            <React.Fragment key={h.id}>
              {i > 0 && (
                <svg width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
                  <polyline points="0,5 14,5 9,2 14,5 9,8"
                    fill="none" stroke="var(--bdr)" strokeWidth="1.5"
                    strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              )}
              <HousingCard
                housing={h}
                index={i}
                total={housings.length}
                violatedIds={violatedIds}
                allHousings={housings}
                globalDrag={globalDrag}
                onHousingsChange={onHousingsChange}
                onDropError={onDropError}
              />
            </React.Fragment>
          ))}

          {housings.length > 0 && (
            <svg width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
              <polyline points="0,5 14,5 9,2 14,5 9,8"
                fill="none" stroke="var(--bdr)" strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          )}

          <button
            onClick={addHousing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0"
            style={{ background: 'var(--sur-2)', border: '1.5px dashed var(--bdr)', color: 'var(--text-3)' }}
            title="ახალი სექციის კორპუსი"
          >
            <Plus size={11} />
            <span>სექცია</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Housing Card ─────────────────────────────────────────────────────────────

interface HousingCardProps {
  housing: HousingSection;
  index: number;
  total: number;
  violatedIds: ReadonlySet<string>;
  allHousings: HousingSection[];
  globalDrag: DragPayload | null;
  onHousingsChange: (h: HousingSection[]) => void;
  onDropError: (msg: string | null) => void;
}

function HousingCard({ housing, index, total, violatedIds, allHousings, globalDrag, onHousingsChange, onDropError }: HousingCardProps) {
  const hasViolation = SLOT_KEYS.some(k => {
    const s = housing.slots[k];
    return s && violatedIds.has(s.id);
  });

  function updateHousings(updated: HousingSection) {
    const isEmpty = SLOT_KEYS.every(k => updated.slots[k] === null);
    if (isEmpty) {
      onHousingsChange(allHousings.filter(h => h.id !== housing.id));
    } else {
      onHousingsChange(allHousings.map(h => h.id === housing.id ? updated : h));
    }
  }

  function clearSlot(slotKey: SlotKey) {
    updateHousings({ ...housing, slots: { ...housing.slots, [slotKey]: null } });
  }

  function updateSlotParams(slotKey: SlotKey, newParams: unknown) {
    const sec = housing.slots[slotKey];
    if (!sec) return;
    updateHousings({
      ...housing,
      slots: {
        ...housing.slots,
        [slotKey]: { ...sec, spec: { type: sec.spec.type, params: newParams } as SectionParams },
      },
    });
  }

  function handleDrop(slotKey: SlotKey, payload: DragPayload) {
    const sectionType = payload.sectionType;
    const allowed = SLOT_RULES[sectionType].allowed;

    if (!allowed.includes(slotKey)) {
      onDropError(
        `"${SECTION_VISUALS[sectionType].defaultLabel}" — ${slotKey.toUpperCase()} სლოტი დაუშვებელია (შესაძლებელია: ${allowed.map(s => s.toUpperCase()).join(' / ')})`
      );
      return;
    }
    if (housing.slots[slotKey] !== null) {
      onDropError('სლოტი დაკავებულია — ჯერ წაშალეთ არსებული კომპონენტი');
      return;
    }

    if (payload.source === 'palette') {
      const updated: HousingSection = {
        ...housing,
        slots: { ...housing.slots, [slotKey]: makeFreshSection(sectionType, payload.defaultParams) },
      };
      onHousingsChange(allHousings.map(h => h.id === housing.id ? updated : h));
    } else {
      // Slot-to-slot move: remove from source, place in target
      const srcSection = allHousings.find(h => h.id === payload.housingId)?.slots[payload.slotKey];
      if (!srcSection) return;
      const newHousings = allHousings.map(h => {
        const s = { ...h, slots: { ...h.slots } };
        if (h.id === payload.housingId) s.slots = { ...s.slots, [payload.slotKey]: null };
        if (h.id === housing.id)        s.slots = { ...s.slots, [slotKey]: srcSection };
        return s;
      }).filter(h => SLOT_KEYS.some(k => h.slots[k] !== null));
      onHousingsChange(newHousings);
    }
    onDropError(null);
  }

  function moveHousing(dir: -1 | 1) {
    const idx = allHousings.findIndex(h => h.id === housing.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= allHousings.length) return;
    const arr = [...allHousings];
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    onHousingsChange(arr);
  }

  return (
    <div
      className="rounded-lg border flex flex-col shrink-0"
      style={{
        background: 'var(--sur)',
        borderColor: hasViolation ? 'var(--red, #ef4444)' : 'var(--bdr)',
        width: 186,
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-1.5 py-0.5 rounded-t-lg"
        style={{ background: hasViolation ? '#fef2f2' : 'var(--sur-2)', borderBottom: '1px solid var(--bdr)' }}
      >
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => moveHousing(-1)}
            disabled={index === 0}
            className="p-0.5 rounded disabled:opacity-25 hover:bg-[var(--bdr)] transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <ChevronLeft size={10} />
          </button>
          <span className="text-[9px] font-mono px-0.5" style={{ color: 'var(--text-3)' }}>{index + 1}</span>
          <button
            onClick={() => moveHousing(1)}
            disabled={index === total - 1}
            className="p-0.5 rounded disabled:opacity-25 hover:bg-[var(--bdr)] transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <ChevronRight size={10} />
          </button>
        </div>
        <button
          onClick={() => onHousingsChange(allHousings.filter(h => h.id !== housing.id))}
          className="p-0.5 rounded hover:bg-[#fee2e2] transition-colors"
          style={{ color: 'var(--text-3)' }}
          title="სექციის წაშლა"
        >
          <X size={10} />
        </button>
      </div>

      {/* Slot row */}
      <div className="flex flex-1">
        {SLOT_KEYS.map((slotKey, si) => (
          <React.Fragment key={slotKey}>
            {si > 0 && <div style={{ width: 1, background: 'var(--bdr)', alignSelf: 'stretch' }} />}
            <SlotZone
              housing={housing}
              slotKey={slotKey}
              section={housing.slots[slotKey]}
              isViolation={!!(housing.slots[slotKey] && violatedIds.has(housing.slots[slotKey]!.id))}
              globalDrag={globalDrag}
              onDrop={(payload) => handleDrop(slotKey, payload)}
              onRemove={() => clearSlot(slotKey)}
              onParamsChange={(p) => updateSlotParams(slotKey, p)}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Slot Zone ────────────────────────────────────────────────────────────────

type DragState = 'none' | 'valid' | 'invalid';

interface SlotZoneProps {
  housing: HousingSection;
  slotKey: SlotKey;
  section: SectionConfig | null;
  isViolation: boolean;
  globalDrag: DragPayload | null;
  onDrop: (payload: DragPayload) => void;
  onRemove: () => void;
  onParamsChange: (params: unknown) => void;
}

function SlotZone({ housing, slotKey, section, isViolation, globalDrag, onDrop, onRemove, onParamsChange }: SlotZoneProps) {
  const [dragState, setDragState] = useState<DragState>('none');
  const [isDragging, setIsDragging] = useState(false);

  const slotLabel = slotKey === 'left' ? 'L' : slotKey === 'center' ? 'C' : 'R';

  // Pre-highlight: valid empty slot during active drag (before hover)
  const preValid = !section && !!globalDrag
    && (SLOT_RULES[globalDrag.sectionType]?.allowed ?? []).includes(slotKey);

  function computeDragState(): DragState {
    const drag = getActiveDrag();
    if (!drag) return 'none';
    const allowed = SLOT_RULES[drag.sectionType].allowed;
    return (allowed.includes(slotKey) && section === null) ? 'valid' : 'invalid';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const state = computeDragState();
    e.dataTransfer.dropEffect = state === 'valid' ? 'copy' : 'none';
    setDragState(state);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragState('none');
    try {
      const raw = e.dataTransfer.getData('application/ahu-drag');
      onDrop(JSON.parse(raw) as DragPayload);
    } catch {
      const drag = getActiveDrag();
      if (drag) onDrop(drag);
    }
  }

  if (section) {
    const type = section.spec.type;
    const visual = SECTION_VISUALS[type];
    const Icon = iconFor(type);

    return (
      <div
        draggable
        onDragStart={(e) => {
          setActiveDrag({ source: 'slot', housingId: housing.id, slotKey, sectionType: type });
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/ahu-drag', JSON.stringify({
            source: 'slot', housingId: housing.id, slotKey, sectionType: type,
          }));
          setIsDragging(true);
        }}
        onDragEnd={() => { setActiveDrag(null); setIsDragging(false); }}
        className="relative flex flex-col"
        style={{
          flex: 1,
          minWidth: 0,
          background: isViolation ? '#fef2f2' : visual.color + '22',
          opacity: isDragging ? 0.35 : 1,
          cursor: 'grab',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-0.5 right-0.5 p-0.5 rounded z-10"
          style={{ color: 'var(--text-3)', lineHeight: 1 }}
          title="ამოიღე"
        >
          <X size={8} />
        </button>

        <div
          className="flex flex-col items-center justify-start pt-3 pb-1 px-0.5 gap-0.5"
          style={{ minHeight: 84 }}
        >
          <Icon size={14} style={{ color: visual.color }} />
          <span
            className="text-[8px] font-bold text-center leading-tight"
            style={{ color: 'var(--text)', wordBreak: 'break-word' }}
          >
            {visual.defaultLabel}
          </span>
          <InlineConfig section={section} onParamsChange={onParamsChange} />
        </div>

        <div
          className="text-center py-0.5 text-[8px] font-bold"
          style={{ color: visual.color + 'aa', borderTop: `1px solid ${visual.color}33` }}
        >
          {slotLabel}
        </div>
      </div>
    );
  }

  // Empty slot — drop target
  const bgColor =
    dragState === 'valid'   ? '#dbeafe' :
    dragState === 'invalid' ? '#fef2f2' :
    preValid                ? '#eff6ff' :
    'transparent';
  const borderColor =
    dragState === 'valid'   ? 'var(--blue, #2563eb)' :
    dragState === 'invalid' ? '#fca5a5' :
    preValid                ? '#93c5fd' :
    'transparent';

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={() => setDragState(computeDragState())}
      onDragLeave={() => setDragState('none')}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 100,
        background: bgColor,
        border: `1.5px dashed ${borderColor}`,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <span
        className="text-[9px] font-bold"
        style={{
          color: dragState === 'valid' ? 'var(--blue)' :
                 dragState === 'invalid' ? '#ef4444' :
                 preValid ? '#93c5fd' :
                 'var(--bdr)',
        }}
      >
        {slotLabel}
      </span>
    </div>
  );
}

// ─── Inline component config ──────────────────────────────────────────────────

function InlineConfig({ section, onParamsChange }: { section: SectionConfig; onParamsChange: (p: unknown) => void }) {
  const type = section.spec.type;

  const sel: React.CSSProperties = {
    width: '100%', fontSize: 8, height: 16,
    background: 'var(--sur)', border: '1px solid var(--bdr)',
    color: 'var(--text)', borderRadius: 2, padding: '0 2px',
    cursor: 'pointer', marginTop: 2,
  };

  if (type === 'filter') {
    const p = section.spec.params as FilterParams;
    const cls = p.filterClass;
    const frm = p.form ?? DEFAULT_FORM[cls];
    return (
      <div className="w-full px-0.5 space-y-px" onClick={e => e.stopPropagation()}>
        <select style={sel} value={cls}
          onChange={e => {
            const nc = e.target.value as FilterClass;
            const allowed = FILTER_FORM_OPTS[nc];
            const newForm = allowed.includes(frm) ? frm : DEFAULT_FORM[nc];
            onParamsChange({ ...p, filterClass: nc, form: newForm });
          }}
        >
          {ALL_FILTER_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={sel} value={frm}
          onChange={e => onParamsChange({ ...p, form: e.target.value as FilterForm })}
        >
          {FILTER_FORM_OPTS[cls].map(f => <option key={f} value={f}>{FORM_SHORT[f]}</option>)}
        </select>
      </div>
    );
  }

  if (type === 'cooling_coil') {
    const p = section.spec.params as { source: string };
    return (
      <div className="w-full px-0.5" onClick={e => e.stopPropagation()}>
        <select style={{ ...sel, background: '#e0f2fe', borderColor: '#7dd3fc', color: '#0369a1' }}
          value={p.source}
          onChange={e => onParamsChange({ ...p, source: e.target.value })}
        >
          <option value="chw">CHW</option>
          <option value="dx">DX</option>
        </select>
      </div>
    );
  }

  if (type === 'preheat' || type === 'reheat') {
    const p = section.spec.params as { source: string };
    return (
      <div className="w-full px-0.5" onClick={e => e.stopPropagation()}>
        <select style={{ ...sel, background: '#fff7ed', borderColor: '#fdba74', color: '#c2410c' }}
          value={p.source}
          onChange={e => onParamsChange({ ...p, source: e.target.value })}
        >
          <option value="hot_water">HW</option>
          <option value="steam">ST</option>
          <option value="electric">EL</option>
        </select>
      </div>
    );
  }

  if (type === 'humidifier') {
    const p = section.spec.params as { humType: string };
    return (
      <div className="w-full px-0.5" onClick={e => e.stopPropagation()}>
        <select style={sel} value={p.humType}
          onChange={e => onParamsChange({ ...p, humType: e.target.value })}
        >
          <option value="steam">ორთქლი</option>
          <option value="adiabatic_spray">ადიაბ.</option>
          <option value="evaporative_pad">ექსპ.</option>
        </select>
      </div>
    );
  }

  if (type === 'heat_recovery') {
    const p = section.spec.params as { hrType: string };
    return (
      <div className="w-full px-0.5" onClick={e => e.stopPropagation()}>
        <select style={sel} value={p.hrType}
          onChange={e => onParamsChange({ ...p, hrType: e.target.value })}
        >
          <option value="crossflow_plate">Cross</option>
          <option value="counterflow_plate">Counter</option>
          <option value="rotary_sensible">Rotary</option>
          <option value="run_around_coil">Run-ar.</option>
        </select>
      </div>
    );
  }

  return null;
}
