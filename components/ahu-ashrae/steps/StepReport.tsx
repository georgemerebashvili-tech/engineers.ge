'use client';

import React from 'react';
import {
  Download, Printer, Snowflake, Flame, Fan, Wind, Droplet, Gauge,
  Filter as FilterIcon, ArrowLeftRight, PanelTopOpen, Volume2, Shuffle, Zap,
  CheckCircle2, AlertTriangle, Info,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AhuUnit, AhuProject, PsychrometricResults } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import type { SectionConfig, SectionType } from '@/lib/ahu-ashrae/sections';
import type { AirState } from '@/lib/ahu-ashrae/air-state';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';
import { FILTER_DP, FILTER_FORM_DP_FACTOR, resolveFilterForm } from '@/lib/ahu-ashrae/sections/process-passive';
import { airDensity } from '@/lib/ahu-ashrae/psychrometrics';

interface Props {
  project: AhuProject;
  state: AhuWizardState;
  unit: AhuUnit;
  psychro?: PsychrometricResults;
  chain?: ChainResult;
}

export function StepReport({ project, state, unit, psychro, chain }: Props) {
  const ahuSpec = unit.ahuType ? getAhuTypeSpec(unit.ahuType) : null;
  const today = new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });

  const enabledSections = (state.sections ?? [])
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Total fan motor electric power for system SFP
  const { fanElecKwTotal, vDotM3s } = React.useMemo(() => {
    if (!chain) return { fanElecKwTotal: 0, vDotM3s: 0 };
    let total = 0;
    let vDot = 0;
    enabledSections.forEach((sec, i) => {
      if (sec.spec.type !== 'fan') return;
      const node = chain.states[i + 1];
      if (!node || !node.energy) return;
      const inlet = chain.states[i].state;
      const rho = airDensity(inlet.tdb, inlet.w, inlet.p);
      vDot = inlet.mDot / rho;
      const motorElecKw = node.energy / Math.max(0.01, (sec.spec.params as { motorHeatFraction: number }).motorHeatFraction);
      total += motorElecKw;
    });
    return { fanElecKwTotal: total, vDotM3s: vDot };
  }, [chain, enabledSections]);

  return (
    <div className="space-y-5 print:space-y-3">
      {/* ── Action toolbar (hidden in print) ── */}
      <div className="print:hidden flex items-center justify-end gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'var(--blue)', color: '#fff' }}
        >
          <Printer size={14} /> ბეჭდვა / PDF
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold opacity-60 cursor-not-allowed"
          style={{ background: 'var(--sur-2)', color: 'var(--text-3)', border: '1px solid var(--bdr)' }}
        >
          <Download size={14} /> PDF გენერაცია
        </button>
      </div>

      {/* ── Report document ── */}
      <article
        className="rounded-xl border p-8 print:p-0 print:border-0 print:rounded-none"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        {/* Header */}
        <header className="border-b pb-5 mb-6 print:pb-3 print:mb-4" style={{ borderColor: 'var(--bdr-2)' }}>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-3)' }}>
                AHU Calculation Report · ASHRAE / EN / Eurovent
              </div>
              <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--navy)' }}>
                {unit.name}
                {ahuSpec && <span className="text-base font-normal ml-3" style={{ color: 'var(--text-3)' }}>· {ahuSpec.shortLabel}</span>}
              </h1>
              <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                {project.name}{project.location ? ` · ${project.location}` : ''}
              </div>
            </div>
            <div className="text-right text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              <div>{today}</div>
              <div>engineers.ge</div>
            </div>
          </div>
        </header>

        {/* 1. Inputs */}
        <Section title="1. საწყისი მონაცემები">
          <KvGrid rows={[
            ['ხარჯი (supply)', `${state.airflow.supplyAirflow.toLocaleString('en-US')} m³/h`],
            ['OA fraction', `${(state.airflow.oaFraction * 100).toFixed(0)}%`],
            ['ზაფხული · გარე', `${state.design.summerOutdoorDB.toFixed(1)}°C DB / ${state.design.summerOutdoorWB.toFixed(1)}°C WB`],
            ['ზამთარი · გარე', `${state.design.winterOutdoorDB.toFixed(1)}°C DB / ${state.design.winterOutdoorRH.toFixed(0)}% RH`],
            ['ოთახი · ზაფხული', `${state.design.summerIndoorDB.toFixed(1)}°C / ${state.design.summerIndoorRH.toFixed(0)}% RH`],
            ['ოთახი · ზამთარი', `${state.design.winterIndoorDB.toFixed(1)}°C / ${state.design.winterIndoorRH.toFixed(0)}% RH`],
            ['ატმოს. წნევა', `${state.design.pressure.toFixed(1)} kPa`],
          ]} />
        </Section>

        {/* 2. AHU type */}
        {ahuSpec && (
          <Section title="2. AHU სქემა">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
              <strong>{ahuSpec.title}</strong> — ეფექტურობა {(ahuSpec.sensibleEffMin * 100).toFixed(0)}–{(ahuSpec.sensibleEffMax * 100).toFixed(0)}%
            </p>
          </Section>
        )}

        {/* 3. Headline numbers */}
        <Section title="3. შედეგები — ძირითადი ციფრები">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <Big icon={Wind} label="ხარჯი" value={state.airflow.supplyAirflow.toLocaleString('en-US')} unit="m³/h" />
            <Big icon={Snowflake} label="გაცივება" value={(chain?.totalCooling ?? psychro?.coolingCapacity.total ?? 0).toFixed(1)} unit="kW" />
            <Big icon={Flame} label="გათბობა" value={(chain?.totalHeating ?? 0).toFixed(1)} unit="kW" />
            {chain && <Big icon={Gauge} label="ჯამური ΔP" value={chain.totalDeltaP.toFixed(0)} unit="Pa" />}
            {chain && <Big icon={Droplet} label="კონდენსატი" value={(chain.totalCondensate * 3600).toFixed(2)} unit="kg/h" />}
            {vDotM3s > 0 && fanElecKwTotal > 0 && (
              <Big icon={Fan} label="სისტ. SFP" value={(fanElecKwTotal * 1000 / vDotM3s).toFixed(0)} unit="W/(m³/s)" />
            )}
            {chain?.supplyState && (
              <>
                <Big icon={Wind} label="მიწოდება T" value={chain.supplyState.tdb.toFixed(1)} unit="°C" />
                <Big icon={Droplet} label="მიწოდება RH" value={(chain.supplyState.rh * 100).toFixed(0)} unit="%" />
              </>
            )}
          </div>
        </Section>

        {/* 4. State table */}
        {chain && chain.states.length > 1 && (
          <Section title="4. ჯაჭვის წერტილები (state-by-state)">
            <table className="w-full text-xs" style={{ color: 'var(--text)' }}>
              <thead>
                <tr style={{ background: 'var(--sur-2)' }}>
                  <Th>#</Th>
                  <Th>წერტილი</Th>
                  <Th align="right">DB °C</Th>
                  <Th align="right">WB °C</Th>
                  <Th align="right">W g/kg</Th>
                  <Th align="right">RH %</Th>
                  <Th align="right">h kJ/kg</Th>
                  <Th align="right">ΔP Pa</Th>
                </tr>
              </thead>
              <tbody>
                {chain.states.map((p, i) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'var(--bdr)' }}>
                    <Td mono>s{i}</Td>
                    <Td>{p.label}</Td>
                    <Td align="right" mono>{p.state.tdb.toFixed(2)}</Td>
                    <Td align="right" mono>{p.state.twb.toFixed(2)}</Td>
                    <Td align="right" mono>{(p.state.w * 1000).toFixed(2)}</Td>
                    <Td align="right" mono>{(p.state.rh * 100).toFixed(1)}</Td>
                    <Td align="right" mono>{p.state.h.toFixed(2)}</Td>
                    <Td align="right" mono>{p.deltaP != null ? p.deltaP.toFixed(0) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 5. Per-component calculation sheets */}
        {chain && chain.journal.length > 0 && (
          <Section title="5. კომპონენტების გათვლის ანგარიში (Eurovent / ASHRAE)">
            <div className="space-y-4">
              {chain.journal.map((bullet, i) => {
                const inlet = chain.states[i].state;
                const outletNode = chain.states[i + 1];
                const section = enabledSections[i];
                if (!section || !outletNode) return null;
                return (
                  <CalcSheetCard
                    key={bullet.sectionId}
                    num={i + 1}
                    label={bullet.sectionLabel}
                    section={section}
                    inlet={inlet}
                    outlet={outletNode.state}
                    deltaP={outletNode.deltaP ?? 0}
                    energy={outletNode.energy}
                    sensible={outletNode.sensible}
                    latent={outletNode.latent}
                    details={bullet.details}
                    reference={bullet.reference}
                  />
                );
              })}
            </div>
          </Section>
        )}

        {/* 6. Eurovent SFP summary (if fans present) */}
        {vDotM3s > 0 && fanElecKwTotal > 0 && (
          <Section title="6. Eurovent SFP შეჯამება — EN 16798-3:2017">
            <EuroventSfpSummary
              vDotM3s={vDotM3s}
              fanElecKwTotal={fanElecKwTotal}
              totalDeltaP={chain?.totalDeltaP ?? 0}
            />
          </Section>
        )}

        {/* Footer */}
        <footer className="mt-6 pt-4 text-[10px] border-t print:mt-3 print:pt-2" style={{ borderColor: 'var(--bdr)', color: 'var(--text-3)' }}>
          <div>Generated by engineers.ge AHU calc · ASHRAE Handbook of Fundamentals 2021 · ASHRAE 62.1 · 90.1 · 55-2017 · ISO 7730 · EN 15251 / EN 16798 · Eurovent 4/5 · 6/3 · 6/5 · 8/1</div>
          <div className="mt-1">
            ეს რეპორტი არის გათვლის შედეგი — საბოლოო პროექტირებამდე საჭიროა ინჟინრის დადასტურება და ადგილზე გაზომვებთან შედარება.
          </div>
        </footer>
      </article>
    </div>
  );
}

