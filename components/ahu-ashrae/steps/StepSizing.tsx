'use client';

import React from 'react';
import { Gauge, Snowflake, Flame, Filter, ArrowRight, Droplet, type LucideIcon } from 'lucide-react';
import type { AhuWizardState, PsychrometricResults, FilterStageKey } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import { FILTER_STAGE_LABELS } from '@/lib/ahu-ashrae/sync-design-intent';

interface Props {
  state: AhuWizardState;
  psychro?: PsychrometricResults;
  chain?: ChainResult;
}

// ── cooling/heating labels ────────────────────────────────────────────────────
const COOLING_LABELS: Record<string, string> = {
  chilled_water: 'CHW (ცივი წყალი)',
  dx: 'DX (პირდაპირი გაფართება)',
  none: 'არ არის',
};
const HEATING_LABELS: Record<string, string> = {
  hot_water: 'HHW (ცხელი წყალი)',
  electric: 'ელექტრო',
  steam: 'ორთქლი',
  none: 'არ არის',
};
const HUMIDIFIER_LABELS: Record<string, string> = {
  steam: 'ორთქლი',
  evaporative: 'ორთქლი/აორთქლება',
  ultrasonic: 'ულტრაბგერა',
  none: 'არ არის',
};

export function StepSizing({ state, psychro, chain }: Props) {
  const sd = state.systemDesign;
  const coolingKw = chain?.totalCooling ?? psychro?.coolingCapacity.total;
  const heatingKw = chain?.totalHeating;

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
          {/* Cooling coil */}
          <SizingCard icon={Snowflake} title="გამაგრილებელი ხვია" rows={[
            ['ტიპი', sd ? COOLING_LABELS[sd.coolingSystem] ?? sd.coolingSystem : 'CHW'],
            ...(sd?.coolingSystem === 'chilled_water'
              ? [
                  ['CHW მიწ./დაბ.', `${sd.chwSupplyT} / ${sd.chwReturnT} °C`] as [string, string],
                  ['ADP (calc)', `${(sd.chwSupplyT + 1.5).toFixed(1)} °C`] as [string, string],
                ]
              : []),
            ['სიმძლავრე', coolingKw != null ? `${coolingKw.toFixed(1)} kW` : '—'],
            ['SHR', psychro ? `${(psychro.shr * 100).toFixed(0)}%` : '—'],
            ['ΔP', `${state.fanInputs.coolingCoilDeltaP} Pa`],
          ]} accent="var(--blue)" />

          {/* Heating coil */}
          <SizingCard icon={Flame} title="გამათბობელი ხვია" rows={[
            ['ტიპი', sd ? HEATING_LABELS[sd.heatingSystem] ?? sd.heatingSystem : 'HHW'],
            ...(sd?.heatingSystem === 'hot_water'
              ? [['HW მიწ./დაბ.', `${sd.hwSupplyT} / ${sd.hwReturnT} °C`] as [string, string]]
              : []),
            ...(sd?.heatingSystem === 'electric'
              ? [['სიმძლავრე', `${sd.electricKw} kW`] as [string, string]]
              : []),
            ['გათვ. სიმძლ.', heatingKw != null ? `${heatingKw.toFixed(1)} kW` : '—'],
            ['ΔP', `${state.fanInputs.heatingCoilDeltaP} Pa`],
          ]} accent="var(--ora)" />

          {/* Filters */}
          <SizingCard icon={Filter} title="ფილტრაცია" rows={[
            ['საფეხურები', sd?.filterStages.length
              ? sd.filterStages.join(' → ')
              : 'G4 → F7 (default)'],
            ...(sd?.filterStages ?? ['G4', 'F7'] as FilterStageKey[]).map(
              (k) => [
                FILTER_STAGE_LABELS[k]?.short ?? k,
                FILTER_STAGE_LABELS[k]?.iso ?? '',
              ] as [string, string],
            ),
            ['ΔP (avg)', `${state.fanInputs.filterDeltaP} Pa`],
          ]} accent="var(--text-2)" />

          {/* Heat recovery + humidifier */}
          <div className="space-y-3">
            <SizingCard icon={ArrowRight} title="რეკუპერატორი" rows={[
              ['ტიპი', state.hrInputs.type],
              ['ηₛ', `${(state.hrInputs.sensibleEffectiveness * 100).toFixed(0)}%`],
              ['ΔP', `${state.fanInputs.hrDeltaP} Pa`],
            ]} accent="var(--text-2)" />
            <SizingCard icon={Droplet} title="დატენიანება" rows={[
              ['ტიპი', sd ? HUMIDIFIER_LABELS[sd.humidifier] ?? sd.humidifier : 'არ არის'],
            ]} accent="var(--blue)" />
          </div>
        </div>

        <div
          className="mt-4 rounded-lg p-3 flex items-center justify-between"
          style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-bd)' }}
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
  icon: LucideIcon;
  title: string;
  rows: [string, string][];
  accent?: string;
}
function SizingCard({ icon: Icon, title, rows, accent }: CardProps) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} color={accent ?? 'var(--text-3)'} />
        <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{title}</div>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between items-baseline py-0.5">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{k}</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text)' }}>{v || '—'}</span>
        </div>
      ))}
    </div>
  );
}
