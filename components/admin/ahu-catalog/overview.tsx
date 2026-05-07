'use client';

import React, { useState } from 'react';
import {
  Wind, Filter, Snowflake, Fan, ArrowLeftRight, Boxes, Droplet,
  Plus, AlertCircle,
} from 'lucide-react';
import { listPresets } from '@/lib/ahu-ashrae/section-presets';

const TIERS = [2000, 5000, 10000, 15000, 20000];
const FLOW_TYPES = [
  { id: 'crossflow_plate',   label: 'Cross-flow plate' },
  { id: 'counterflow_plate', label: 'Counter-flow plate' },
  { id: 'rotary_sensible',   label: 'Rotary wheel (sensible)' },
  { id: 'rotary_enthalpy',   label: 'Enthalpy wheel' },
  { id: 'run_around_coil',   label: 'Run-around coil' },
  { id: 'heat_pipe',         label: 'Heat pipe' },
];

interface TabSpec {
  id: 'models' | 'sections' | 'filters' | 'coils' | 'fans' | 'hr' | 'humidifiers';
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  description: string;
}

const TABS: TabSpec[] = [
  { id: 'models',     label: 'მოდელები',          icon: Wind,           description: 'Capacity tiers × flow types — bare AHU casings' },
  { id: 'sections',   label: 'სექციათა რიგი',     icon: Boxes,          description: 'Pre-defined section sequences per model' },
  { id: 'filters',    label: 'ფილტრები',          icon: Filter,         description: 'G4 / F7 / F9 / HEPA / carbon — ΔP curves' },
  { id: 'coils',      label: 'ხვიები',            icon: Snowflake,      description: 'CHW / DX cooling, hot-water / electric heating' },
  { id: 'fans',       label: 'ვენტილატორები',     icon: Fan,            description: 'Supply / return fan models — airflow & pressure curves' },
  { id: 'hr',         label: 'რეკუპერატორები',   icon: ArrowLeftRight, description: 'Heat recovery devices with effectiveness data' },
  { id: 'humidifiers', label: 'გამატენიანებლები', icon: Droplet,        description: 'Steam / adiabatic humidifiers' },
];

export function AhuCatalogOverview() {
  const [tab, setTab] = useState<TabSpec['id']>('models');

  return (
    <div className="space-y-5">
      {/* Banner — work-in-progress */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ background: 'var(--ora-lt)', borderColor: 'var(--ora-bd)' }}
      >
        <AlertCircle size={18} style={{ color: 'var(--ora)' }} className="shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
          <strong style={{ color: 'var(--ora)' }}>კატალოგის სქელეტი — სრული ცხრილები მზადდება.</strong>
          <div className="mt-1" style={{ color: 'var(--text-2)' }}>
            ამჟამად ცხრილები მონაცემებს არ ინახავს — ჩვენთვის ცხადდება სტრუქტურა და ტიპები. მონაცემთა ბაზასთან გაერთიანების შემდეგ wizard-ი ცოცხლად ამოარჩევს რეალურ მოდელებს ხარჯისა და flow type-ის მიხედვით.
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--bdr)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2"
              style={{
                color: active ? 'var(--blue)' : 'var(--text-3)',
                borderColor: active ? 'var(--blue)' : 'transparent',
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'models' && <ModelsTab />}
        {tab === 'sections' && <SectionsTab />}
        {tab === 'filters' && <PlaceholderTab id="filters" />}
        {tab === 'coils' && <PlaceholderTab id="coils" />}
        {tab === 'fans' && <PlaceholderTab id="fans" />}
        {tab === 'hr' && <PlaceholderTab id="hr" />}
        {tab === 'humidifiers' && <PlaceholderTab id="humidifiers" />}
      </div>
    </div>
  );
}

// ─── Models tab ───────────────────────────────────────────────────────────────

function ModelsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
          AHU მოდელები ({TIERS.length} capacity × {FLOW_TYPES.length} flow type = {TIERS.length * FLOW_TYPES.length} slot)
        </h3>
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold opacity-50 cursor-not-allowed"
          style={{ background: 'var(--blue)', color: '#fff' }}
        >
          <Plus size={12} /> ახალი მოდელი
        </button>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--sur-2)' }}>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
                Capacity
              </th>
              {FLOW_TYPES.map((ft) => (
                <th key={ft.id} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
                  {ft.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier) => (
              <tr key={tier} className="border-t" style={{ borderColor: 'var(--bdr)' }}>
                <td className="px-3 py-2 font-bold font-mono" style={{ color: 'var(--navy)' }}>
                  {tier.toLocaleString('en-US')} m³/h
                </td>
                {FLOW_TYPES.map((ft) => (
                  <td key={ft.id} className="px-3 py-2">
                    <button
                      disabled
                      className="text-[11px] px-2 py-1 rounded-md border opacity-50 cursor-not-allowed"
                      style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-3)', background: 'var(--sur)' }}
                      title="ცარიელი slot — მომავალში შეივსება"
                    >
                      ცარიელი
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        თითოეულ slot-ში დაემატება: dimensions (W×H×L), weight (kg), price (₾), STL ფაილი (per-model 3D viewer-ისთვის), default section sequence.
      </div>
    </div>
  );
}

// ─── Sections tab ─────────────────────────────────────────────────────────────

function SectionsTab() {
  const presets = listPresets();
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
        Pre-defined Section Sequences
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {presets.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border p-4"
            style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{p.label}</div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>{p.id}</span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>{p.description}</p>
            <div className="text-[11px] font-mono leading-relaxed" style={{ color: 'var(--text-3)' }}>
              {p.build({ supplyTdb: 14, oaFraction: 0.3 }).map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ' → '}
                  <span style={{ color: 'var(--text)' }}>{s.label}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        წყარო: <span className="font-mono">lib/ahu-ashrae/section-presets.ts</span> — wizard-ში ხელით რედაქტირდება, მერე admin გავხდის უფრო ფართო ტიპებად per-model.
      </div>
    </div>
  );
}

// ─── Generic placeholder ──────────────────────────────────────────────────────

function PlaceholderTab({ id }: { id: string }) {
  const titles: Record<string, { title: string; columns: string[]; example: string }> = {
    filters: {
      title: 'ფილტრების კატალოგი',
      columns: ['კლასი', 'კოდი', 'ΔP clean (Pa)', 'ΔP dirty (Pa)', 'სიცოცხლის ვადა', 'ფასი'],
      example: 'G4 / F7 / F9 / H13 / H14 / carbon / electric',
    },
    coils: {
      title: 'ხვიების კატალოგი',
      columns: ['ტიპი', 'rows', 'fpi', 'face area', 'capacity (kW)', 'water Δt', 'ΔP'],
      example: 'CHW (water) ან DX (R410A / R32) — sensible + latent capacity ცხრილი',
    },
    fans: {
      title: 'ვენტილატორების კატალოგი',
      columns: ['Model', 'airflow range', 'static pressure', 'efficiency', 'sound power', 'motor kW'],
      example: 'EC fans, plug fans, AHU-specific curves',
    },
    hr: {
      title: 'რეკუპერატორების კატალოგი',
      columns: ['Type', 'sensible ε', 'latent ε', 'ΔP', 'frost limit', 'maintenance'],
      example: 'Cross-flow / counter-flow / wheels / run-around / heat pipe',
    },
    humidifiers: {
      title: 'გამატენიანებლების კატალოგი',
      columns: ['Type', 'capacity (kg/h)', 'water source', 'ΔP', 'control'],
      example: 'Steam / adiabatic spray / evaporative pad',
    },
  };
  const spec = titles[id];
  if (!spec) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{spec.title}</h3>
      <div
        className="rounded-xl border p-8 flex flex-col items-center gap-3 text-center"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', borderStyle: 'dashed' }}
      >
        <div className="text-xs font-bold" style={{ color: 'var(--navy)' }}>
          {spec.title} — სქელეტი მზადაა, რეალური მონაცემები მოგვიანებით.
        </div>
        <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>
          მაგ.: {spec.example}
        </div>
        <div className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-3)' }}>
          dock columns: {spec.columns.join(' · ')}
        </div>
      </div>
    </div>
  );
}
