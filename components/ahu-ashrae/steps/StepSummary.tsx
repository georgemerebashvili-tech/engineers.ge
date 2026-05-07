'use client';

import React from 'react';
import { FileText, Snowflake, Flame, Fan, Wind, Droplet, ListChecks, Gauge } from 'lucide-react';
import type { AhuWizardState, PsychrometricResults, AhuUnit } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

interface Props {
  state: AhuWizardState;
  unit: AhuUnit;
  psychro?: PsychrometricResults;
  chain?: ChainResult;
}

export function StepSummary({ state, unit, psychro, chain }: Props) {
  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;

  // Prefer chain results when available (new section pipeline), fall back to legacy psychro
  const cooling = chain?.totalCooling ?? psychro?.coolingCapacity.total ?? 0;
  const heating = chain?.totalHeating ?? state.loads.heatingLoad;
  const totalDP = chain?.totalDeltaP ?? legacyTotalDeltaP(state);
  const supplyT = chain?.supplyState.tdb ?? psychro?.supplyAir.tdb;
  const supplyRh = chain?.supplyState.rh != null ? chain.supplyState.rh : (psychro?.supplyAir.rh != null ? psychro.supplyAir.rh / 100 : undefined);

  const airflowM3s = state.airflow.supplyAirflow / 3600;
  const fanPower = (airflowM3s * totalDP) / (state.fanInputs.fanEfficiency * state.fanInputs.motorEfficiency * 1000);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            სრული შეჯამება
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          {unit.name}{ahuSpec ? ` · ${ahuSpec.shortLabel}` : ''} — სექციათა ჯაჭვის შედეგი.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Big icon={Wind} label="ხარჯი" value={`${state.airflow.supplyAirflow.toLocaleString('en-US')}`} unit="m³/h" />
          <Big icon={Snowflake} label="გაცივება" value={cooling.toFixed(1)} unit="kW" />
          <Big icon={Flame} label="გათბობა" value={heating.toFixed(1)} unit="kW" />
          <Big icon={Fan} label="ფანი" value={fanPower.toFixed(2)} unit="kW" />
        </div>

        {chain && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Big icon={Gauge} label="ჯამური ΔP" value={`${chain.totalDeltaP.toFixed(0)}`} unit="Pa" />
            <Big icon={Droplet} label="კონდენსატი" value={(chain.totalCondensate * 3600).toFixed(2)} unit="kg/h" />
            <Big
              icon={Wind}
              label="მიწოდება T"
              value={supplyT != null ? supplyT.toFixed(1) : '—'}
              unit="°C"
            />
            <Big
              icon={Droplet}
              label="მიწოდება RH"
              value={supplyRh != null ? (supplyRh * 100).toFixed(0) : '—'}
              unit="%"
            />
          </div>
        )}
      </div>

      {/* ── Chain state table ── */}
      {chain && chain.states.length > 1 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              ჯაჭვის წერტილები (state-by-state)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-3)' }} className="text-[10px] uppercase tracking-[0.05em]">
                  <th className="text-left font-bold py-1.5 px-2">#</th>
                  <th className="text-left font-bold py-1.5 px-2">წერტილი</th>
                  <th className="text-right font-bold py-1.5 px-2 font-mono">T_db (°C)</th>
                  <th className="text-right font-bold py-1.5 px-2 font-mono">T_wb (°C)</th>
                  <th className="text-right font-bold py-1.5 px-2 font-mono">W (g/kg)</th>
                  <th className="text-right font-bold py-1.5 px-2 font-mono">RH</th>
                  <th className="text-right font-bold py-1.5 px-2 font-mono">h (kJ/kg)</th>
                </tr>
              </thead>
              <tbody>
                {chain.states.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--bdr)' }}>
                    <td className="py-1.5 px-2 font-mono" style={{ color: 'var(--text-3)' }}>{i}</td>
                    <td className="py-1.5 px-2 font-medium" style={{ color: 'var(--text)' }}>{p.label}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text)' }}>{p.state.tdb.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-2)' }}>{p.state.twb.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-2)' }}>{(p.state.w * 1000).toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-2)' }}>{(p.state.rh * 100).toFixed(0)}%</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-2)' }}>{p.state.h.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Auto-narrative journal ── */}
      {chain && chain.journal.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: 'var(--blue)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              გადასვლების ჟურნალი (auto-narrative)
            </h2>
          </div>
          <ol className="space-y-3">
            {chain.journal.map((b, i) => (
              <li
                key={`${b.sectionId}-${i}`}
                className="rounded-lg border p-3"
                style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="text-xs font-bold" style={{ color: 'var(--navy)' }}>
                    <span className="font-mono mr-2" style={{ color: 'var(--blue)' }}>#{i + 1}</span>
                    {b.sectionLabel}
                  </div>
                  {b.reference && (
                    <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-3)' }}>
                      {b.reference}
                    </span>
                  )}
                </div>
                <div className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text)' }}>
                  {b.summary}
                </div>
                {b.details.length > 0 && (
                  <ul className="text-[11px] space-y-0.5 ml-3" style={{ color: 'var(--text-2)' }}>
                    {b.details.map((d, j) => (
                      <li key={j} className="font-mono">· {d}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function legacyTotalDeltaP(state: AhuWizardState): number {
  const f = state.fanInputs;
  return f.externalStaticPressure + f.filterDeltaP + f.coolingCoilDeltaP + f.heatingCoilDeltaP + f.hrDeltaP + f.ductDeltaP;
}

function Big({ icon: Icon, label, value, unit }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; unit: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} />
        <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
          {label}
        </div>
      </div>
      <div className="text-xl font-bold font-mono leading-none" style={{ color: 'var(--navy)' }}>
        {value}
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{unit}</div>
    </div>
  );
}
