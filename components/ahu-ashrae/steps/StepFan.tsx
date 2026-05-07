'use client';

import React, { useState } from 'react';
import {
  Fan, Filter, PanelTopOpen, Snowflake, Flame,
  ArrowLeftRight, Droplet, Volume2, Shuffle,
  Zap, Gauge, Wrench, Thermometer, AlertTriangle, CheckCircle2,
  Search,
  type LucideIcon,
} from 'lucide-react';
import type { AhuWizardState, AflFanSelection } from '@/lib/ahu-ashrae/types';
import type { ChainResult, ChainStateLabel } from '@/lib/ahu-ashrae/chain';
import type { SectionConfig, SectionType } from '@/lib/ahu-ashrae/sections';
import { SECTION_VISUALS } from '@/lib/ahu-ashrae/section-visuals';
import { AflFanSelector } from './AflFanSelector';
import {
  getKayaModel, faceVelocity, euroventCheck, EUROVENT_MAX_VEL,
} from '@/lib/ahu-ashrae/kaya-models';

interface Props {
  state: AhuWizardState;
  chain?: ChainResult;
  onUpdate?: (patch: Partial<AhuWizardState>) => void;
}

// ─── Static lookup tables ─────────────────────────────────────────────────────

const ICON_MAP: Record<SectionType, LucideIcon> = {
  damper:        PanelTopOpen,
  filter:        Filter,
  mixing_box:    Shuffle,
  heat_recovery: ArrowLeftRight,
  preheat:       Flame,
  cooling_coil:  Snowflake,
  reheat:        Flame,
  humidifier:    Droplet,
  fan:           Fan,
  silencer:      Volume2,
};

const LABELS_KA: Record<SectionType, string> = {
  damper:        'ხამურდამხშობი (დემპერი)',
  filter:        'ფილტრი',
  mixing_box:    'შერევის ყუთი',
  heat_recovery: 'სითბოს რეკუპერატორი',
  preheat:       'წინა გათბობის კოჩა',
  cooling_coil:  'გაგრილების კოჩა',
  reheat:        'უკანა გათბობის კოჩა',
  humidifier:    'ატენიანებელი',
  fan:           'ვენტილატორი',
  silencer:      'ხმოდამხშობი',
};

interface AccessoryDef { icon: LucideIcon; label: string; note: string }

