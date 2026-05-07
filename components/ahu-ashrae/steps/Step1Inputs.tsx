'use client';

import React, { useCallback } from 'react';
import { MapPin, Wind, Info, CheckCircle2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import {
  KAYA_MODELS, modelsForFlow, getKayaModel, faceVelocity,
  type KayaModel,
} from '@/lib/ahu-ashrae/kaya-models';
import type {
  AhuWizardState, PsychrometricResults, AhuProject, AhuUnit, CityClimate,
  CoolingSystemType, HeatingSystemType, FilterStageKey, HumidifierType, SystemDesignIntent,
} from '@/lib/ahu-ashrae/types';
import {
  CITY_GROUPS, ASHRAE_621_SPACES, ashrae621MinOA,
  CUSTOM_CITY_ID, makeCustomCity,
} from '@/lib/ahu-ashrae/climate-data';
import { pressureFromElevation } from '@/lib/ahu-ashrae/psychrometrics';
import { isBalancedAhu } from '@/lib/ahu-ashrae/ahu-types-data';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  project: AhuProject;
  unit: AhuUnit;
  state: AhuWizardState;
  onUpdate: (partial: Partial<AhuWizardState>) => void;
  psychro?: PsychrometricResults;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step1Inputs({ project, unit, state, onUpdate, psychro }: Props) {
  const { selectedCity, design, airflow, fanInputs } = state;
  const isCustom = selectedCity?.id === CUSTOM_CITY_ID;
  const balanced = isBalancedAhu(unit.ahuType);
  const exhaustAirflow = airflow.exhaustAirflow ?? airflow.supplyAirflow;
  const supplyPa = fanInputs.externalStaticPressure;
  const exhaustPa = fanInputs.exhaustExternalStaticPressure ?? fanInputs.externalStaticPressure;

  // ── City select ──
  const handleCityChange = useCallback((id: string) => {
    if (id === CUSTOM_CITY_ID) {
      const custom = makeCustomCity('');
      onUpdate({
        selectedCity: custom,
        design: {
          ...design,
          summerOutdoorDB: custom.summerDB,
          summerOutdoorWB: custom.summerMCWB,
          winterOutdoorDB: custom.winterDB99,
          pressure: custom.pressure,
        },
      });
      return;
    }
    let found: CityClimate | null = null;
    for (const g of CITY_GROUPS) {
      found = g.cities.find((c) => c.id === id) ?? null;
      if (found) break;
    }
    if (!found) return;
    onUpdate({
      selectedCity: found,
      design: {
        ...design,
        summerOutdoorDB: found.summerDB,
        summerOutdoorWB: found.summerMCWB,
        winterOutdoorDB: found.winterDB99,
        pressure: found.pressure,
      },
    });
  }, [design, onUpdate]);

  // ── Custom city update ──
  const updateCustomCity = useCallback((partial: Partial<CityClimate>) => {
    if (!selectedCity || selectedCity.id !== CUSTOM_CITY_ID) return;
    const next: CityClimate = { ...selectedCity, ...partial };
    if (partial.elevation !== undefined) next.pressure = pressureFromElevation(partial.elevation);
    if (partial.name !== undefined) next.nameEn = partial.name;
    // Sync design when ASHRAE values change
    const designUpdate = { ...design };
    if (partial.summerDB !== undefined) designUpdate.summerOutdoorDB = partial.summerDB;
    if (partial.summerMCWB !== undefined) designUpdate.summerOutdoorWB = partial.summerMCWB;
    if (partial.winterDB99 !== undefined) designUpdate.winterOutdoorDB = partial.winterDB99;
    if (next.pressure !== design.pressure) designUpdate.pressure = next.pressure;
    onUpdate({ selectedCity: next, design: designUpdate });
  }, [selectedCity, design, onUpdate]);

  // ── OA from ASHRAE 62.1 ──
  const minOA = airflow.ventilationMethod === 'ashrae621'
    ? ashrae621MinOA(airflow.spaceCategory ?? 'office', airflow.occupants ?? 0, airflow.floorArea ?? 0)
    : 0;
  const oaM3h = airflow.ventilationMethod === 'fraction'
    ? airflow.supplyAirflow * airflow.oaFraction
    : minOA;
  const oaFractionDisplay = airflow.supplyAirflow > 0 ? (oaM3h / airflow.supplyAirflow) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* ── Project / Unit info (read-only) ── */}
      <div
        className="rounded-xl border p-3 flex flex-wrap items-center gap-x-5 gap-y-1"
        style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>პროექტი</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>{project.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>AHU</span>
          <span className="text-xs font-bold font-mono" style={{ color: 'var(--blue)' }}>{unit.name}</span>
        </div>
        {project.engineer && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ინჟინერი</span>
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{project.engineer}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>თარიღი</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>{unit.date}</span>
        </div>
      </div>

      {/* ── Location & Climate ── */}
      <Card icon={<MapPin size={14} />} title="მდებარეობა · ASHRAE კლიმატი">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <optgroup label="ხელით">
                <option value={CUSTOM_CITY_ID}>+ სხვა ქალაქი (ხელით შევიყვან)</option>
              </optgroup>
            </select>
            {isCustom && (
              <input
                type="text"
                value={selectedCity?.name ?? ''}
                onChange={(e) => updateCustomCity({ name: e.target.value })}
                placeholder="ქალაქის სახელი"
                className="mt-1.5 w-full rounded-md px-2.5 py-1.5 text-xs border"
                style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)', color: 'var(--text)', outline: 'none' }}
              />
            )}
            {selectedCity && !isCustom && (
              <div className="mt-1.5 text-[10px] font-mono flex gap-3" style={{ color: 'var(--text-3)' }}>
                <span>{selectedCity.elevation} m ამ</span>
                <span>{selectedCity.pressure.toFixed(2)} kPa</span>
              </div>
            )}
          </div>

          {/* ASHRAE design conditions info */}
          {selectedCity && !isCustom && (
            <div className="rounded-lg p-3 border" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
                ASHRAE HOF 2021 — {selectedCity.nameEn}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <DataRow label="ზაფხ. 0.4% DB · Summer DB" value={`${selectedCity.summerDB}°C`} />
                <DataRow label="ზაფხ. MCWB · Summer MCWB" value={`${selectedCity.summerMCWB}°C`} />
                <DataRow label="ზამთ. 99% DB · Winter DB" value={`${selectedCity.winterDB99}°C`} />
                <DataRow label="ზამთ. 99.6% DB · Winter DB" value={`${selectedCity.winterDB996}°C`} />
                <DataRow label="სიმაღლე · Elevation" value={`${selectedCity.elevation} m`} />
                <DataRow label="ატ. წნევა · Pressure" value={`${design.pressure.toFixed(2)} kPa`} />
              </div>
            </div>
          )}
          {selectedCity && isCustom && (
            <div className="rounded-lg p-3 border" style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}>
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--blue)' }}>
                Climate Data — ხელით · {selectedCity.name || '—'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CustomNum label="სიმაღლე · Elev." unit="m" value={selectedCity.elevation} step={10} onChange={(v) => updateCustomCity({ elevation: v })} />
                <CustomNum label="ზაფხ. DB · Sum DB" unit="°C" value={selectedCity.summerDB} step={0.1} onChange={(v) => updateCustomCity({ summerDB: v })} />
                <CustomNum label="ზაფხ. MCWB · Sum MCWB" unit="°C" value={selectedCity.summerMCWB} step={0.1} onChange={(v) => updateCustomCity({ summerMCWB: v })} />
                <CustomNum label="ზამთ. 99% · Win 99%" unit="°C" value={selectedCity.winterDB99} step={0.1} onChange={(v) => updateCustomCity({ winterDB99: v })} />
                <CustomNum label="ზამთ. 99.6% · Win 99.6%" unit="°C" value={selectedCity.winterDB996} step={0.1} onChange={(v) => updateCustomCity({ winterDB996: v })} />
                <CustomNum
                  label="ატ. წნევა · Pressure"
                  unit="kPa"
                  value={Number(design.pressure.toFixed(2))}
                  step={0.01}
                  onChange={(v) => onUpdate({ design: { ...design, pressure: v } })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Design conditions — Summer + Winter, each with own outdoor + indoor */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Summer (cooling) — outdoor must be hotter than indoor */}
          <SeasonGroup title="ზაფხული · გაგრილება" icon="❄" accent="var(--blue)">
            <NumInput
              label="გარე DB"
              unit="°C"
              value={design.summerOutdoorDB}
              onChange={(v) => onUpdate({ design: { ...design, summerOutdoorDB: v } })}
              error={design.summerOutdoorDB <= design.summerIndoorDB
                ? 'გარე DB უნდა > შიდა-ზე (გაგრილება)'
                : undefined}
            />
            <NumInput
              label="გარე WB"
              unit="°C"
              value={design.summerOutdoorWB}
              onChange={(v) => onUpdate({ design: { ...design, summerOutdoorWB: v } })}
              error={design.summerOutdoorWB > design.summerOutdoorDB
                ? 'WB ≤ DB უნდა იყოს'
                : undefined}
            />
            <NumInput
              label="შიდა DB"
              unit="°C"
              value={design.summerIndoorDB}
              onChange={(v) => onUpdate({ design: { ...design, summerIndoorDB: v } })}
            />
            <NumInput
              label="შიდა RH"
              unit="%"
              value={design.summerIndoorRH}
              min={0} max={100}
              onChange={(v) => onUpdate({ design: { ...design, summerIndoorRH: v } })}
            />
          </SeasonGroup>

          {/* Winter (heating) — outdoor must be colder than indoor */}
          <SeasonGroup title="ზამთარი · გათბობა" icon="🔥" accent="var(--ora)">
            <NumInput
              label="გარე DB"
              unit="°C"
              value={design.winterOutdoorDB}
              onChange={(v) => onUpdate({ design: { ...design, winterOutdoorDB: v } })}
              error={design.winterOutdoorDB >= design.winterIndoorDB
                ? 'გარე DB უნდა < შიდა-ზე (გათბობა)'
                : undefined}
            />
            <NumInput
              label="გარე RH"
              unit="%"
              value={design.winterOutdoorRH}
              min={0} max={100}
              onChange={(v) => onUpdate({ design: { ...design, winterOutdoorRH: v } })}
            />
            <NumInput
              label="შიდა DB"
              unit="°C"
              value={design.winterIndoorDB}
              onChange={(v) => onUpdate({ design: { ...design, winterIndoorDB: v } })}
            />
            <NumInput
              label="შიდა RH"
              unit="%"
              value={design.winterIndoorRH}
              min={0} max={100}
              onChange={(v) => onUpdate({ design: { ...design, winterIndoorRH: v } })}
            />
          </SeasonGroup>
        </div>
      </Card>

      {/* ── Airflow ── */}
      <Card
        icon={<Wind size={14} />}
        title={balanced ? 'ჰაერის ნაკადი — მიწოდება + გაწოვა' : 'ჰაერის ნაკადი — მხოლოდ მიწოდება'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supply airflow */}
          <div>
            {/* Flow inputs row — supply (+ exhaust if balanced) */}
            <div className={balanced ? 'grid grid-cols-2 gap-3' : ''}>
              <NumInput
                label={balanced ? 'მიწოდება (SA)' : 'მიწოდების Q'}
                unit="m³/h"
                value={airflow.supplyAirflow}
                step={100}
                onChange={(v) => onUpdate({ airflow: { ...airflow, supplyAirflow: v } })}
              />
              {balanced && (
                <NumInput
                  label="გაწოვა (EA)"
                  unit="m³/h"
                  value={exhaustAirflow}
                  step={100}
                  onChange={(v) => onUpdate({ airflow: { ...airflow, exhaustAirflow: v } })}
                />
              )}
            </div>

            {/* Duct static pressure row */}
            <div className={`mt-2 ${balanced ? 'grid grid-cols-2 gap-3' : ''}`}>
              <NumInput
                label={balanced ? 'SA სტ. წნევა' : 'სისტ. სტ. წნევა'}
                unit="Pa"
                value={supplyPa}
                step={10}
                min={0}
                onChange={(v) => onUpdate({ fanInputs: { ...fanInputs, externalStaticPressure: v } })}
              />
              {balanced && (
                <NumInput
                  label="EA სტ. წნევა"
                  unit="Pa"
                  value={exhaustPa}
                  step={10}
                  min={0}
                  onChange={(v) => onUpdate({ fanInputs: { ...fanInputs, exhaustExternalStaticPressure: v } })}
                />
              )}
            </div>

            {balanced && (
              <div className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--text-3)' }}>
                რეკ.: EA ≈ SA (ბალანსი) ან EA = 0.9 × SA (მცირე დადებითი წნევა შენობაში)
              </div>
            )}

            {/* OA method toggle — own row */}
            <div className="mt-3">
              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
                გარე ჰაერი (OA)
                <InfoTip text="OA = Outdoor Air (გარე / სუფთა ჰაერი). გარედან შემოსული ახალი ჰაერი, რომელიც ერევა ოთახიდან დაბრუნებულ (RA) ჰაერს. ჯამი ქმნის მიწოდების ჰაერს (SA). მაღალი OA → უკეთესი ჰაერის ხარისხი მაგრამ მეტი ენერგია; დაბალი OA → ენერგო-ეფექტური მაგრამ ცუდი ჰაერი (CO₂, სუნი)." />
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
                    title={m === 'fraction'
                      ? 'პროცენტული წილი — შენ თვითონ აყენებ რამდენი % იყოს გარე ჰაერი'
                      : 'ASHRAE 62.1 — სტანდარტი ანგარიშობს მინიმუმ ვენტილაციას ადამიანების და ფართობის მიხედვით'}
                  >
                    {m === 'fraction' ? '% (%OA)' : 'ASHRAE 62.1'}
                  </button>
                ))}
              </div>
            </div>

            {airflow.ventilationMethod === 'fraction' ? (
              <div className="mt-3">
                <NumInput
                  label="OA წილი (გარე ჰაერის %)"
                  unit="%"
                  value={airflow.oaFraction * 100}
                  min={0} max={100}
                  onChange={(v) => onUpdate({ airflow: { ...airflow, oaFraction: v / 100 } })}
                />
                <div className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--text-3)' }}>
                  რეკომენდ.: ოფისი 15–30% · რესტორანი 30–50% · საავადმყოფო 100% (მთლიანად გარე ჰაერი)
                </div>
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
            {(() => {
              const barMax = Math.max(airflow.supplyAirflow, balanced ? exhaustAirflow : 0) || 1;
              return (
                <>
                  <BarStat
                    label="მიწოდება (SA)"
                    value={airflow.supplyAirflow}
                    unit="m³/h"
                    max={barMax}
                    color="var(--blue)"
                  />
                  {balanced && (
                    <BarStat
                      label="გაწოვა (EA)"
                      value={exhaustAirflow}
                      unit="m³/h"
                      max={barMax}
                      color="var(--ora)"
                    />
                  )}
                  <BarStat
                    label={`გარე ჰაერი (OA) — ${oaFractionDisplay.toFixed(0)}%`}
                    value={oaM3h}
                    unit="m³/h"
                    max={barMax}
                    color="var(--grn)"
                  />
                  <BarStat
                    label="სარეციკლო (RA)"
                    value={airflow.supplyAirflow - oaM3h}
                    unit="m³/h"
                    max={barMax}
                    color="var(--text-3)"
                  />
                </>
              );
            })()}
            {balanced && Math.abs(airflow.supplyAirflow - exhaustAirflow) > 0.01 && (
              <div className="mt-2 text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                ΔQ (SA−EA) = {(airflow.supplyAirflow - exhaustAirflow).toFixed(0)} m³/h
                {airflow.supplyAirflow > exhaustAirflow ? ' (დადებითი წნევა)' : ' (უარყოფითი წნევა)'}
              </div>
            )}
            {airflow.ventilationMethod === 'ashrae621' && (
              <div className="mt-2 text-[10px] font-mono" style={{ color: 'var(--blue)' }}>
                ASHRAE 62.1 min OA: {minOA.toFixed(0)} m³/h
              </div>
            )}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--bdr)' }}>
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
                სახარჯო სისტემის წნევა
              </div>
              <div className={balanced ? 'grid grid-cols-2 gap-2' : ''}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {balanced ? 'SA (მიწ.)' : 'SA'}
                  </span>
                  <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--navy)' }}>
                    {supplyPa} Pa
                  </span>
                </div>
                {balanced && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>EA (გაწ.)</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--ora)' }}>
                      {exhaustPa} Pa
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── KAYA model picker ── */}
        <KayaModelPicker
          flow={airflow.supplyAirflow}
          selected={state.kayaModelId}
          onChange={(id) => onUpdate({ kayaModelId: id })}
        />
      </Card>

      {/* ── System Design Intent ── */}
      <SystemDesignCard
        intent={state.systemDesign ?? DEFAULT_SYSTEM_DESIGN}
        onUpdate={(sd) => onUpdate({ systemDesign: sd })}
      />

      {/* Live psychro preview — output of design inputs above */}
      {psychro && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}>
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

