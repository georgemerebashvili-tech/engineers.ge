'use client';

import React, { useCallback } from 'react';
import { MapPin, Wind, Zap, Info } from 'lucide-react';
import type { AhuWizardState, PsychrometricResults } from '@/lib/ahu-ashrae/types';
import { CITY_GROUPS, ASHRAE_621_SPACES, ashrae621MinOA } from '@/lib/ahu-ashrae/climate-data';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: AhuWizardState;
  onUpdate: (partial: Partial<AhuWizardState>) => void;
  psychro?: PsychrometricResults;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step1Inputs({ state, onUpdate, psychro }: Props) {
  const { project, selectedCity, design, airflow, loads } = state;

  // ── City select ──
  const handleCityChange = useCallback((id: string) => {
    let found = null;
    for (const g of CITY_GROUPS) {
      found = g.cities.find((c) => c.id === id) ?? null;
      if (found) break;
    }
    if (!found) return;
    onUpdate({
      selectedCity: found,
      design: {
        ...design,
        outdoorDB: found.summerDB,
        outdoorWB: found.summerMCWB,
        pressure: found.pressure,
      },
    });
  }, [design, onUpdate]);

  // ── Mode toggle ──
  const handleModeChange = useCallback((mode: 'cooling' | 'heating') => {
    if (!selectedCity) return;
    onUpdate({
      design: {
        ...design,
        mode,
        outdoorDB: mode === 'cooling' ? selectedCity.summerDB : selectedCity.winterDB99,
        outdoorWB: mode === 'cooling' ? selectedCity.summerMCWB : 0,
        outdoorRH: mode === 'heating' ? 80 : design.outdoorRH,
      },
    });
  }, [design, selectedCity, onUpdate]);

  // ── OA from ASHRAE 62.1 ──
  const minOA = airflow.ventilationMethod === 'ashrae621'
    ? ashrae621MinOA(airflow.spaceCategory ?? 'office', airflow.occupants ?? 0, airflow.floorArea ?? 0)
    : 0;
  const oaM3h = airflow.ventilationMethod === 'fraction'
    ? airflow.supplyAirflow * airflow.oaFraction
    : minOA;
  const oaFractionDisplay = airflow.supplyAirflow > 0 ? (oaM3h / airflow.supplyAirflow) * 100 : 0;

  const shr = loads.sensibleCooling + loads.latentCooling > 0
    ? loads.sensibleCooling / (loads.sensibleCooling + loads.latentCooling)
    : 1;
  const totalLoad = loads.sensibleCooling + loads.latentCooling;

  return (
    <div className="space-y-5">
      {/* ── Project Info ── */}
      <Card icon={<Info size={14} />} title="პროექტი">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LabeledInput
            label="პროექტის სახელი"
            value={project.name}
            onChange={(v) => onUpdate({ project: { ...project, name: v } })}
            placeholder="AHU-01"
          />
          <LabeledInput
            label="ინჟინერი"
            value={project.engineer}
            onChange={(v) => onUpdate({ project: { ...project, engineer: v } })}
            placeholder="სახელი"
          />
          <LabeledInput
            label="თარიღი"
            type="date"
            value={project.date}
            onChange={(v) => onUpdate({ project: { ...project, date: v } })}
          />
          <div />
        </div>
      </Card>

      {/* ── Location & Climate ── */}
      <Card icon={<MapPin size={14} />} title="მდებარეობა · ASHRAE კლიმატი">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* City picker */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
              ქალაქი
            </label>
            <select
              className="w-full rounded-lg px-3 py-2 text-xs border font-medium"
              style={{
                background: 'var(--sur)', borderColor: 'var(--bdr-2)',
                color: 'var(--text)', outline: 'none',
              }}
              value={selectedCity?.id ?? ''}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              {CITY_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.nameEn}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedCity && (
              <div className="mt-1.5 text-[10px] font-mono flex gap-3" style={{ color: 'var(--text-3)' }}>
                <span>{selectedCity.elevation} m ამ</span>
                <span>{selectedCity.pressure.toFixed(2)} kPa</span>
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
              რეჟიმი
            </label>
            <div
              className="inline-flex rounded-lg p-0.5 border"
              style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
            >
              {(['cooling', 'heating'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={
                    design.mode === m
                      ? { background: m === 'cooling' ? 'var(--blue)' : 'var(--ora)', color: '#fff' }
                      : { color: 'var(--text-3)' }
                  }
                >
                  {m === 'cooling' ? '❄ გაგრილება' : '🔥 გათბობა'}
                </button>
              ))}
            </div>
          </div>

          {/* ASHRAE design conditions info */}
          {selectedCity && (
            <div className="rounded-lg p-3 border" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
                ASHRAE HOF 2021 — {selectedCity.nameEn}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <DataRow label="Summer 0.4% DB" value={`${selectedCity.summerDB}°C`} />
                <DataRow label="Summer MCWB" value={`${selectedCity.summerMCWB}°C`} />
                <DataRow label="Winter 99% DB" value={`${selectedCity.winterDB99}°C`} />
                <DataRow label="Winter 99.6% DB" value={`${selectedCity.winterDB996}°C`} />
              </div>
            </div>
          )}
        </div>

        {/* Design conditions inputs */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <NumInput
            label="გარე DB"
            unit="°C"
            value={design.outdoorDB}
            onChange={(v) => onUpdate({ design: { ...design, outdoorDB: v } })}
          />
          {design.mode === 'cooling' ? (
            <NumInput
              label="გარე WB"
              unit="°C"
              value={design.outdoorWB}
              onChange={(v) => onUpdate({ design: { ...design, outdoorWB: v } })}
            />
          ) : (
            <NumInput
              label="გარე RH"
              unit="%"
              value={design.outdoorRH}
              min={0} max={100}
              onChange={(v) => onUpdate({ design: { ...design, outdoorRH: v } })}
            />
          )}
          <NumInput
            label="შიდა DB"
            unit="°C"
            value={design.indoorDB}
            onChange={(v) => onUpdate({ design: { ...design, indoorDB: v } })}
          />
          <NumInput
            label="შიდა RH"
            unit="%"
            value={design.indoorRH}
            min={0} max={100}
            onChange={(v) => onUpdate({ design: { ...design, indoorRH: v } })}
          />
          <NumInput
            label="ატ. წნევა"
            unit="kPa"
            value={design.pressure}
            step={0.1}
            onChange={(v) => onUpdate({ design: { ...design, pressure: v } })}
          />
        </div>
      </Card>

      {/* ── Airflow ── */}
      <Card icon={<Wind size={14} />} title="ჰაერის ნაკადი">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supply airflow */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput
                label="მიწოდების Q"
                unit="m³/h"
                value={airflow.supplyAirflow}
                step={100}
                onChange={(v) => onUpdate({ airflow: { ...airflow, supplyAirflow: v } })}
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
                  სახაზინო (OA)
                </label>
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
                  {(['fraction', 'ashrae621'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdate({ airflow: { ...airflow, ventilationMethod: m } })}
                      className="flex-1 py-1.5 text-[10px] font-semibold transition-all"
                      style={
                        airflow.ventilationMethod === m
                          ? { background: 'var(--blue)', color: '#fff' }
                          : { background: 'var(--sur)', color: 'var(--text-3)' }
                      }
                    >
                      {m === 'fraction' ? '% (%OA)' : 'ASHRAE 62.1'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {airflow.ventilationMethod === 'fraction' ? (
              <div className="mt-3">
                <NumInput
                  label="OA წილი"
                  unit="%"
                  value={airflow.oaFraction * 100}
                  min={0} max={100}
                  onChange={(v) => onUpdate({ airflow: { ...airflow, oaFraction: v / 100 } })}
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
                    სივრცე
                  </label>
                  <select
                    className="w-full rounded-lg px-2.5 py-2 text-xs border"
                    style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)', color: 'var(--text)' }}
                    value={airflow.spaceCategory ?? 'office'}
                    onChange={(e) => onUpdate({ airflow: { ...airflow, spaceCategory: e.target.value } })}
                  >
                    {ASHRAE_621_SPACES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <NumInput
                  label="ადამიანი"
                  unit="pax"
                  value={airflow.occupants ?? 0}
                  step={1}
                  onChange={(v) => onUpdate({ airflow: { ...airflow, occupants: v } })}
                />
                <NumInput
                  label="ფართი"
                  unit="m²"
                  value={airflow.floorArea ?? 0}
                  step={10}
                  onChange={(v) => onUpdate({ airflow: { ...airflow, floorArea: v } })}
                />
              </div>
            )}
          </div>

          {/* Airflow summary */}
          <div className="rounded-lg p-3 border" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>
              ჰაერის ბალანსი
            </div>
            <BarStat
              label="მიწოდება (SA)"
              value={airflow.supplyAirflow}
              unit="m³/h"
              max={airflow.supplyAirflow}
              color="var(--blue)"
            />
            <BarStat
              label={`სახაზინო (OA) — ${oaFractionDisplay.toFixed(0)}%`}
              value={oaM3h}
              unit="m³/h"
              max={airflow.supplyAirflow}
              color="var(--grn)"
            />
            <BarStat
              label="სარეციკლო (RA)"
              value={airflow.supplyAirflow - oaM3h}
              unit="m³/h"
              max={airflow.supplyAirflow}
              color="var(--text-3)"
            />
            {airflow.ventilationMethod === 'ashrae621' && (
              <div className="mt-2 text-[10px] font-mono" style={{ color: 'var(--blue)' }}>
                ASHRAE 62.1 min OA: {minOA.toFixed(0)} m³/h
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Thermal Loads ── */}
      <Card icon={<Zap size={14} />} title="სითბური დატვირთვები">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <NumInput
              label="Qs — სენსიბ."
              unit="kW"
              value={loads.sensibleCooling}
              step={0.5}
              onChange={(v) => onUpdate({ loads: { ...loads, sensibleCooling: v } })}
            />
            <NumInput
              label="Ql — ლატენტ."
              unit="kW"
              value={loads.latentCooling}
              step={0.5}
              onChange={(v) => onUpdate({ loads: { ...loads, latentCooling: v } })}
            />
            <NumInput
              label="Qh — გათბობა"
              unit="kW"
              value={loads.heatingLoad}
              step={0.5}
              onChange={(v) => onUpdate({ loads: { ...loads, heatingLoad: v } })}
            />
          </div>

          {/* Load summary */}
          <div className="rounded-lg p-3 border" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>
              დატვირთვის სტრუქტურა
            </div>
            <BarStat label="Qs სენსიბელური" value={loads.sensibleCooling} unit="kW" max={totalLoad || 1} color="var(--blue)" />
            <BarStat label="Ql ლატენტური" value={loads.latentCooling} unit="kW" max={totalLoad || 1} color="var(--ora)" />
            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center" style={{ borderColor: 'var(--bdr)' }}>
              <StatBox label="Qt" value={`${totalLoad.toFixed(1)} kW`} />
              <StatBox label="SHR" value={(shr * 100).toFixed(0) + '%'} highlight={shr < 0.75} />
              <StatBox
                label="Qs/m³"
                value={airflow.supplyAirflow > 0 ? `${((loads.sensibleCooling * 1000) / airflow.supplyAirflow).toFixed(1)} W/m³` : '—'}
              />
            </div>
          </div>
        </div>

        {/* Live psychro preview */}
        {psychro && (
          <div className="mt-4 rounded-lg p-3 border" style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--blue)' }}>
              Live — ფსიქრომეტრიული Preview
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <MiniPsychoBox label="T outdoor" tdb={psychro.outdoor.tdb} w={psychro.outdoor.w * 1000} rh={psychro.outdoor.rh} />
              <MiniPsychoBox label="T mixed" tdb={psychro.mixed.tdb} w={psychro.mixed.w * 1000} rh={psychro.mixed.rh} />
              <MiniPsychoBox label="T supply" tdb={psychro.supplyAir.tdb} w={psychro.supplyAir.w * 1000} rh={psychro.supplyAir.rh} />
              <MiniPsychoBox label="T room" tdb={psychro.roomAir.tdb} w={psychro.roomAir.w * 1000} rh={psychro.roomAir.rh} />
              <MiniPsychoBox label="ADP" tdb={psychro.adp.tdb} w={psychro.adp.w * 1000} rh={100} />
              <div className="rounded-lg p-2 text-center" style={{ background: 'var(--sur)', border: '1px solid var(--blue-bd)' }}>
                <div className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-3)' }}>CF</div>
                <div className="text-base font-bold font-mono" style={{ color: 'var(--blue)' }}>
                  {(psychro.contactFactor * 100).toFixed(0)}%
                </div>
                <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>contact factor</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4 md:p-5"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: 'var(--bdr)' }}>
        <span style={{ color: 'var(--blue)' }}>{icon}</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function LabeledInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full rounded-lg px-3 py-2 text-xs font-medium border"
        style={{
          background: 'var(--sur)', borderColor: 'var(--bdr-2)',
          color: 'var(--text)', outline: 'none',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumInput({
  label, unit, value, onChange, min, max, step = 1,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
        <input
          type="number"
          className="flex-1 min-w-0 px-3 py-2 text-xs font-mono font-medium bg-sur"
          style={{ color: 'var(--text)', outline: 'none', background: 'var(--sur)' }}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        <span
          className="px-2 flex items-center text-[10px] font-bold shrink-0"
          style={{ background: 'var(--sur-2)', color: 'var(--text-3)', borderLeft: '1px solid var(--bdr)' }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1">
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function BarStat({ label, value, unit, max, color }: { label: string; value: number; unit: string; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
        <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text)' }}>
          {value.toFixed(0)} {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bdr)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg p-2"
      style={{ background: highlight ? 'var(--ora-lt)' : 'var(--sur)', border: `1px solid ${highlight ? 'var(--ora-bd)' : 'var(--bdr)'}` }}
    >
      <div className="text-[9px] font-bold mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-xs font-bold font-mono" style={{ color: highlight ? 'var(--ora)' : 'var(--text)' }}>{value}</div>
    </div>
  );
}

function MiniPsychoBox({ label, tdb, w, rh }: { label: string; tdb: number; w: number; rh: number }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--sur)', border: '1px solid var(--blue-bd)' }}>
      <div className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color: 'var(--navy)' }}>{tdb.toFixed(1)}°</div>
      <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
        {w.toFixed(1)} g/kg
      </div>
      <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
        {rh.toFixed(0)}% RH
      </div>
    </div>
  );
}
