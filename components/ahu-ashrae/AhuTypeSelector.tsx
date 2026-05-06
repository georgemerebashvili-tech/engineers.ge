'use client';

import React from 'react';
import { Check, Info, ArrowRight } from 'lucide-react';
import type { AhuType } from '@/lib/ahu-ashrae/types';
import { AHU_TYPES, type AhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

interface Props {
  selected?: AhuType;
  onSelect: (type: AhuType) => void;
}

export function AhuTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-5">
      {/* Intro */}
      <div
        className="rounded-xl border p-4 flex gap-3"
        style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
      >
        <Info size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--blue)' }} />
        <div>
          <div className="text-xs font-bold mb-1" style={{ color: 'var(--blue)' }}>
            აირჩიე AHU-ს სტილი
          </div>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            ფსიქრომეტრიული გაანგარიშების შემდეგ ვირჩევთ სითბოს რეკუპერაციის კონფიგურაციას.
            არჩეული ტიპი განსაზღვრავს pre-conditioning-ს, ΔP-ს ვენტილატორზე და ასევე გადაიხედავს cooling/heating coil-ის სიმძლავრე.
          </div>
        </div>
      </div>

      {/* 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AHU_TYPES.map((spec) => (
          <AhuTypeCard
            key={spec.id}
            spec={spec}
            selected={selected === spec.id}
            onSelect={() => onSelect(spec.id)}
          />
        ))}
      </div>

      {/* Comparison table */}
      <ComparisonTable selected={selected} />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AhuTypeCard({
  spec, selected, onSelect,
}: {
  spec: AhuTypeSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  const sensibleRange = `${(spec.sensibleEffMin * 100).toFixed(0)}–${(spec.sensibleEffMax * 100).toFixed(0)}%`;
  const latentRange = spec.latentEffMax > 0
    ? `${(spec.latentEffMin * 100).toFixed(0)}–${(spec.latentEffMax * 100).toFixed(0)}%`
    : '—';
  const dpRange = `${spec.dpMin}–${spec.dpMax} Pa`;

  return (
    <button
      onClick={onSelect}
      className="group relative text-left rounded-xl border p-4 transition-all"
      style={{
        background: selected ? 'var(--blue-lt)' : 'var(--sur)',
        borderColor: selected ? spec.accent : 'var(--bdr)',
        borderWidth: selected ? '2px' : '1px',
        boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--blue) 12%, transparent)' : 'var(--shadow-card)',
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <span
          className="absolute top-3 right-3 inline-flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: spec.accent, color: '#fff' }}
        >
          <Check size={11} strokeWidth={3} />
        </span>
      )}

      {/* Schematic */}
      <div className="mb-3 flex items-center justify-between">
        <Schematic type={spec.schematic} color={spec.accent} />
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            background: `color-mix(in srgb, ${spec.accent} 12%, var(--sur))`,
            color: spec.accent,
            border: `1px solid color-mix(in srgb, ${spec.accent} 30%, transparent)`,
          }}
        >
          {spec.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold mb-1 leading-tight" style={{ color: 'var(--navy)' }}>
        {spec.title}
      </h3>
      <div className="text-[10px] font-mono mb-3" style={{ color: 'var(--text-3)' }}>
        {spec.titleEn}
      </div>

      {/* Description */}
      <p className="text-[11px] leading-snug mb-3" style={{ color: 'var(--text-2)' }}>
        {spec.description}
      </p>

      {/* Specs grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <SpecCell label="ηₛ Sensible" value={sensibleRange} />
        <SpecCell label="ηₗ Latent" value={latentRange} muted={spec.latentEffMax === 0} />
        <SpecCell label="ΔP / side" value={dpRange} />
        <SpecCell
          label="Contam."
          value={contaminationLabel(spec.contamination)}
          color={spec.contamination === 'medium' ? 'var(--ora)' : spec.contamination === 'low' ? 'var(--grn)' : 'var(--text)'}
        />
      </div>

      {/* Best-for */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-2)' }}>
          <span className="font-bold shrink-0" style={{ color: 'var(--grn)' }}>+</span>
          <span className="leading-snug">{spec.bestFor}</span>
        </div>
        <div className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
          <span className="font-bold shrink-0" style={{ color: 'var(--ora)' }}>−</span>
          <span className="leading-snug">{spec.notFor}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: 'var(--bdr)' }}>
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          {spec.ashraeRef}
        </span>
        <ArrowRight
          size={12}
          style={{ color: selected ? spec.accent : 'var(--text-3)' }}
        />
      </div>
    </button>
  );
}

