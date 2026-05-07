'use client';

import React from 'react';
import { Droplets } from 'lucide-react';
import { MollierD3 } from '@/components/ahu-ashrae/MollierD3';
import { dewPoint } from '@/lib/ahu-ashrae/psychrometrics';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';

// ─── State table ──────────────────────────────────────────────────────────────

const SEC_COLORS: Record<string, string> = {
  preheat: '#c2410c', reheat: '#c2410c',
  cooling_coil: '#1d4ed8',
  humidifier: '#0891b2',
  heat_recovery: '#7c3aed',
  fan: '#64748b',
  mixing_box: '#059669',
};

function stateColor(idx: number, type?: string): string {
  if (idx === 0) return '#c05010';
  return type ? (SEC_COLORS[type] ?? '#94a3b8') : '#94a3b8';
}

function Num({ v, color, bold }: { v: string; color?: string; bold?: boolean }) {
  return (
    <td
      className={`px-2.5 py-1.5 text-right font-mono ${bold ? 'font-bold' : ''}`}
      style={{ color: color ?? 'var(--text)' }}
    >
      {v}
    </td>
  );
}

function StateTable({ chain, P }: { chain: ChainResult; P: number }) {
  return (
    <div
      className="rounded-xl border overflow-hidden mt-5"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      <div
        className="px-4 py-2.5 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--bdr)', background: 'var(--sur-2)' }}
      >
        <Droplets size={13} style={{ color: 'var(--blue)' }} />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: 'var(--navy)' }}
        >
          i-d ცხრილი — ჯაჭვის წერტილები
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--sur-2)' }}>
              {['•', 'State', 'სექცია', 'T_db °C', 'T_wb °C', 'T_dp °C',
                'd g/kg', 'i kJ/kg', 'φ %', 'ΔP Pa', 'Q kW'].map((h) => (
                <th
                  key={h}
                  className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em]"
                  style={{
                    color: 'var(--text-3)',
                    textAlign: h === '•' ? 'center' : 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chain.states.map((st, i) => {
              const d     = st.state.w * 1000;
              const tdp   = dewPoint(st.state.w, P); // ASHRAE polynomial
              const color = stateColor(i, st.sectionType);
              return (
                <tr key={st.id} className="border-t" style={{ borderColor: 'var(--bdr)' }}>
                  <td className="px-2.5 py-1.5 text-center">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                  </td>
                  <td className="px-2.5 py-1.5 font-mono font-bold" style={{ color }}>
                    s{i}
                  </td>
                  <td
                    className="px-2.5 py-1.5 max-w-[120px] truncate"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {st.label}
                  </td>
                  <Num v={st.state.tdb.toFixed(2)} />
                  <Num v={st.state.twb.toFixed(2)} />
                  <Num v={tdp.toFixed(2)} color="#0f6e3a" />
                  <Num v={d.toFixed(2)} />
                  <Num v={st.state.h.toFixed(2)} color="var(--navy)" bold />
                  <Num v={(st.state.rh * 100).toFixed(1)} />
                  <Num v={st.deltaP != null ? st.deltaP.toFixed(0) : '—'} />
                  <Num
                    v={
                      st.energy != null
                        ? `${st.energy > 0 ? '+' : ''}${st.energy.toFixed(2)}`
                        : '—'
                    }
                    color={
                      st.energy == null ? undefined : st.energy < 0 ? '#1d4ed8' : '#c2410c'
                    }
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  const items = [
    { color: '#1d4ed8', dash: false, thick: true,  label: 'Saturation curve (100% RH)' },
    { color: '#3b82f6', dash: true,  thick: false, label: 'RH = const (10–90%)' },
    { color: '#7a96b8', dash: false, thick: false, label: 'T = const (isotherms)' },
    { color: '#34d399', dash: true,  thick: false, label: 'Twb = const (wet-bulb)' },
    { color: '#94a3b8', dash: true,  thick: false, label: 'v = const (spec. volume)' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <svg width="22" height="8">
            <line
              x1="0" y1="4" x2="22" y2="4"
              stroke={it.color}
              strokeWidth={it.thick ? 2.2 : 1.2}
              strokeDasharray={it.dash ? '4 2' : '0'}
            />
          </svg>
          <span style={{ color: 'var(--text-2)' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props {
  chain?: ChainResult;
  pressure: number;
}

export function MollierView({ chain, pressure }: Props) {
  return (
    <div>
      <MollierD3 chain={chain} pressure={pressure} />
      <ChartLegend />
      {chain && chain.states.length >= 2 && (
        <StateTable chain={chain} P={pressure} />
      )}
    </div>
  );
}
