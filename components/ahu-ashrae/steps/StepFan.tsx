'use client';

import React from 'react';
import { Fan } from 'lucide-react';
import type { AhuWizardState } from '@/lib/ahu-ashrae/types';

interface Props {
  state: AhuWizardState;
}

export function StepFan({ state }: Props) {
  const totalDP = totalDeltaP(state);
  const airflowM3s = state.airflow.supplyAirflow / 3600;
  const fanPower = (airflowM3s * totalDP) / (state.fanInputs.fanEfficiency * state.fanInputs.motorEfficiency * 1000);
  const sfp = (fanPower * 1000) / airflowM3s; // W·s/m³ = W per L/s × 1000

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Fan size={16} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            ვენტილატორის შერჩევა
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          fan-ი შეირჩევა ჯამური ΔP-ის და ხარჯის მიხედვით; SFP — ASHRAE 90.1 / EN 13779 ლიმიტი.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="ხარჯი" value={`${state.airflow.supplyAirflow.toLocaleString('en-US')} m³/h`} />
          <Stat label="ჯამური ΔP" value={`${totalDP} Pa`} />
          <Stat label="ფანის სიმძლავრე" value={`${fanPower.toFixed(2)} kW`} />
          <Stat label="SFP" value={`${sfp.toFixed(0)} W/(m³/s)`} highlight />
        </div>

        <div
          className="mt-4 rounded-lg border p-3 text-[11px]"
          style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)', color: 'var(--text-2)' }}
        >
          <strong>SFP-ის ლიმიტი:</strong> ASHRAE 90.1 — 1.7 W/(L/s) ≈ 1700 W/(m³/s) constant-volume სისტემისთვის.
          {sfp > 1700 && (
            <span style={{ color: 'var(--ora)', fontWeight: 700 }}> ⚠ მიმდინარე SFP ლიმიტს აღემატება — შეამცირე ΔP ან გაზარდე fan-ის ეფექტურობა.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function totalDeltaP(state: AhuWizardState): number {
  const f = state.fanInputs;
  return f.externalStaticPressure + f.filterDeltaP + f.coolingCoilDeltaP + f.heatingCoilDeltaP + f.hrDeltaP + f.ductDeltaP;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: highlight ? 'var(--blue-lt)' : 'var(--sur-2)',
        borderColor: highlight ? 'var(--blue-bd)' : 'var(--bdr)',
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: highlight ? 'var(--blue)' : 'var(--text-3)' }}>
        {label}
      </div>
      <div className="text-sm font-bold font-mono mt-0.5" style={{ color: highlight ? 'var(--navy)' : 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}