function SeasonGroup({
  title, icon, accent, children,
}: {
  title: string;
  icon: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border-2 p-3"
      style={{ borderColor: accent, background: 'var(--sur)' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-sm">{icon}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: accent }}
        >
          {title}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center" style={{ color: 'var(--text-3)' }}>
      <Info size={11} className="cursor-help" />
      <span
        className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 px-2.5 py-1.5 rounded-md text-[10px] font-normal normal-case tracking-normal leading-snug whitespace-pre-line shadow-lg pointer-events-none"
        style={{
          background: 'var(--navy)',
          color: '#fff',
          width: 280,
          maxWidth: '70vw',
        }}
      >
        {text}
      </span>
    </span>
  );
}

function clamp(v: number, min?: number, max?: number): number {
  if (min !== undefined && v < min) return min;
  if (max !== undefined && v > max) return max;
  return v;
}

function roundToStep(v: number, step: number): number {
  // Avoid floating-point drift like 0.30000000000000004
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return Number(v.toFixed(decimals));
}

function NumInput({
  label, unit, value, onChange, min, max, step = 1, error,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}) {
  const borderColor = error ? 'var(--red)' : 'var(--bdr-2)';
  const dec = () => onChange(clamp(roundToStep(value - step, step), min, max));
  const inc = () => onChange(clamp(roundToStep(value + step, step), min, max));
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor }}>
        <button
          type="button"
          onClick={dec}
          disabled={atMin}
          className="px-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors disabled:opacity-30"
          style={{ background: 'var(--sur-2)', color: 'var(--text-2)', borderRight: '1px solid var(--bdr)', minWidth: 28 }}
          aria-label="შემცირება"
          tabIndex={-1}
        >
          −
        </button>
        <input
          type="number"
          className="flex-1 min-w-0 px-2 py-2 text-xs font-mono font-medium text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
          style={{ color: 'var(--text)', outline: 'none', background: 'var(--sur)' }}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || raw === '-') return;
            const n = parseFloat(raw);
            if (!Number.isNaN(n)) onChange(clamp(n, min, max));
          }}
        />
        <button
          type="button"
          onClick={inc}
          disabled={atMax}
          className="px-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors disabled:opacity-30"
          style={{ background: 'var(--sur-2)', color: 'var(--text-2)', borderLeft: '1px solid var(--bdr)', minWidth: 28 }}
          aria-label="გაზრდა"
          tabIndex={-1}
        >
          +
        </button>
        <span
          className="px-2 flex items-center text-[10px] font-bold shrink-0"
          style={{ background: 'var(--sur-2)', color: 'var(--text-3)', borderLeft: '1px solid var(--bdr)' }}
        >
          {unit}
        </span>
      </div>
      {error && (
        <div className="mt-1 text-[9px] font-medium leading-tight" style={{ color: 'var(--red)' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

function CustomNum({
  label, value, step = 0.1, onChange, unit,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] leading-tight" style={{ color: 'var(--text-3)' }}>
        {label}{unit ? <span className="opacity-60"> · {unit}</span> : null}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 rounded-md px-2 py-0.5 text-[11px] font-mono font-bold border text-right"
        style={{ background: 'var(--sur)', borderColor: 'var(--blue-bd)', color: 'var(--text)', outline: 'none' }}
      />
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

// ─── KAYA model picker ───────────────────────────────────────────────────────

function KayaModelPicker({
  flow, selected, onChange,
}: {
  flow: number;
  selected?: string;
  onChange: (id: string) => void;
}) {
  const suitable   = modelsForFlow(flow);
  const current    = selected ? getKayaModel(selected) : null;
  const overloaded = current && flow > current.maxFlowM3h;

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--bdr)' }}>
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
        KAYA კორპუსი — მოდელის შერჩევა
      </div>

      {/* Dropdown */}
      <select
        value={selected ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:ring-2"
        style={{
          background: 'var(--sur)',
          borderColor: 'var(--bdr-2)',
          color: 'var(--text)',
          '--tw-ring-color': 'var(--blue)',
        } as React.CSSProperties}
      >
        <option value="">— მოდელი არ არის შერჩეული —</option>
        {KAYA_MODELS.map((m) => {
          const ok = m.maxFlowM3h >= flow;
          return (
            <option key={m.id} value={m.id}>
              {ok ? '✓' : '⚠'} {m.displayName} — {m.maxFlowM3h.toLocaleString('en-US')} m³/h max
              · {m.filterCount}× 595mm · {(m.casingH * 1000).toFixed(0)}×{(m.casingW * 1000).toFixed(0)} mm
            </option>
          );
        })}
      </select>

      {/* Selected model details */}
      {current && (
        <div
          className="mt-2 rounded-lg border p-2.5"
          style={{
            background: overloaded ? '#fff7ed' : 'var(--blue-lt)',
            borderColor: overloaded ? '#fed7aa' : 'var(--blue-bd)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            {overloaded
              ? <AlertTriangle size={11} style={{ color: '#d97706' }} />
              : <CheckCircle2 size={11} style={{ color: 'var(--grn)' }} />
            }
            <span className="text-[10px] font-bold" style={{ color: overloaded ? '#92400e' : 'var(--navy)' }}>
              {current.displayName}
              {overloaded && ' — ✈ ხარჯი კორპუსის ლიმიტს აღემატება'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span style={{ color: 'var(--text-3)' }}>ზომები</span>
              <div className="font-mono font-bold" style={{ color: 'var(--text)' }}>
                {(current.casingH * 1000).toFixed(0)}×{(current.casingW * 1000).toFixed(0)} mm
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>ფილტრები</span>
              <div className="font-mono font-bold" style={{ color: 'var(--text)' }}>
                {current.filterCount}× 595mm ({current.filterCols}×{current.filterRows})
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>v_face</span>
              <div
                className="font-mono font-bold"
                style={{ color: overloaded ? '#c2410c' : 'var(--text)' }}
              >
                {faceVelocity(current, flow).toFixed(2)} m/s
                {!overloaded && ` / ${current.ratedFaceVel} max`}
              </div>
            </div>
          </div>
          {suitable.length > 0 && !suitable.find((m) => m.id === current.id) && (
            <div className="mt-1.5 text-[10px]" style={{ color: '#92400e' }}>
              → შესაფ.: {suitable.map((m) => m.displayName).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Suitable models quick-list when nothing selected */}
      {!current && flow > 0 && (
        <div className="mt-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
          {flow.toLocaleString('en-US')} m³/h-ისთვის შ/ფ:&nbsp;
          <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
            {suitable.length > 0
              ? suitable.map((m) => m.displayName).join(', ')
              : 'კატალოგი ვერ მოიცავს ამ ხარჯს'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── System Design Intent ─────────────────────────────────────────────────────

const DEFAULT_SYSTEM_DESIGN: SystemDesignIntent = {
  coolingSystem: 'chilled_water',
  heatingSystem: 'hot_water',
  chwSupplyT: 6, chwReturnT: 12,
  hwSupplyT: 80, hwReturnT: 60,
  electricKw: 0,
  filterStages: ['G4', 'F7'],
  humidifier: 'none',
};

const FILTER_STAGES: { key: FilterStageKey; label: string; iso: string; tier: 'coarse' | 'fine' | 'hepa' | 'uvc' }[] = [
  { key: 'G2', label: 'G2', iso: 'Coarse 35%', tier: 'coarse' },
  { key: 'G4', label: 'G4', iso: 'Coarse 60%', tier: 'coarse' },
  { key: 'F7', label: 'F7', iso: 'ePM1 55%',  tier: 'fine' },
  { key: 'F9', label: 'F9', iso: 'ePM1 80%',  tier: 'fine' },
  { key: 'H14', label: 'H14', iso: 'HEPA 99.995%', tier: 'hepa' },
  { key: 'UVC', label: 'UV-C', iso: 'გერმ.',   tier: 'uvc' },
];

const TIER_COLORS: Record<string, string> = {
  coarse: '#64748b',
  fine: 'var(--blue)',
  hepa: '#7c3aed',
  uvc: '#0891b2',
};

function SystemDesignCard({
  intent, onUpdate,
}: {
  intent: SystemDesignIntent;
  onUpdate: (sd: SystemDesignIntent) => void;
}) {
  const set = <K extends keyof SystemDesignIntent>(k: K, v: SystemDesignIntent[K]) =>
    onUpdate({ ...intent, [k]: v });

  const toggleStage = (key: FilterStageKey) => {
    const has = intent.filterStages.includes(key);
    const next = has
      ? intent.filterStages.filter((s) => s !== key)
      : [...intent.filterStages, key];
    set('filterStages', next);
  };

  const COOLING_OPTIONS: { v: CoolingSystemType; label: string }[] = [
    { v: 'chilled_water', label: 'Water Coil' },
    { v: 'dx', label: 'DX Coil' },
    { v: 'none', label: '∅' },
  ];
  const HEATING_OPTIONS: { v: HeatingSystemType; label: string }[] = [
    { v: 'hot_water', label: 'Water Coil' },
    { v: 'electric', label: 'Electric' },
    { v: 'steam', label: 'Steam' },
    { v: 'none', label: '∅' },
  ];
  const HUMIDIFIER_OPTIONS: { v: HumidifierType; label: string }[] = [
    { v: 'none', label: 'არ არის' },
    { v: 'steam', label: 'ორთქლი' },
    { v: 'evaporative', label: 'ორთქლ./აორთ.' },
    { v: 'ultrasonic', label: 'ულტ.' },
  ];

  return (
    <Card icon={<SlidersHorizontal size={14} />} title="სისტემის კონფიგურაცია">
      <div className="space-y-4">

        {/* Cooling + Heating system type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cooling */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text-3)' }}>
              გაგრილება
            </div>
            <SegPicker
              options={COOLING_OPTIONS}
              value={intent.coolingSystem}
              onChange={(v) => set('coolingSystem', v)}
              activeColor="var(--blue)"
            />
            {intent.coolingSystem === 'chilled_water' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumInput label="CHW მიწ." unit="°C" value={intent.chwSupplyT} step={1} min={1} max={20}
                  onChange={(v) => set('chwSupplyT', v)} />
                <NumInput label="CHW დაბ." unit="°C" value={intent.chwReturnT} step={1} min={1} max={25}
                  onChange={(v) => set('chwReturnT', v)} />
              </div>
            )}
          </div>

          {/* Heating */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text-3)' }}>
              გათბობა
            </div>
            <SegPicker
              options={HEATING_OPTIONS}
              value={intent.heatingSystem}
              onChange={(v) => set('heatingSystem', v)}
              activeColor="var(--ora)"
            />
            {intent.heatingSystem === 'hot_water' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumInput label="HW მიწ." unit="°C" value={intent.hwSupplyT} step={5} min={40} max={120}
                  onChange={(v) => set('hwSupplyT', v)} />
                <NumInput label="HW დაბ." unit="°C" value={intent.hwReturnT} step={5} min={30} max={100}
                  onChange={(v) => set('hwReturnT', v)} />
              </div>
            )}
            {intent.heatingSystem === 'electric' && (
              <div className="mt-2">
                <NumInput label="სიმძლავრე" unit="kW" value={intent.electricKw} step={0.5} min={0}
                  onChange={(v) => set('electricKw', v)} />
              </div>
            )}
          </div>
        </div>

        {/* Filter stages */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
            ფილტრაციის საფეხურები
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_STAGES.map(({ key, label, iso, tier }) => {
              const active = intent.filterStages.includes(key);
              const col = TIER_COLORS[tier];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStage(key)}
                  className="flex flex-col items-center rounded-lg px-3 py-1.5 border transition-all"
                  style={{
                    borderColor: active ? col : 'var(--bdr)',
                    background: active ? col + '18' : 'var(--sur-2)',
                    minWidth: 52,
                  }}
                >
                  <span className="text-[11px] font-bold font-mono" style={{ color: active ? col : 'var(--text-3)' }}>
                    {label}
                  </span>
                  <span className="text-[9px] leading-tight mt-0.5" style={{ color: active ? col : 'var(--text-3)', opacity: 0.8 }}>
                    {iso}
                  </span>
                </button>
              );
            })}
          </div>
          {intent.filterStages.length > 0 && (
            <div className="mt-1.5 text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              {intent.filterStages.join(' → ')}
            </div>
          )}
        </div>

        {/* Humidifier */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text-3)' }}>
            დატენიანება
          </div>
          <SegPicker
            options={HUMIDIFIER_OPTIONS}
            value={intent.humidifier}
            onChange={(v) => set('humidifier', v)}
            activeColor="var(--blue)"
          />
        </div>

      </div>
    </Card>
  );
}

function SegPicker<T extends string>({
  options, value, onChange, activeColor,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColor: string;
}) {
  return (
    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bdr-2)' }}>
      {options.map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className="flex-1 py-1.5 text-[10px] font-semibold transition-all truncate px-1"
          style={
            value === v
              ? { background: activeColor, color: '#fff' }
              : { background: 'var(--sur)', color: 'var(--text-3)' }
          }
        >
          {label}
        </button>
      ))}
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