const ACCESSORIES: Record<SectionType, AccessoryDef[]> = {
  damper: [
    { icon: Zap,         label: 'ელ. აქტუატორი',        note: '24 V · 10 Nm · On/Off ან Modulating' },
    { icon: Thermometer, label: 'End-switch',            note: 'Open/Close feedback სიგნალი' },
  ],
  filter: [
    { icon: Gauge,       label: 'დიფ. წნევის სენსორი',   note: '0–500 Pa · dirty-alarm relay' },
    { icon: Wrench,      label: 'ჩარჩო / Cell Side',     note: 'Tool-less exchange slide frame' },
  ],
  mixing_box: [
    { icon: Zap,         label: 'OA დემპერი + AO აქტ.', note: '0–10 V modulating, spring-return' },
    { icon: Thermometer, label: 'Mixed-air ტემპ. სენს.', note: 'Average-type · Pt100 / NTC' },
  ],
  heat_recovery: [
    { icon: Zap,         label: 'Bypass დემპ. + აქტ.',   note: 'ზაფხულის bypass · 24 V · spring-return' },
    { icon: Thermometer, label: 'Supply + Exh. სენსები',  note: '2× Pt100 — inlet / outlet' },
    { icon: Gauge,       label: 'დიფ. წნ. სენსები (×2)',  note: 'Dirty / defrost ალარმი' },
  ],
  preheat: [
    { icon: Zap,         label: '2-გზ. / 3-გზ. სარქ. + AO', note: 'Kvs კოჩის მიხ., spring-return' },
    { icon: Thermometer, label: 'ყინვაგამძ. სენსორი',      note: 'Frost-coil Pt100 < 3 °C alert' },
    { icon: Gauge,       label: 'ΔP სენსორი',              note: 'Coil fouling monitor' },
  ],
  cooling_coil: [
    { icon: Zap,         label: '2-გზ. / 3-გზ. სარქ. + AO', note: 'CHW: Kvs კოჩის მიხ. · DX: expansion valve' },
    { icon: Gauge,       label: 'კონდენსატის სანიაღვრე',    note: 'Drain pan + U-trap · Pt100' },
    { icon: Thermometer, label: 'Supply-air ტემპ. სენს.',   note: 'Cooling-setpoint control' },
    { icon: Gauge,       label: 'ΔP სენსორი',              note: 'Coil fouling / blockage alert' },
  ],
  reheat: [
    { icon: Zap,         label: '2-გზ. / 3-გზ. სარქ. + AO', note: 'Kvs კოჩის მიხ., spring-return' },
    { icon: Thermometer, label: 'Supply-air ტემპ. სენს.',   note: 'Reheat setpoint control' },
  ],
  humidifier: [
    { icon: Thermometer, label: 'RH სენსორი (×2)',          note: 'Supply + Return · Capacitive' },
    { icon: Gauge,       label: 'წყლის მიწოდ. სარქ.',       note: 'Solenoid fill valve · water meter' },
    { icon: Wrench,      label: 'კალციუმ-ფარდი სათავე',     note: 'Scale filter + drain valve' },
  ],
  fan: [
    { icon: Zap,         label: 'VFD (სიხშირული გარდ.)',     note: 'EC-motor ან Belt-drive inverter' },
    { icon: Gauge,       label: 'ვიბრ. საიზ. სახსრები',     note: 'Flexible duct connections + anti-vib. mounts' },
    { icon: Thermometer, label: 'Bearing ტემპ. სენსი',      note: 'Overheat protection · NTC' },
    { icon: Gauge,       label: 'Static-pressure სენსი',     note: 'Duct pressure control for VAV' },
  ],
  silencer: [
    { icon: Wrench,      label: 'Mineral-wool ბაფლები',      note: 'სახელმძ. EN ISO 11546 — removable' },
  ],
};

const COIL_MEDIUM_KA: Record<string, string> = {
  chw:       'CHW · მაგრ. წყ.',
  dx:        'DX · ფრეონი',
  hot_water: 'HW · ცხ. წყ.',
  electric:  'ელ. ჰელიქ.',
  steam:     'ორთქლი',
};

const HR_TYPE_KA: Record<string, string> = {
  crossflow_plate:   'Cross-flow ფირფ.',
  counterflow_plate: 'Counter-flow ფირფ.',
  rotary_sensible:   'როტ. სენს. ბორბ.',
  run_around_coil:   'Run-around კოჩა',
};

const HUM_TYPE_KA: Record<string, string> = {
  steam:           'ორთქლი',
  adiabatic_spray: 'Adiabatic spray',
  evaporative_pad: 'Evaporative pad',
};

// ─── Exported component ───────────────────────────────────────────────────────

