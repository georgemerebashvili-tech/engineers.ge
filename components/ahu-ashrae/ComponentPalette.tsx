'use client';

import React from 'react';
import {
  PanelTopOpen, Filter, Shuffle, ArrowLeftRight,
  Flame, Snowflake, Droplet, Fan, Volume2,
  type LucideIcon,
} from 'lucide-react';
import type { SectionType } from '@/lib/ahu-ashrae/sections';
import { SECTION_VISUALS } from '@/lib/ahu-ashrae/section-visuals';
import { setActiveDrag } from '@/lib/ahu-ashrae/dnd-state';

const ICON_LOOKUP: Record<string, LucideIcon> = {
  PanelTopOpen, Filter, Shuffle, ArrowLeftRight, Flame, Snowflake, Droplet, Fan, Volume2,
};

function iconFor(type: SectionType): LucideIcon {
  return ICON_LOOKUP[SECTION_VISUALS[type].iconName] ?? Filter;
}

interface Entry {
  id: string;
  sectionType: SectionType;
  label: string;
  defaultParams?: unknown;
  icon: LucideIcon;
  color: string;
}

const ENTRIES: Entry[] = [
  { id: 'damper',   sectionType: 'damper',        label: 'დემპერი',         icon: iconFor('damper'),        color: SECTION_VISUALS.damper.color },
  { id: 'flt_G4',  sectionType: 'filter',        label: 'G4',              icon: iconFor('filter'),        color: SECTION_VISUALS.filter.color,
    defaultParams: { filterClass: 'G4',  form: 'panel',    useAverageDeltaP: true } },
  { id: 'flt_F7',  sectionType: 'filter',        label: 'F7',              icon: iconFor('filter'),        color: '#8ab8d8',
    defaultParams: { filterClass: 'F7',  form: 'bag',      useAverageDeltaP: true } },
  { id: 'flt_F9',  sectionType: 'filter',        label: 'F9',              icon: iconFor('filter'),        color: '#6898c8',
    defaultParams: { filterClass: 'F9',  form: 'bag',      useAverageDeltaP: true } },
  { id: 'flt_H14', sectionType: 'filter',        label: 'HEPA H14',        icon: iconFor('filter'),        color: '#4a9890',
    defaultParams: { filterClass: 'H14', form: 'cassette', useAverageDeltaP: true } },
  { id: 'mixing',  sectionType: 'mixing_box',    label: 'შერევის ყ.',      icon: iconFor('mixing_box'),    color: SECTION_VISUALS.mixing_box.color },
  { id: 'hr',      sectionType: 'heat_recovery', label: 'რეკუპ.',          icon: iconFor('heat_recovery'), color: SECTION_VISUALS.heat_recovery.color },
  { id: 'preheat', sectionType: 'preheat',       label: 'წინ. გათბ.',      icon: iconFor('preheat'),       color: SECTION_VISUALS.preheat.color },
  { id: 'cooling', sectionType: 'cooling_coil',  label: 'გამაგრილ.',       icon: iconFor('cooling_coil'),  color: SECTION_VISUALS.cooling_coil.color },
  { id: 'reheat',  sectionType: 'reheat',        label: 'გათბობა',          icon: iconFor('reheat'),        color: SECTION_VISUALS.reheat.color },
  { id: 'humid',   sectionType: 'humidifier',    label: 'გამატენ.',         icon: iconFor('humidifier'),    color: SECTION_VISUALS.humidifier.color },
  { id: 'fan',     sectionType: 'fan',           label: 'ვენტილ.',          icon: iconFor('fan'),           color: SECTION_VISUALS.fan.color },
  { id: 'sil',     sectionType: 'silencer',      label: 'ხმ. დამ.',         icon: iconFor('silencer'),      color: SECTION_VISUALS.silencer.color },
];

export function ComponentPalette() {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      <div className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
        კომპონენტები — გადაიტანეთ AHU-ს სლოტში
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ENTRIES.map((e) => <PaletteChip key={e.id} entry={e} />)}
      </div>
    </div>
  );
}

function PaletteChip({ entry }: { entry: Entry }) {
  const Icon = entry.icon;
  return (
    <div
      draggable
      onDragStart={(ev) => {
        setActiveDrag({ source: 'palette', sectionType: entry.sectionType, defaultParams: entry.defaultParams, paletteId: entry.id });
        ev.dataTransfer.effectAllowed = 'copy';
        ev.dataTransfer.setData('application/ahu-drag', JSON.stringify({
          source: 'palette', sectionType: entry.sectionType,
          defaultParams: entry.defaultParams, paletteId: entry.id,
        }));
      }}
      onDragEnd={() => setActiveDrag(null)}
      className="flex items-center gap-1 px-2 py-1 rounded-md cursor-grab active:cursor-grabbing select-none"
      style={{ background: entry.color + '28', border: `1px solid ${entry.color}60` }}
      title={entry.label}
    >
      <Icon size={11} style={{ color: entry.color }} />
      <span className="text-[10px] font-medium" style={{ color: 'var(--text)' }}>{entry.label}</span>
    </div>
  );
}