// ─── CalcSheetCard ─────────────────────────────────────────────────────────────

const SECTION_ICON: Record<SectionType, LucideIcon> = {
  damper: PanelTopOpen,
  filter: FilterIcon,
  mixing_box: Shuffle,
  heat_recovery: ArrowLeftRight,
  preheat: Flame,
  cooling_coil: Snowflake,
  reheat: Flame,
  humidifier: Droplet,
  fan: Fan,
  silencer: Volume2,
};

const SECTION_COLOR: Record<SectionType, string> = {
  damper: '#64748b',
  filter: '#8b5cf6',
  mixing_box: '#06b6d4',
  heat_recovery: '#10b981',
  preheat: '#ef4444',
  cooling_coil: '#3b82f6',
  reheat: '#f97316',
  humidifier: '#0ea5e9',
  fan: '#6366f1',
  silencer: '#94a3b8',
};

interface CalcSheetProps {
  num: number;
  label: string;
  section: SectionConfig;
  inlet: AirState;
  outlet: AirState;
  deltaP: number;
  energy?: number;
  sensible?: number;
  latent?: number;
  details: string[];
  reference?: string;
}

function CalcSheetCard({
  num, label, section, inlet, outlet, deltaP, energy, sensible, latent, details, reference,
}: CalcSheetProps) {
  const Icon = SECTION_ICON[section.spec.type];
  const color = SECTION_COLOR[section.spec.type];

  const hasEnergy = energy != null && Math.abs(energy) > 0.01;
  const isCooling = hasEnergy && (energy ?? 0) < 0;
  const isHeating = hasEnergy && (energy ?? 0) > 0;
  const shr = hasEnergy && sensible != null
    ? Math.abs(sensible) / Math.abs(energy!)
    : null;

  return (
    <div
      className="rounded-xl border overflow-hidden print:break-inside-avoid"
      style={{ borderColor: 'var(--bdr)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `${color}15`, borderBottom: `1px solid ${color}30` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ background: color, color: '#fff' }}
          >
            <Icon size={14} />
          </span>
          <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--text-3)' }}>
            §{num}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{label}</span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded"
            style={{ background: `${color}20`, color }}
          >
            {section.spec.type.replace('_', ' ')}
          </span>
        </div>
        {reference && (
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-3)' }}>
            {reference}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* State comparison + results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {/* Inlet */}
          <StateBox label="შემავალი ✦ inlet" state={inlet} variant="in" />
          {/* Outlet */}
          <StateBox label="გამავალი ✦ outlet" state={outlet} variant="out" />
          {/* Key results */}
          <div
            className="rounded-lg border p-3"
            style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr-2)' }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
              შედეგი
            </div>
            <ResultRow label="ΔP" value={`${deltaP.toFixed(0)} Pa`} />
            {isCooling && (
              <>
                <ResultRow label="Q_total" value={`${(-energy!).toFixed(2)} kW`} color="#3b82f6" />
                {sensible != null && <ResultRow label="Q_sens" value={`${(-sensible).toFixed(2)} kW`} />}
                {latent != null && <ResultRow label="Q_lat" value={`${(-(latent)).toFixed(2)} kW`} />}
                {shr != null && <ResultRow label="SHR" value={`${(shr * 100).toFixed(0)}%`} />}
              </>
            )}
            {isHeating && (
              <ResultRow label="Q" value={`+${energy!.toFixed(2)} kW`} color="#ef4444" />
            )}
          </div>
        </div>

        {/* Formula trace */}
        {details.length > 0 && (
          <div
            className="rounded-lg border p-3 mb-3"
            style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
              გათვლის ნაბიჯები
            </div>
            <ul className="space-y-0.5">
              {details.map((d, j) => (
                <li key={j} className="text-[11px] font-mono leading-relaxed flex gap-1.5" style={{ color: 'var(--text)' }}>
                  <span style={{ color: 'var(--text-3)' }}>›</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Eurovent-specific panel */}
        <EuroventPanel section={section} inlet={inlet} energy={energy} />
      </div>
    </div>
  );
}

// ─── EuroventPanel — type-specific Eurovent checks ────────────────────────────

function EuroventPanel({
  section, inlet, energy,
}: {
  section: SectionConfig;
  inlet: AirState;
  energy?: number;
}) {
  const type = section.spec.type;

  if (type === 'fan') {
    const p = section.spec.params as { fanEff: number; motorEff: number; motorHeatFraction: number; externalDeltaP: number };
    const rho = airDensity(inlet.tdb, inlet.w, inlet.p);
    const vDot = inlet.mDot / rho;
    const motorElecKw = (energy ?? 0) / Math.max(0.01, p.motorHeatFraction);
    const sfp = vDot > 0 ? (motorElecKw * 1000) / vDot : 0;
    const { cat, bg, fg, icon: StatusIcon } = sfpCat(sfp);
    return (
      <div
        className="rounded-lg border p-3"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
          <Zap size={10} />
          Eurovent SFP — EN 16798-3:2017
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
          <Evcell label="V̇" value={`${(vDot * 3600).toFixed(0)} m³/h`} />
          <EvcellKw label="P_el" value={motorElecKw} />
          <Evcell label="η_fan" value={`${(p.fanEff * 100).toFixed(0)}%`} />
          <Evcell label="η_motor" value={`${(p.motorEff * 100).toFixed(0)}%`} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>
            SFP = P_el × 1000 / V̇ = {sfp.toFixed(0)} W/(m³/s)
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: bg, color: fg }}
          >
            <StatusIcon size={11} />
            {cat}
          </span>
        </div>
        <SfpScale sfp={sfp} />
      </div>
    );
  }

  if (type === 'heat_recovery') {
    const p = section.spec.params as { sensibleEff: number; latentEff: number; hrType: string };
    const eS = p.sensibleEff;
    const eL = p.latentEff;
    const { cls, bg, fg, icon: StatusIcon } = hrCls(eS);
    const trPct = (eS * 100).toFixed(0);
    return (
      <div
        className="rounded-lg border p-3"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
          <ArrowLeftRight size={10} />
          Eurovent 6/5 — Temperature Ratio (EN 308)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
          <Evcell label="TR (εs)" value={`${trPct}%`} />
          <Evcell label="εl (lat.)" value={eL > 0 ? `${(eL * 100).toFixed(0)}%` : 'n/a'} />
          <Evcell label="ტიპი" value={p.hrType.replace(/_/g, ' ')} />
          <div />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>
            TR = ε_s = {trPct}% (Eurovent რეკ. ≥ 70%)
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: bg, color: fg }}
          >
            <StatusIcon size={11} />
            {cls}
          </span>
        </div>
        {eS < 0.60 && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px]" style={{ color: '#b45309' }}>
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
            ε_s &lt; 60% — Eurovent 6/5 მინიმუმის ქვემოთ. გთხოვთ გადახედოთ HR ტიპს ან ეფექტურობის პარამეტრს.
          </div>
        )}
      </div>
    );
  }

  if (type === 'filter') {
    const p = section.spec.params as { filterClass: string; form?: string; useAverageDeltaP: boolean };
    const fc = p.filterClass as keyof typeof FILTER_DP;
    const spec = FILTER_DP[fc];
    const form = resolveFilterForm(p as Parameters<typeof resolveFilterForm>[0]);
    const ff = FILTER_FORM_DP_FACTOR[form];
    const dpClean = spec.clean * ff;
    const dpAvg = spec.avg * ff;
    const dpDirty = spec.dirty * ff;
    return (
      <div
        className="rounded-lg border p-3"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
          <FilterIcon size={10} />
          Eurovent 4/5 — ISO 16890 ΔP Lifecycle Profile
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          {[
            { lbl: 'სუფთა', sub: 'clean', pa: dpClean, note: '' },
            { lbl: 'საშ. (lifecycle)', sub: 'mid-life avg', pa: dpAvg, note: '← design point' },
            { lbl: 'დაბინძ.', sub: 'dirty / end-of-life', pa: dpDirty, note: '' },
          ].map(({ lbl, sub, pa, note }) => (
            <div
              key={sub}
              className="rounded-lg border px-2 py-1.5 text-center"
              style={{
                background: 'var(--sur)',
                borderColor: p.useAverageDeltaP && sub === 'mid-life avg' ? 'var(--blue)' : 'var(--bdr)',
                boxShadow: p.useAverageDeltaP && sub === 'mid-life avg' ? '0 0 0 1px var(--blue)' : undefined,
              }}
            >
              <div className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>{lbl}</div>
              <div className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--navy)' }}>{pa.toFixed(0)}</div>
              <div className="text-[9px] font-mono" style={{ color: 'var(--text-3)' }}>Pa</div>
              {note && <div className="text-[9px] mt-0.5" style={{ color: 'var(--blue)' }}>{note}</div>}
            </div>
          ))}
        </div>
        <div className="text-[11px] font-mono" style={{ color: 'var(--text-2)' }}>
          ΔP = ΔP_base × ff = {spec.clean} × {ff.toFixed(2)} = {dpClean.toFixed(0)} Pa (clean) · form: {form} · class: {fc}
        </div>
      </div>
    );
  }

  if (type === 'cooling_coil') {
    const p = section.spec.params as { source: string; bypassFactor: number; apparatusDewPoint: number; targetTdb: number };
    const totalQ = energy != null ? Math.abs(energy) : 0;
    return (
      <div
        className="rounded-lg border p-3"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
          <Snowflake size={10} />
          Eurovent 8/1 — Cooling Coil Performance (ASHRAE HOF Ch.27)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Evcell label="წყარო" value={p.source === 'chw' ? 'CHW' : 'DX'} />
          <Evcell label="ADP" value={`${p.apparatusDewPoint.toFixed(1)}°C`} />
          <Evcell label="BF" value={p.bypassFactor.toFixed(2)} />
          <Evcell label="Q_total" value={`${totalQ.toFixed(2)} kW`} />
        </div>
      </div>
    );
  }

  return null;
}

