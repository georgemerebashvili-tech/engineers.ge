'use client';

import React from 'react';
import { Gauge, Snowflake, Flame, Filter, ArrowRight } from 'lucide-react';
import type { AhuWizardState, PsychrometricResults } from '@/lib/ahu-ashrae/types';

interface Props {
  state: AhuWizardState;
  psychro?: PsychrometricResults;
}

export function StepSizing({ state, psychro }: Props) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={16} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
            სექციების სიზინგი + წნევის დანაკარგი
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          აქ ერთიანდება გამაგრილებელი / გამათბობელი ხვია, ფილტრი და რეკუპერატორი — თითოეულის სიმძლავრე და ΔP.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SizingCard icon={Snowflake} title="გამაგრილებელი ხვია" rows={[
            ['სიმძლავრე', psychro ? `${psychro.coolingCapacity.total.toFixed(1)} kW` : '—'],
            ['SHR', psychro ? `${(psychro.shr * 100).toFixed(0)}%` : '—'],
            ['ΔP', `${state.fanInputs.coolingCoilDeltaP} Pa`],
          ]} />
          <SizingCard icon={Flame} title="გამათბობელი ხვია" rows={[
            ['სიმძლავრე', `${state.loads.heatingLoad.toFixed(1)} kW`],
            ['ტიპი', state.heatingCoilInputs.type === 'hot_water' ? 'water' : 'electric'],
            ['ΔP', `${state.fanInputs.heatingCoilDeltaP} Pa`],
          ]} />
          <SizingCard icon={Filter} title="ფილტრები" rows={[
            ['MERV', String(state.filterInputs.mervRating)],
            ['Pre-filter', state.filterInputs.preFilter ? 'კი' : 'არა'],
            ['ΔP (clean+dirty)', `${state.fanInputs.filterDeltaP} Pa`],
          ]} />
          <SizingCard icon={ArrowRight} title="რეკუპერატორი" rows={[
            ['ტიპი', state.hrInputs.type],
            ['ηₛ', `${(state.hrInputs.sensibleEffectiveness * 100).toFixed(0)}%`],
            ['ΔP', `${state.fanInputs.hrDeltaP} Pa`],
          ]} />
        </div>

        <div
          className="mt-4 rounded-lg p-3 flex items-center justify-between"
          style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)', borderWidth: 1 }}
        >
          <div className="text-[11px] font-bold" style={{ color: 'var(--navy)' }}>
            ჯამური ΔP (fan-ის შერჩევისთვის)
          </div>
          <div className="text-base font-bold font-mono" style={{ color: 'var(--blue)' }}>
            {totalDeltaP(state)} Pa
          </div>
        </div>
      </div>
    </div>
  );
}

function totalDeltaP(state: AhuWizardState): number {
  const f = state.fanInputs;
  return f.externalStaticPressure + f.filterDeltaP + f.coolingCoilDeltaP + f.heatingCoilDeltaP + f.hrDeltaP + f.ductDeltaP;
}

interface CardProps {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  rows: [string, string][];
}
function SizingCard({ icon: Icon, title, rows }: CardProps) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{title}</div>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between items-baseline py-0.5">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{k}</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text)' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