export function StepFan({ state, chain, onUpdate }: Props) {
  const [showSelector, setShowSelector] = useState(false);
  const enabled = state.sections?.filter((s) => s.enabled) ?? [];
  const totalDP = chain?.totalDeltaP ?? fallbackDP(state);
  const systemQ = state.airflow.supplyAirflow;
  const airflowM3s = systemQ / 3600;

  // Use AFL-selected fan efficiency if available, else state default
  const fanEff   = state.aflFan?.fanEff ?? state.fanInputs.fanEfficiency;
  const motorEff = state.fanInputs.motorEfficiency;
  const fanPower = (airflowM3s * totalDP) / (fanEff * motorEff * 1000);
  const sfp      = (fanPower * 1000) / airflowM3s;
  const sfpOk    = sfp <= 1700;

  const handleFanSelected = (fan: AflFanSelection) => {
    onUpdate?.({
      aflFan: fan,
      fanInputs: { ...state.fanInputs, fanEfficiency: fan.fanEff },
    });
    setShowSelector(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Fan performance summary ── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Fan size={15} style={{ color: 'var(--blue)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>ვენტილატორის სანამდვილო მაჩვ.</h2>
          {sfpOk
            ? <CheckCircle2 size={14} style={{ color: 'var(--grn)', marginLeft: 'auto' }} />
            : <AlertTriangle size={14} style={{ color: 'var(--ora)', marginLeft: 'auto' }} />
          }
        </div>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-3)' }}>
          SFP ≤ 1 700 W/(m³/s) — ASHRAE 90.1 / EN 13779 ლიმიტი CV სისტ.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="ხარჯი" value={`${systemQ.toLocaleString('en-US')} m³/h`} />
          <Stat label="ΔP სისტემა" value={`${totalDP.toFixed(0)} Pa`} />
          <Stat label="სიმძლავრე" value={`${fanPower.toFixed(2)} kW`} />
          <Stat label="SFP" value={`${sfp.toFixed(0)} W/(m³/s)`} highlight ok={sfpOk} />
        </div>

        {/* AFL fan badge or picker button */}
        <div className="mt-3 flex items-center gap-3">
          {state.aflFan ? (
            <div
              className="flex-1 flex items-center justify-between rounded-lg border px-3 py-2"
              style={{ background: 'var(--blue-lt)', borderColor: 'var(--blue-bd)' }}
            >
              <div>
                <div className="text-[10px] font-bold" style={{ color: 'var(--blue)' }}>AFL · შერჩ. მოდელი</div>
                <div className="text-xs font-bold font-mono" style={{ color: 'var(--navy)' }}>
                  {state.aflFan.model}
                </div>
                <div className="text-[10px] flex gap-3 mt-0.5" style={{ color: 'var(--text-3)' }}>
                  <span>⌀ {state.aflFan.diameterMm} mm</span>
                  <span>η = {(state.aflFan.fanEff * 100).toFixed(1)} %</span>
                  <span>P = {state.aflFan.powerAtDesignW.toFixed(0)} W</span>
                </div>
              </div>
              <button
                onClick={() => setShowSelector(true)}
                className="text-[10px] font-bold px-2 py-1 rounded hover:bg-[var(--blue-bd)] transition-colors"
                style={{ color: 'var(--blue)' }}
              >
                შეცვლა
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSelector(true)}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--blue-lt)]"
              style={{ borderColor: 'var(--blue-bd)', color: 'var(--blue)', background: 'transparent' }}
            >
              <Search size={13} />
              AFL კატალოგი — ვენტ. შერჩევა
            </button>
          )}
        </div>

        {!sfpOk && (
          <div
            className="mt-3 rounded-lg border px-3 py-2 text-[11px] flex items-start gap-2"
            style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412' }}
          >
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>SFP ლიმიტს აღემატება — შეამცირე ΔP ან გაზარდე ვენტ. ეფ-ობა.</span>
          </div>
        )}
      </div>

      {/* ── AFL Fan Selector ── */}
      {showSelector && (
        <AflFanSelector
          systemQ={systemQ}
          systemDp={totalDP}
          current={state.aflFan}
          onSelect={handleFanSelected}
          onClose={() => setShowSelector(false)}
        />
      )}


      {/* ── Eurovent compliance certificate ── */}
      {state.kayaModelId && (
        <EuroventCard
          kayaModelId={state.kayaModelId}
          flowM3h={systemQ}
          sections={state.sections ?? []}
        />
      )}

      {/* ── Component cards ── */}
      {enabled.length > 0 ? (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2 px-1" style={{ color: 'var(--text-3)' }}>
            გამოყენებული კომპ. ({enabled.length}) — სტ. მაკომ. ჩათვლით
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enabled.map((section, i) => {
              const inlet  = chain?.states[i];
              const outlet = chain?.states[i + 1];
              return (
                <ComponentCard
                  key={section.id}
                  section={section}
                  index={i}
                  inlet={inlet}
                  outlet={outlet}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border-2 border-dashed p-10 text-center text-sm"
          style={{ borderColor: 'var(--bdr-2)', color: 'var(--text-3)' }}
        >
          სექციები ჯერ არ არის — დაბრუნდი Step 3-ში და შეარჩიე კომპ.
        </div>
      )}

    </div>
  );
}

// ─── Single component card ─────────────────────────────────────────────────────

function ComponentCard({
  section, index, inlet, outlet,
}: {
  section: SectionConfig;
  index: number;
  inlet?: ChainStateLabel;
  outlet?: ChainStateLabel;
}) {
  const Icon = ICON_MAP[section.spec.type];
  const visual = SECTION_VISUALS[section.spec.type];
  const accessories = ACCESSORIES[section.spec.type];
  const spec = section.spec;

  const deltaP  = outlet?.deltaP;
  const Q       = outlet?.energy;
  const deltaT  = (inlet && outlet)
    ? outlet.state.tdb - inlet.state.tdb
    : undefined;

  // Type-specific badge
  let badge: string | null = null;
  let badgeColor = 'var(--blue-lt)';
  let badgeTextColor = 'var(--blue)';

  if (spec.type === 'cooling_coil') {
    badge = COIL_MEDIUM_KA[spec.params.source] ?? spec.params.source;
    badgeColor = '#e0f2fe'; badgeTextColor = '#0369a1';
  } else if (spec.type === 'preheat' || spec.type === 'reheat') {
    badge = COIL_MEDIUM_KA[spec.params.source] ?? spec.params.source;
    badgeColor = '#fff7ed'; badgeTextColor = '#c2410c';
  } else if (spec.type === 'heat_recovery') {
    badge = HR_TYPE_KA[spec.params.hrType] ?? spec.params.hrType;
    badgeColor = '#ede9fe'; badgeTextColor = '#6d28d9';
  } else if (spec.type === 'humidifier') {
    badge = HUM_TYPE_KA[spec.params.humType] ?? spec.params.humType;
    badgeColor = '#ecfeff'; badgeTextColor = '#0e7490';
  } else if (spec.type === 'filter') {
    badge = `${spec.params.filterClass} · ${spec.params.form ?? '—'}`;
    badgeColor = 'var(--sur-2)'; badgeTextColor = 'var(--text-2)';
  } else if (spec.type === 'fan') {
    badge = spec.params.position === 'supply' ? 'Supply fan' : 'Return fan';
  }

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2"
      >
        <span
          className="h-8 w-8 flex items-center justify-center rounded-lg shrink-0"
          style={{ background: visual.color }}
        >
          <Icon size={15} color="#fff" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold truncate" style={{ color: 'var(--text)' }}>
            {section.label}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            #{index + 1} · {LABELS_KA[section.spec.type]}
          </div>
        </div>
        {badge && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: badgeColor, color: badgeTextColor }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Key specs strip */}
      {(deltaP !== undefined || Q !== undefined || deltaT !== undefined) && (
        <div
          className="flex gap-0 border-t border-b"
          style={{ borderColor: 'var(--bdr)' }}
        >
          {deltaP !== undefined && (
            <MiniSpec label="ΔP" value={`${deltaP.toFixed(0)} Pa`} />
          )}
          {Q !== undefined && Math.abs(Q) > 0.01 && (
            <MiniSpec
              label="Q"
              value={`${Q > 0 ? '+' : ''}${Q.toFixed(1)} kW`}
              color={Q > 0 ? '#c2410c' : '#0369a1'}
            />
          )}
          {deltaT !== undefined && Math.abs(deltaT) > 0.05 && (
            <MiniSpec
              label="ΔT"
              value={`${deltaT > 0 ? '+' : ''}${deltaT.toFixed(1)} °C`}
              color={deltaT > 0 ? '#c2410c' : '#0369a1'}
            />
          )}
          {outlet?.state.rh !== undefined && (
            <MiniSpec label="RH out" value={`${(outlet.state.rh * 100).toFixed(0)} %`} />
          )}
        </div>
      )}

      {/* Standard accessories */}
      {accessories.length > 0 && (
        <div className="px-3.5 py-2.5 flex-1">
          <div
            className="text-[9px] font-bold uppercase tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--text-3)' }}
          >
            სტ. მაკომ.
          </div>
          <ul className="space-y-1">
            {accessories.map((a, ai) => {
              const AIcon = a.icon;
              return (
                <li key={ai} className="flex items-start gap-1.5">
                  <AIcon size={10} style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }} />
                  <div className="text-[10px] leading-snug">
                    <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{a.label}</span>
                    {a.note && (
                      <span style={{ color: 'var(--text-3)' }}> — {a.note}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Small primitives ──────────────────────────────────────────────────────────

function Stat({
  label, value, highlight, ok,
}: {
  label: string; value: string; highlight?: boolean; ok?: boolean;
}) {
  const bg = highlight
    ? (ok === false ? '#fff7ed' : (ok === true ? '#f0fdf4' : 'var(--blue-lt)'))
    : 'var(--sur-2)';
  const textColor = highlight
    ? (ok === false ? '#9a3412' : (ok === true ? '#166534' : 'var(--navy)'))
    : 'var(--text)';
  const labelColor = highlight
    ? (ok === false ? '#c2410c' : (ok === true ? '#15803d' : 'var(--blue)'))
    : 'var(--text-3)';
  return (
    <div className="rounded-lg border p-3" style={{ background: bg, borderColor: highlight ? 'transparent' : 'var(--bdr)' }}>
      <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="text-sm font-bold font-mono mt-0.5" style={{ color: textColor }}>
        {value}
      </div>
    </div>
  );
}

function MiniSpec({
  label, value, color,
}: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="flex-1 px-2.5 py-1.5 text-center min-w-0">
      <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-[11px] font-bold font-mono" style={{ color: color ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Eurovent 6/3 compliance certificate ─────────────────────────────────────

function EuroventCard({
  kayaModelId, flowM3h, sections,
}: {
  kayaModelId: string;
  flowM3h: number;
  sections: SectionConfig[];
}) {
  const model = getKayaModel(kayaModelId);
  if (!model) return null;

  // Collect all filter classes from enabled sections
  const filterClasses = sections
    .filter((s) => s.enabled && s.spec.type === 'filter')
    .map((s) => (s.spec.params as { filterClass: string }).filterClass);
  // Use most restrictive (lowest vel limit)
  const worstClass = filterClasses.reduce<string | null>((worst, cls) => {
    if (!worst) return cls;
    return (EUROVENT_MAX_VEL[cls] ?? 2.5) < (EUROVENT_MAX_VEL[worst] ?? 2.5) ? cls : worst;
  }, null) ?? 'G4';

  const chk = euroventCheck(model, flowM3h, worstClass);
  const velPct = chk.utilisationPct;
  const filterAreaM2 = model.filterFaceW * model.filterFaceH;

  const rows: Array<{ label: string; value: string; pass?: boolean; note?: string }> = [
    { label: 'KAYA კორპუსი',      value: `${model.displayName} (${model.fullName.slice(0, 40)}…)` },
    { label: 'კორპ. განაკვეთი',   value: `${(model.casingH * 1000).toFixed(0)} × ${(model.casingW * 1000).toFixed(0)} mm (H × W)` },
    { label: 'ფილტრ. ბანკი',      value: `${model.filterCount} × 595 mm (${model.filterCols} სვ. × ${model.filterRows} რ.)` },
    { label: 'ფილტრ. სახის ფარ.', value: `${filterAreaM2.toFixed(3)} m²` },
    { label: 'საპ. ხარჯი',        value: `${flowM3h.toLocaleString('en-US')} m³/h` },
    { label: 'ფილტ. კლასი',       value: filterClasses.length > 0 ? filterClasses.join(' + ') : 'G4 (default)', note: 'ყველაზე შემზღ. კლასი' },
    {
      label: 'სახ. სიჩქ.',
      value: `${chk.vel.toFixed(3)} m/s`,
      pass: chk.pass,
      note: `ლიმ. ${chk.limit} m/s (Eurovent 6/3 · EN 13053)`,
    },
    {
      label: 'გამოყ. %',
      value: `${velPct.toFixed(1)} %`,
      pass: velPct <= 100,
      note: `${velPct <= 85 ? '✓ კომფ.' : velPct <= 100 ? '~ ზღვ.' : '⚠ ლიმ. გადაჭ.'}`,
    },
    {
      label: 'Eurovent 6/3',
      value: chk.pass ? '✓ PASS' : '✗ FAIL',
      pass: chk.pass,
      note: chk.pass ? 'ჰაერის სიჩქ. სტ. ფარ.' : 'სიჩქ. ლიმ. ჩასახ.!',
    },
  ];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--sur)', borderColor: chk.pass ? '#86efac' : '#fca5a5' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: chk.pass ? '#f0fdf4' : '#fff1f2',
          borderColor: chk.pass ? '#86efac' : '#fca5a5',
        }}
      >
        <div className="flex items-center gap-2">
          {chk.pass
            ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
            : <AlertTriangle size={14} style={{ color: '#dc2626' }} />
          }
          <span className="text-xs font-bold" style={{ color: chk.pass ? '#166534' : '#991b1b' }}>
            Eurovent 6/3 შესაბამისობა — {model.displayName}
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: chk.pass ? '#16a34a' : '#dc2626',
            color: '#fff',
          }}
        >
          {chk.pass ? 'PASS' : 'FAIL'}
        </span>
      </div>

      {/* Progress bar — face velocity utilisation */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: 'var(--text-3)' }}>
          <span>სახ. სიჩქ. გამოყ.</span>
          <span>{chk.vel.toFixed(3)} / {chk.limit} m/s</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bdr)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, velPct)}%`,
              background: velPct <= 75 ? '#16a34a' : velPct <= 95 ? '#d97706' : '#dc2626',
            }}
          />
        </div>
        <div className="text-[9px] mt-0.5 text-right" style={{ color: 'var(--text-3)' }}>
          {velPct.toFixed(1)} %
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: 'var(--bdr)', background: i % 2 === 0 ? 'transparent' : 'var(--sur-2)' }}
              >
                <td className="px-4 py-1.5 font-semibold w-36 shrink-0" style={{ color: 'var(--text-3)' }}>
                  {r.label}
                </td>
                <td
                  className="px-3 py-1.5 font-mono font-bold"
                  style={{ color: r.pass === true ? '#166534' : r.pass === false ? '#991b1b' : 'var(--text)' }}
                >
                  {r.value}
                </td>
                {r.note && (
                  <td className="px-3 py-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {r.note}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[9px]" style={{ color: 'var(--text-3)' }}>
        სტ. ref: Eurovent 6/3 (2018) · EN 13053:2019 · EN ISO 16890 · ISO 29460
      </div>
    </div>
  );
}

function fallbackDP(state: AhuWizardState): number {
  const f = state.fanInputs;
  return f.externalStaticPressure + f.filterDeltaP
    + f.coolingCoilDeltaP + f.heatingCoilDeltaP
    + f.hrDeltaP + f.ductDeltaP;
}