// ─── EuroventSfpSummary ────────────────────────────────────────────────────────

interface SfpSummaryProps {
  vDotM3s: number;
  fanElecKwTotal: number;
  totalDeltaP: number;
}

function EuroventSfpSummary({ vDotM3s, fanElecKwTotal, totalDeltaP }: SfpSummaryProps) {
  const sfpSystem = vDotM3s > 0 ? (fanElecKwTotal * 1000) / vDotM3s : 0;
  const { cat, bg, fg, icon: StatusIcon } = sfpCat(sfpSystem);

  return (
    <div className="space-y-4">
      {/* System SFP card */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: 'var(--text-3)' }}>
              AHU სისტემის SFP — EN 16798-3:2017 §5.2
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--navy)' }}>
              {sfpSystem.toFixed(0)} <span className="text-sm font-normal">W/(m³/s)</span>
            </div>
          </div>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm"
            style={{ background: bg, color: fg }}
          >
            <StatusIcon size={14} />
            {cat}
          </span>
        </div>
        <KvGrid rows={[
          ['V̇ (ხარჯი)', `${(vDotM3s * 3600).toFixed(0)} m³/h = ${vDotM3s.toFixed(3)} m³/s`],
          ['P_fan_el ჯამი', `${fanElecKwTotal.toFixed(3)} kW`],
          ['ΔP სისტ. ჯამი', `${totalDeltaP.toFixed(0)} Pa`],
          ['SFP = P_el·1000/V̇', `${(fanElecKwTotal * 1000).toFixed(0)} / ${vDotM3s.toFixed(3)} = ${sfpSystem.toFixed(0)} W/(m³/s)`],
        ]} />
        <SfpScale sfp={sfpSystem} />
      </div>

      {/* SFP classification table */}
      <table className="w-full text-xs" style={{ color: 'var(--text)' }}>
        <caption className="text-left pb-2 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
          EN 16798-3:2017 — SFP კატეგორიების ცხრილი
        </caption>
        <thead>
          <tr style={{ background: 'var(--sur-2)' }}>
            <Th>კატეგ.</Th>
            <Th align="right">SFP ≤ W/(m³/s)</Th>
            <Th>შეფასება</Th>
            <Th>სტატუსი</Th>
          </tr>
        </thead>
        <tbody>
          {SFP_TABLE.map(({ cat: c, limit, rating }) => {
            const isCurrent = sfpCat(sfpSystem).cat === c;
            return (
              <tr
                key={c}
                className="border-t"
                style={{
                  borderColor: 'var(--bdr)',
                  background: isCurrent ? 'var(--blue-lt)' : undefined,
                  fontWeight: isCurrent ? 700 : undefined,
                }}
              >
                <Td mono>{c}</Td>
                <Td align="right" mono>{limit}</Td>
                <Td>{rating}</Td>
                <Td>
                  {isCurrent ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--blue)', color: '#fff' }}>
                      ← მიმდინარე
                    </span>
                  ) : sfpSystem <= (SFP_TABLE.find(x => x.cat === c)?.limitNum ?? Infinity) ? null : null}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SFP_TABLE = [
  { cat: 'SFP 1', limit: '300',  limitNum: 300,  rating: 'გამოჩინებული (exceptional)' },
  { cat: 'SFP 2', limit: '500',  limitNum: 500,  rating: 'კარგი (good)' },
  { cat: 'SFP 3', limit: '750',  limitNum: 750,  rating: 'საშუალო (average)' },
  { cat: 'SFP 4', limit: '1250', limitNum: 1250, rating: 'მისაღები (acceptable)' },
  { cat: 'SFP 5', limit: '2000', limitNum: 2000, rating: 'სუსტი (poor)' },
  { cat: 'SFP 6', limit: '3000', limitNum: 3000, rating: 'ძალიან სუსტი (very poor)' },
  { cat: 'SFP 7', limit: '>3000', limitNum: Infinity, rating: 'მიუღებელი (unacceptable)' },
];

function sfpCat(sfp: number): { cat: string; bg: string; fg: string; icon: LucideIcon } {
  if (sfp <= 300)  return { cat: 'SFP 1', bg: '#bbf7d0', fg: '#14532d', icon: CheckCircle2 };
  if (sfp <= 500)  return { cat: 'SFP 2', bg: '#d1fae5', fg: '#065f46', icon: CheckCircle2 };
  if (sfp <= 750)  return { cat: 'SFP 3', bg: '#d1fae5', fg: '#065f46', icon: CheckCircle2 };
  if (sfp <= 1250) return { cat: 'SFP 4', bg: '#fef9c3', fg: '#713f12', icon: Info };
  if (sfp <= 2000) return { cat: 'SFP 5', bg: '#fef3c7', fg: '#92400e', icon: AlertTriangle };
  if (sfp <= 3000) return { cat: 'SFP 6', bg: '#fee2e2', fg: '#991b1b', icon: AlertTriangle };
  return           { cat: 'SFP 7', bg: '#fca5a5', fg: '#7f1d1d', icon: AlertTriangle };
}

function hrCls(eS: number): { cls: string; bg: string; fg: string; icon: LucideIcon } {
  if (eS >= 0.80) return { cls: 'Class A ≥80%', bg: '#bbf7d0', fg: '#14532d', icon: CheckCircle2 };
  if (eS >= 0.70) return { cls: 'Class B ≥70%', bg: '#d1fae5', fg: '#065f46', icon: CheckCircle2 };
  if (eS >= 0.60) return { cls: 'Class C ≥60%', bg: '#fef9c3', fg: '#713f12', icon: Info };
  return          { cls: 'Class D <60%', bg: '#fee2e2', fg: '#991b1b', icon: AlertTriangle };
}

function SfpScale({ sfp }: { sfp: number }) {
  const pct = Math.min(100, (sfp / 3000) * 100);
  const { bg } = sfpCat(sfp);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[9px] font-mono mb-1" style={{ color: 'var(--text-3)' }}>
        <span>0 (SFP 1)</span><span>1000</span><span>2000</span><span>3000+ (SFP 7)</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bdr-2)' }}>
        {/* gradient bar background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(to right, #bbf7d0, #fef9c3, #fee2e2, #fca5a5)' }}
        />
        {/* needle */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ left: `calc(${pct}% - 2px)`, background: '#1e293b' }}
        />
      </div>
    </div>
  );
}