function SpecCell({
  label, value, muted, color,
}: {
  label: string;
  value: string;
  muted?: boolean;
  color?: string;
}) {
  return (
    <div
      className="rounded-md px-2 py-1.5 border"
      style={{
        background: 'var(--sur-2)', borderColor: 'var(--bdr)',
        opacity: muted ? 0.5 : 1,
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="text-[11px] font-bold font-mono" style={{ color: color ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}

function contaminationLabel(c: 'none' | 'low' | 'medium'): string {
  if (c === 'none') return 'არ არის';
  if (c === 'low') return 'მცირე';
  return 'საშუალო';
}

// ─── Schematic icons ─────────────────────────────────────────────────────────

function Schematic({ type, color }: { type: AhuTypeSpec['schematic']; color: string }) {
  const stroke = color;
  const w = 56, h = 36;
  const arrowSupply = '#1f6fd4';
  const arrowExhaust = '#c05010';

  if (type === 'crossflow') {
    return (
      <svg width={w} height={h} viewBox="0 0 56 36" fill="none">
        <rect x="14" y="6" width="28" height="24" stroke={stroke} strokeWidth="1.5" rx="2" fill="none" />
        {/* horizontal supply */}
        <path d="M3 18 H53" stroke={arrowSupply} strokeWidth="1.5" markerEnd="url(#arr-blue)" />
        {/* vertical exhaust */}
        <path d="M28 1 V35" stroke={arrowExhaust} strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arr-ora)" />
        <defs>
          <marker id="arr-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowSupply} />
          </marker>
          <marker id="arr-ora" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowExhaust} />
          </marker>
        </defs>
      </svg>
    );
  }

  if (type === 'counterflow') {
    return (
      <svg width={w} height={h} viewBox="0 0 56 36" fill="none">
        <rect x="6" y="8" width="44" height="20" stroke={stroke} strokeWidth="1.5" rx="2" fill="none" />
        <path d="M3 14 H53" stroke={arrowSupply} strokeWidth="1.5" markerEnd="url(#arrr-blue)" />
        <path d="M53 22 H3" stroke={arrowExhaust} strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arrr-ora)" />
        <defs>
          <marker id="arrr-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowSupply} />
          </marker>
          <marker id="arrr-ora" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowExhaust} />
          </marker>
        </defs>
      </svg>
    );
  }

  if (type === 'rotor') {
    return (
      <svg width={w} height={h} viewBox="0 0 56 36" fill="none">
        <circle cx="28" cy="18" r="13" stroke={stroke} strokeWidth="1.5" fill="none" />
        <path d="M15 18 H41" stroke={stroke} strokeWidth="0.8" />
        <path d="M28 5 V31" stroke={stroke} strokeWidth="0.8" />
        <path d="M19 9 L37 27" stroke={stroke} strokeWidth="0.8" />
        <path d="M37 9 L19 27" stroke={stroke} strokeWidth="0.8" />
        <path d="M3 12 H15" stroke={arrowSupply} strokeWidth="1.5" markerEnd="url(#rot-blue)" />
        <path d="M53 24 H41" stroke={arrowExhaust} strokeWidth="1.5" markerEnd="url(#rot-ora)" />
        <defs>
          <marker id="rot-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowSupply} />
          </marker>
          <marker id="rot-ora" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowExhaust} />
          </marker>
        </defs>
      </svg>
    );
  }

  if (type === 'glycol') {
    return (
      <svg width={w} height={h} viewBox="0 0 56 36" fill="none">
        {/* two coils */}
        <rect x="5" y="10" width="10" height="16" stroke={arrowSupply} strokeWidth="1.5" fill="none" rx="1" />
        <rect x="41" y="10" width="10" height="16" stroke={arrowExhaust} strokeWidth="1.5" fill="none" rx="1" />
        {/* glycol loop */}
        <path d="M15 14 H41" stroke={stroke} strokeWidth="1.2" />
        <path d="M41 22 H15" stroke={stroke} strokeWidth="1.2" />
        <circle cx="28" cy="18" r="2" fill={stroke} />
        <path d="M3 18 H5" stroke={arrowSupply} strokeWidth="1.5" />
        <path d="M51 18 H53" stroke={arrowExhaust} strokeWidth="1.5" />
      </svg>
    );
  }

  // heat pipe
  return (
    <svg width={w} height={h} viewBox="0 0 56 36" fill="none">
      <rect x="20" y="4" width="16" height="28" stroke={stroke} strokeWidth="1.5" fill="none" rx="2" />
      <path d="M24 8 V28" stroke={stroke} strokeWidth="0.8" />
      <path d="M28 8 V28" stroke={stroke} strokeWidth="0.8" />
      <path d="M32 8 V28" stroke={stroke} strokeWidth="0.8" />
      <path d="M3 12 H20" stroke={arrowSupply} strokeWidth="1.5" markerEnd="url(#hp-blue)" />
      <path d="M53 24 H36" stroke={arrowExhaust} strokeWidth="1.5" markerEnd="url(#hp-ora)" />
      <defs>
        <marker id="hp-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={arrowSupply} />
        </marker>
        <marker id="hp-ora" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={arrowExhaust} />
        </marker>
      </defs>
    </svg>
  );
}

// ─── Comparison Table ────────────────────────────────────────────────────────

function ComparisonTable({ selected }: { selected?: AhuType }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--bdr)' }}>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
          შედარება
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--sur-2)' }}>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ტიპი</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ηₛ %</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ηₗ %</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ΔP Pa</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Contam.</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Frost</th>
            </tr>
          </thead>
          <tbody>
            {AHU_TYPES.map((spec) => {
              const isSel = spec.id === selected;
              return (
                <tr
                  key={spec.id}
                  className="border-t"
                  style={{
                    borderColor: 'var(--bdr)',
                    background: isSel ? 'var(--blue-lt)' : undefined,
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: spec.accent }} />
                      <span style={{ color: 'var(--text)' }}>{spec.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>
                    {(spec.sensibleEffMin * 100).toFixed(0)}–{(spec.sensibleEffMax * 100).toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: spec.latentEffMax > 0 ? 'var(--grn)' : 'var(--text-3)' }}>
                    {spec.latentEffMax > 0 ? `${(spec.latentEffMin * 100).toFixed(0)}–${(spec.latentEffMax * 100).toFixed(0)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>
                    {spec.dpMin}–{spec.dpMax}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: 'var(--text-2)' }}>
                    {contaminationLabel(spec.contamination)}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: spec.frostRisk === 'high' ? 'var(--ora)' : spec.frostRisk === 'medium' ? 'var(--text-2)' : 'var(--grn)' }}>
                    {spec.frostRisk === 'high' ? 'მაღალი' : spec.frostRisk === 'medium' ? 'საშ.' : 'დაბ.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
