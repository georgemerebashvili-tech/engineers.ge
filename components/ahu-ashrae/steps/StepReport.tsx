'use client';

import React from 'react';
import { Download, FileText, Printer, Snowflake, Flame, Fan, Wind, Droplet, Gauge } from 'lucide-react';
import type { AhuWizardState, AhuUnit, AhuProject, PsychrometricResults } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import { getAhuTypeSpec } from '@/lib/ahu-ashrae/ahu-types-data';

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
          title="PDF გენერაცია — შემდეგი iteration"
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
                AHU Calculation Report · ASHRAE / EN
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
            ['Sensible cooling load', `${state.loads.sensibleCooling.toFixed(1)} kW`],
            ['Latent cooling load', `${state.loads.latentCooling.toFixed(1)} kW`],
            ['Heating load', `${state.loads.heatingLoad.toFixed(1)} kW`],
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

        {/* 3. Sections */}
        {state.sections && state.sections.length > 0 && (
          <Section title="3. სექციათა ჯაჭვი">
            <ol className="space-y-1.5 text-xs" style={{ color: 'var(--text)' }}>
              {state.sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order).map((s, i) => (
                <li key={s.id} className="flex items-baseline gap-2">
                  <span className="font-mono shrink-0" style={{ color: 'var(--text-3)' }}>{(i + 1).toString().padStart(2, '0')}.</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>({s.spec.type})</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* 4. Headline numbers */}
        <Section title="4. შედეგები — ძირითადი ციფრები">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <Big icon={Wind} label="ხარჯი" value={state.airflow.supplyAirflow.toLocaleString('en-US')} unit="m³/h" />
            <Big icon={Snowflake} label="გაცივება" value={(chain?.totalCooling ?? psychro?.coolingCapacity.total ?? 0).toFixed(1)} unit="kW" />
            <Big icon={Flame} label="გათბობა" value={(chain?.totalHeating ?? state.loads.heatingLoad).toFixed(1)} unit="kW" />
            {chain && <Big icon={Gauge} label="ჯამური ΔP" value={chain.totalDeltaP.toFixed(0)} unit="Pa" />}
            {chain && <Big icon={Droplet} label="კონდენსატი" value={(chain.totalCondensate * 3600).toFixed(2)} unit="kg/h" />}
            {chain?.supplyState && (
              <>
                <Big icon={Wind} label="მიწოდება T" value={chain.supplyState.tdb.toFixed(1)} unit="°C" />
                <Big icon={Droplet} label="მიწოდება RH" value={(chain.supplyState.rh * 100).toFixed(0)} unit="%" />
              </>
            )}
          </div>
        </Section>

        {/* 5. State table */}
        {chain && chain.states.length > 1 && (
          <Section title="5. ჯაჭვის წერტილები (state-by-state)">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 6. Auto-narrative journal */}
        {chain && chain.journal.length > 0 && (
          <Section title="6. გადასვლების ჟურნალი (auto-narrative)">
            <ol className="space-y-3 print:space-y-2">
              {chain.journal.map((b, i) => (
                <li
                  key={`${b.sectionId}-${i}`}
                  className="rounded-lg border p-3 print:border-0 print:p-0 print:border-l-2 print:pl-3"
                  style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
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
                  <div className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--text)' }}>
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
          </Section>
        )}

        {/* 7. Footer */}
        <footer className="mt-6 pt-4 text-[10px] border-t print:mt-3 print:pt-2" style={{ borderColor: 'var(--bdr)', color: 'var(--text-3)' }}>
          <div>Generated by engineers.ge AHU calc · ASHRAE Handbook of Fundamentals 2021 · ASHRAE 62.1 · 90.1 · 55-2017 · ISO 7730 · EN 15251 / EN 16798</div>
          <div className="mt-1">
            ეს რეპორტი არის გათვლის შედეგი — საბოლოო პროექტირებამდე საჭიროა ინჟინრის დადასტურება და ადგილზე გაზომვებთან შედარება.
          </div>
        </footer>
      </article>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function Big({ icon: Icon, label, value, unit }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; unit: string }) {
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