function StateBox({ label, state, variant }: { label: string; state: AirState; variant: 'in' | 'out' }) {
  const borderColor = variant === 'in' ? '#7dd3fc' : '#6ee7b7';
  const bg = variant === 'in' ? '#f0f9ff' : '#f0fdf4';
  const labelColor = variant === 'in' ? '#0369a1' : '#065f46';
  return (
    <div className="rounded-lg border p-3" style={{ background: bg, borderColor }}>
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="space-y-0.5 text-xs font-mono">
        <StateRow k="T_db" v={`${state.tdb.toFixed(2)}°C`} />
        <StateRow k="T_wb" v={`${state.twb.toFixed(2)}°C`} />
        <StateRow k="W" v={`${(state.w * 1000).toFixed(2)} g/kg`} />
        <StateRow k="RH" v={`${(state.rh * 100).toFixed(1)}%`} />
        <StateRow k="h" v={`${state.h.toFixed(2)} kJ/kg`} />
      </div>
    </div>
  );
}

function StateRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: '#64748b' }}>{k}</span>
      <span style={{ color: '#0f172a' }}>{v}</span>
    </div>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-baseline border-b py-0.5" style={{ borderColor: 'var(--bdr)' }}>
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-xs font-mono font-bold" style={{ color: color ?? 'var(--navy)' }}>{value}</span>
    </div>
  );
}

function Evcell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-1.5 text-center" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
      <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="font-mono font-bold text-xs mt-0.5" style={{ color: 'var(--navy)' }}>{value}</div>
    </div>
  );
}

function EvcellKw({ label, value }: { label: string; value: number }) {
  return <Evcell label={label} value={`${value.toFixed(3)} kW`} />;
}

// ─── Shared layout sub-components ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 print:mb-3">
      <h2
        className="text-xs font-bold uppercase tracking-[0.1em] mb-3 print:mb-2 pb-1.5 border-b"
        style={{ color: 'var(--navy)', borderColor: 'var(--bdr)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function KvGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between items-baseline border-b" style={{ borderColor: 'var(--bdr)' }}>
          <span style={{ color: 'var(--text-3)' }}>{k}</span>
          <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Big({
  icon: Icon, label, value, unit,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border p-3 print:p-2" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} />
        <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>{label}</div>
      </div>
      <div className="text-base font-bold font-mono leading-none" style={{ color: 'var(--navy)' }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{unit}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-3)', textAlign: align }}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left', mono }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean }) {
  return (
    <td className={`px-3 py-1.5 text-xs ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text)', textAlign: align }}>
      {children}
    </td>
  );
}
