'use client';

import React, { useCallback } from 'react';
import { MapPin, Wind, Zap, Info } from 'lucide-react';
import type { AhuWizardState, PsychrometricResults, AhuProject, AhuUnit, CityClimate } from '@/lib/ahu-ashrae/types';
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
  const { selectedCity, design, airflow, loads } = state;
  const isCustom = selectedCity?.id === CUSTOM_CITY_ID;
  const balanced = isBalancedAhu(unit.ahuType);
  const exhaustAirflow = airflow.exhaustAirflow ?? airflow.supplyAirflow;

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

  const shr = loads.sensibleCooling + loads.latentCooling > 0
    ? loads.sensibleCooling / (loads.sensibleCooling + loads.latentCooling)
    : 1;
  const totalLoad = loads.sensibleCooling + loads.latentCooling;

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
