'use client';

// Fan datasheet — interactive curves + computed operating point.
// Visual model after AFL (cloudair.tech) datasheet page.

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, Scatter,
} from 'recharts';

import type { FanModel } from '@/lib/ahu-ashrae/fans/types';
import {
  RHO_STD,
  airDensity,
  computeOperatingPoint,
  findMaxEfficiencyPoint,
  pickOptimalStep,
  sampleCurve,
  sampleEfficiency,
} from '@/lib/ahu-ashrae/fans/curves';

interface Props {
  model: FanModel;
  initialVolume?: number;
  initialPressure?: number;
  initialTemperature?: number;
}

type PressureMode = 'static' | 'total';
type Tab = 'information' | 'nominal' | 'dimensions' | 'electrical';

const TABS: { id: Tab; label: string }[] = [
  { id: 'information', label: 'information' },
  { id: 'nominal',     label: 'Nominal parameters' },
  { id: 'dimensions',  label: 'Dimensions' },
  { id: 'electrical',  label: 'Electrical connection diagram' },
];

const fmt = (v: number, p = 0) => {
  if (!isFinite(v)) return '—';
  return v.toFixed(p);
};

export function FanDatasheet({
  model,
  initialVolume = 525,
  initialPressure = 528,
  initialTemperature = 20,
}: Props) {
  const [volume, setVolume]           = useState(initialVolume);
  const [pressure, setPressure]       = useState(initialPressure);
  const [temperature, setTemperature] = useState(initialTemperature);
  const [pMode, setPMode]             = useState<PressureMode>('static');
  const [tab, setTab]                 = useState<Tab>('information');

  const density = useMemo(() => airDensity(temperature), [temperature]);

  const chosen = useMemo(
    () => pickOptimalStep(model, volume, pressure, density),
    [model, volume, pressure, density],
  );

  const op = useMemo(
    () =>
      computeOperatingPoint({
        model,
        curve: chosen,
        volume,
        density,
        isTotalPressure: pMode === 'total',
      }),
    [model, chosen, volume, density, pMode],
  );

  const etaMax = useMemo(
    () => findMaxEfficiencyPoint({ model, curve: chosen, density }),
    [model, chosen, density],
  );

  // Per-curve sampled lines
  const pressureLines = useMemo(
    () =>
      model.curves.map((c) => ({
        label: c.label,
        main: c.main,
        data: sampleCurve({ curve: c, density, field: 'pressureStatic' }),
      })),
    [model, density],
  );
  const powerLines = useMemo(
    () =>
      model.curves.map((c) => ({
        label: c.label, main: c.main,
        data: sampleCurve({ curve: c, density, field: 'power' }),
      })),
    [model, density],
  );
  const speedLines = useMemo(
    () =>
      model.curves.map((c) => ({
        label: c.label, main: c.main,
        data: sampleCurve({ curve: c, density, field: 'speed' }),
      })),
    [model, density],
  );
  const effLines = useMemo(
    () =>
      model.curves.map((c) => ({
        label: c.label, main: c.main,
        data: sampleEfficiency({ model, curve: c, density }),
      })),
    [model, density],
  );

  const Vmax = Math.max(...model.curves.map((c) => c.graphMax));
  const Pmax = Math.max(
    ...pressureLines.flatMap((l) => l.data.map((p) => p.value)),
  ) * 1.05;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.imageUrl}
            alt={model.code}
            className="w-10 h-10 object-contain"
            style={{ background: 'var(--sur-2)', borderRadius: 6, padding: 2 }}
          />
          <div className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {model.code}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="text-[11px] px-3 py-1.5 rounded-md border transition-colors"
                style={{
                  background: active ? 'var(--blue)' : 'var(--sur)',
                  color: active ? '#fff' : 'var(--text-3)',
                  borderColor: active ? 'var(--blue)' : 'var(--bdr-2)',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'nominal' && <NominalParametersTab model={model} />}
      {tab === 'dimensions' && <DimensionsTab model={model} />}
      {tab === 'electrical' && <ElectricalTab model={model} />}

      {tab === 'information' && (
      /* Body: 3 columns — left info, center main chart, right 3 mini-charts */
      <div className="grid grid-cols-12 gap-5 p-5">
        {/* ─── LEFT: operating point inputs + calculated values ───── */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          {/* Set operating point */}
          <Section title="Set operating point" icon="○">
            <Row label="Air flow / Pressure">
              <NumInput value={volume} onChange={setVolume} unit="m³/h" symbol="Q" min={1} max={Vmax} />
              <PressureInput
                value={pressure}
                onChange={setPressure}
                mode={pMode}
                onModeChange={setPMode}
              />
            </Row>
            <Row label="Medium temperature / Density">
              <NumInput value={temperature} onChange={setTemperature} unit="°C" symbol="t_MED" min={-30} max={60} />
              <ReadOnly value={fmt(density, 3)} unit="kg/m³" symbol="ρ" />
            </Row>
          </Section>

          {/* Calculated point */}
          <Section title="Calculated / Highest efficiency point" dotColors>
            <DataRow label="Flow"               sym="Q"        a={fmt(op.volume, 0)}            b={etaMax ? fmt(etaMax.volume, 0) : '—'}     unit="m³/h" />
            <DataRow label="Static pressure"    sym="ΔPst"     a={fmt(op.pressureStatic, 0)}    b={etaMax ? fmt(etaMax.pressureStatic, 0) : '—'} unit="Pa" />
            <DataRow label="Total pressure"     sym="ΔPtot"    a={fmt(op.pressureTotal, 0)}     b={etaMax ? fmt(etaMax.pressureTotal, 0) : '—'}  unit="Pa" />
            <DataRow label="Dynamic pressure"   sym="ΔPdyn"    a={fmt(op.pressureDynamic, 0)}   b={etaMax ? fmt(etaMax.pressureDynamic, 0) : '—'} unit="Pa" />
            <DataRow label="Speed"              sym="v"        a={fmt(op.velocity, 2)}          b={etaMax ? fmt(etaMax.velocity, 2) : '—'}      unit="m/s" />
            <DataRow label="Rotational speed"   sym="n"        a={fmt(op.speed, 0)}             b={etaMax ? fmt(etaMax.speed, 0) : '—'}         unit="rpm" />
            <DataRow label="Power"              sym="P_abs"    a={fmt(op.power, 0)}             b={etaMax ? fmt(etaMax.power, 0) : '—'}         unit="W" />
            <DataRow label="Current"            sym="I"        a={fmt(op.current, 2)}           b={etaMax ? fmt(etaMax.current, 2) : '—'}       unit="A" />
            <DataRow label="SFP"                sym="SFP"      a={fmt(op.sfp, 0)}               b={etaMax ? fmt(etaMax.sfp, 0) : '—'}           unit="W/(m³/s)" />
            <DataRow label="Static efficiency"  sym="η_st"     a={fmt(op.efficiencyStatic, 1)}  b={etaMax ? fmt(etaMax.efficiencyStatic, 1) : '—'} unit="%" />
            <DataRow label="Total efficiency"   sym="η_tot"    a={fmt(op.efficiencyTotal, 1)}   b={etaMax ? fmt(etaMax.efficiencyTotal, 1) : '—'}  unit="%" />
          </Section>
        </div>

        {/* ─── CENTER: pressure curve ───── */}
        <div className="col-span-12 lg:col-span-6">
          <ChartTitle>Pressure <span style={{ color: 'var(--text-3)' }}>Pa</span></ChartTitle>
          <div style={{ width: '100%', height: 460 }}>
            <ResponsiveContainer>
              <ComposedChart margin={{ top: 12, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="volume"
                  type="number"
                  domain={[0, Vmax]}
                  tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                  label={{ value: 'm³/h', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--text-3)' }}
                />
                <YAxis
                  dataKey="value"
                  type="number"
                  domain={[0, Math.ceil(Pmax / 50) * 50]}
                  tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                  width={45}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--sur)', border: '1px solid var(--bdr-2)', fontSize: 11 }}
                  formatter={(v) => [`${Number(v).toFixed(0)} Pa`, '']}
                  labelFormatter={(l) => `${Number(l).toFixed(0)} m³/h`}
                />
                {pressureLines.map((l) => (
                  <Scatter
                    key={l.label}
                    data={l.data}
                    line={{ stroke: l.main ? 'var(--text)' : 'var(--bdr-2)', strokeWidth: l.main ? 1.8 : 0.8 }}
                    shape={() => <g />}
                    legendType="none"
                    isAnimationActive={false}
                  />
                ))}
                {/* Working point */}
                <Scatter
                  data={[{ volume: op.volume, value: op.pressureStatic, color: 'var(--blue)' }]}
                  shape={dotShape}
                  isAnimationActive={false}
                  legendType="none"
                />
                {/* Max efficiency point */}
                {etaMax && (
                  <Scatter
                    data={[{ volume: etaMax.volume, value: etaMax.pressureStatic, color: 'var(--grn)', label: 'η_max' }]}
                    shape={dotShape}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Curve labels chip row */}
          <div className="flex gap-3 flex-wrap mt-2 px-2">
            {model.curves.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
                <span
                  className="inline-block"
                  style={{
                    width: 16, height: 2,
                    background: c.label === chosen.label ? 'var(--blue)' : c.main ? 'var(--text)' : 'var(--bdr-2)',
                  }}
                />
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* ─── RIGHT: 3 mini charts ───── */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <MiniChart
            title="Power input"
            unit="W"
            color="var(--text)"
            lines={powerLines}
            xMax={Vmax}
            opX={op.volume} opY={op.power}
            etaX={etaMax?.volume} etaY={etaMax?.power}
            chosenLabel={chosen.label}
          />
          <MiniChart
            title="Static efficiency"
            unit="%"
            color="var(--text)"
            lines={effLines}
            xMax={Vmax}
            opX={op.volume} opY={op.efficiencyStatic}
            etaX={etaMax?.volume} etaY={etaMax?.efficiencyStatic}
            chosenLabel={chosen.label}
          />
          <MiniChart
            title="Rotation speed"
            unit="rpm"
            color="var(--text)"
            lines={speedLines}
            xMax={Vmax}
            opX={op.volume} opY={op.speed}
            etaX={etaMax?.volume} etaY={etaMax?.speed}
            chosenLabel={chosen.label}
          />
        </div>
      </div>
      )}
    </div>
  );
}

// ─── Custom shapes (for working / η_max dots) ────────────────────────────

const dotShape = (props: unknown) => {
  const { cx, cy, payload } = props as {
    cx?: number; cy?: number;
    payload?: { color?: string; label?: string };
  };
  if (cx == null || cy == null) return <g />;
  const color = payload?.color ?? 'var(--blue)';
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
      {payload?.label && (
        <text x={cx + 8} y={cy + 4} fontSize={11} fontWeight={700} fill={color}>
          {payload.label}
        </text>
      )}
    </g>
  );
};

const miniDotShape = (props: unknown) => {
  const { cx, cy, payload } = props as {
    cx?: number; cy?: number;
    payload?: { color?: string };
  };
  if (cx == null || cy == null) return <g />;
  return (
    <circle cx={cx} cy={cy} r={3} fill={payload?.color ?? 'var(--blue)'} stroke="#fff" strokeWidth={1} />
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────

function Section({
  title, icon, dotColors, children,
}: {
  title: string;
  icon?: string;
  dotColors?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
        {dotColors ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--blue)' }} />
            <span>Calculated </span>
            <span className="inline-block w-2 h-2 rounded-full ml-2" style={{ background: 'var(--grn)' }} />
            <span style={{ color: 'var(--grn)' }}>Highest η</span>
          </>
        ) : (
          <>
            {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            <span>{title}</span>
          </>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function NumInput({
  value, onChange, unit, symbol, min = 0, max = 1e6,
}: { value: number; onChange: (v: number) => void; unit: string; symbol: string; min?: number; max?: number }) {
  return (
    <label className="flex items-center gap-1 px-2 py-1.5 rounded border text-[12px]" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
      <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>{symbol}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 bg-transparent outline-none font-bold text-right tabular-nums"
        style={{ color: 'var(--text)' }}
      />
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{unit}</span>
    </label>
  );
}

function PressureInput({
  value, onChange, mode, onModeChange,
}: {
  value: number; onChange: (v: number) => void;
  mode: PressureMode; onModeChange: (m: PressureMode) => void;
}) {
  return (
    <label className="flex items-center gap-1 px-2 py-1.5 rounded border text-[12px]" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as PressureMode)}
        className="bg-transparent outline-none text-[10px] font-mono"
        style={{ color: 'var(--text-3)' }}
      >
        <option value="static">ΔPst</option>
        <option value="total">ΔPtot</option>
      </select>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 bg-transparent outline-none font-bold text-right tabular-nums"
        style={{ color: 'var(--text)' }}
      />
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Pa</span>
    </label>
  );
}

function ReadOnly({
  value, unit, symbol,
}: { value: string; unit: string; symbol: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded border text-[12px]" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
      <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>{symbol}</span>
      <span className="flex-1 font-bold text-right tabular-nums" style={{ color: 'var(--text)' }}>{value}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{unit}</span>
    </div>
  );
}

function DataRow({ label, sym, a, b, unit }: { label: string; sym: string; a: string; b: string; unit: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] items-baseline py-0.5">
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="font-mono" style={{ color: 'var(--text-3)' }}>{sym}</span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--blue)' }}>{a}</span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--grn)' }}>{b} <span className="text-[9px] font-normal" style={{ color: 'var(--text-3)' }}>{unit}</span></span>
    </div>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold mb-1 px-2" style={{ color: 'var(--text-2)' }}>
      {children}
    </div>
  );
}

function MiniChart({
  title, unit, color, lines, xMax,
  opX, opY, etaX, etaY, chosenLabel,
}: {
  title: string;
  unit: string;
  color: string;
  lines: { label: string; main: boolean; data: { volume: number; value: number }[] }[];
  xMax: number;
  opX: number; opY: number;
  etaX?: number; etaY?: number;
  chosenLabel: string;
}) {
  const yMax = Math.max(...lines.flatMap((l) => l.data.map((p) => p.value))) * 1.1;
  return (
    <div>
      <ChartTitle>{title} <span style={{ color: 'var(--text-3)' }}>{unit}</span></ChartTitle>
      <div style={{ width: '100%', height: 130 }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 6, right: 8, left: 0, bottom: 16 }}>
            <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 4" />
            <XAxis
              dataKey="volume"
              type="number"
              domain={[0, xMax]}
              tick={{ fontSize: 9, fill: 'var(--text-3)' }}
            />
            <YAxis
              dataKey="value"
              type="number"
              domain={[0, yMax]}
              tick={{ fontSize: 9, fill: 'var(--text-3)' }}
              width={32}
            />
            {lines.map((l) => (
              <Scatter
                key={l.label}
                data={l.data}
                line={{
                  stroke: l.label === chosenLabel ? 'var(--blue)' : l.main ? color : 'var(--bdr-2)',
                  strokeWidth: l.label === chosenLabel ? 1.5 : l.main ? 1.2 : 0.7,
                }}
                shape={() => <g />}
                legendType="none"
                isAnimationActive={false}
              />
            ))}
            <Scatter
              data={[{ volume: opX, value: opY, color: 'var(--blue)' }]}
              shape={miniDotShape}
              isAnimationActive={false}
              legendType="none"
            />
            {etaX !== undefined && etaY !== undefined && (
              <Scatter
                data={[{ volume: etaX, value: etaY, color: 'var(--grn)' }]}
                shape={miniDotShape}
                isAnimationActive={false}
                legendType="none"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Nominal parameters tab ───────────────────────────────────────────────

function NominalParametersTab({ model }: { model: FanModel }) {
  const s = model.spec;
  const a = model.acousticOverall;

  return (
    <div className="p-5">
      <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Nominal parameters
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <SpecCard title="Flow">
          <SpecRow label="Maximum Airflow Volume"   sym="Q_MAX"    value={s.volumeMax}          unit="m³/h" />
          <SpecRow label="Maximum Static Pressure"  sym="Ps_MAX"   value={s.pressureStaticMax}  unit="Pa" />
          <SpecRow label="Nominal Rotational Speed" sym="n"        value={s.speedRated}         unit="rpm" />
        </SpecCard>

        <SpecCard title="Electrical parameters">
          <SpecRow label="Number of phases"        sym="~"        value={s.phase}                unit="" />
          <SpecRow label="Nominal voltage"         sym="U_NOM"    value={s.voltageRated}         unit="V" />
          <SpecRow label="Nominal power"           sym="P_NOM"    value={s.powerRated}           unit="W" />
          <SpecRow label="Maximum power consumption" sym="P_MAX"  value={s.powerMaxConsumption}  unit="W" />
          <SpecRow label="Nominal current"         sym="I_NOM"    value={s.currentRated}         unit="A" decimals={2} />
          <SpecRow label="Nominal frequency"       sym="f_NOM"    value={s.frequencyRated}       unit="Hz" />
        </SpecCard>

        <SpecCard title="Parameters">
          <SpecRow label="Diameter"                sym="ØD"       value={s.diameter}             unit="mm" />
          <SpecRow label="Unit weight"             sym="m"        value={s.weight}               unit="kg" decimals={1} />
        </SpecCard>

        <SpecCard title="Electric engine">
          <SpecRow label="Motor type"              value={s.motorType}              text />
          <SpecRow label="Type of motor control"   value={s.motorTypeControl}       text />
          <SpecRow label="Number of Motor Poles"   value={s.poles}                  text />
          <SpecRow label="Motor protection class"  value={s.ipMotor}                text />
          <SpecRow label="Motor insulation class"  value={s.motorInsulationClass}   text />
        </SpecCard>

        <SpecCard title="Temperature">
          <SpecRow label="Minimum operating temperature" sym="t_OPER MIN" value={s.temperatureOperatingMin} unit="°C" />
          <SpecRow label="Maximum operating temperature" sym="t_OPER MAX" value={s.temperatureOperatingMax} unit="°C" />
        </SpecCard>

        <SpecCard title="Acoustics">
          <SpecRow label="Sound power, inlet"   sym="L_WA inlet"  value={a.Lwa2} unit="dB(A)" />
          <SpecRow label="Sound power, outlet"  sym="L_WA outlet" value={a.Lwa5} unit="dB(A)" />
          <SpecRow label="Sound power, casing"  sym="L_WA casing" value={a.Lwa6} unit="dB(A)" />
        </SpecCard>
      </div>
    </div>
  );
}

function SpecCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}
    >
      <div
        className="text-[12px] font-semibold pb-2 mb-2 border-b"
        style={{ color: 'var(--text)', borderColor: 'var(--bdr)' }}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SpecRow({
  label, sym, value, unit, decimals = 0, text,
}: {
  label: string;
  sym?: string;
  value?: number | string | null;
  unit?: string;
  decimals?: number;
  text?: boolean;
}) {
  const display = (() => {
    if (value == null || value === '') return '—';
    if (text) return String(value);
    if (typeof value === 'number') return value.toFixed(decimals);
    return String(value);
  })();

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] items-baseline py-0.5">
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="font-mono" style={{ color: 'var(--text-3)' }}>{sym ?? ''}</span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>{display}</span>
      <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{unit ?? ''}</span>
    </div>
  );
}

// ─── Dimensions tab ───────────────────────────────────────────────────────

function DimensionsTab({ model }: { model: FanModel }) {
  const dims = model.spec.dimensions ?? {};
  const entries = Object.entries(dims);
  return (
    <div className="p-5">
      <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Dimensions
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-lg border p-4" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.imageUrl}
            alt={model.code}
            className="w-full max-w-[320px] mx-auto object-contain"
          />
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
          <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Overall (mm)
          </div>
          {entries.length === 0 ? (
            <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</div>
          ) : (
            <div className="space-y-1">
              {entries.map(([k, v]) => (
                <SpecRow key={k} label={k} value={String(v).replace(',', '.')} unit="mm" text />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Electrical connection diagram tab ────────────────────────────────────

function ElectricalTab({ model }: { model: FanModel }) {
  const s = model.spec;
  return (
    <div className="p-5">
      <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Electrical connection diagram
      </div>
      <div className="rounded-lg border p-5" style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Wiring
            </div>
            <div className="space-y-1">
              <SpecRow label="Motor type"           value={s.motorType}        text />
              <SpecRow label="Motor control"        value={s.motorTypeControl} text />
              <SpecRow label="Phases"               sym="~"      value={s.phase}        unit="" />
              <SpecRow label="Voltage"              sym="U"      value={s.voltageRated} unit="V" />
              <SpecRow label="Frequency"            sym="f"      value={s.frequencyRated} unit="Hz" />
              <SpecRow label="Rated current"        sym="I"      value={s.currentRated} unit="A" decimals={2} />
              <SpecRow label="Insulation class"     value={s.motorInsulationClass} text />
              <SpecRow label="Protection class"     value={s.ipMotor} text />
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
              EC control
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {s.motorType === 'EC' || s.motorTypeControl === 'EC' ? (
                <>
                  EC ვენტილატორი მართავს სიჩქარეს 0–10 V analog სიგნალით ან PWM/ModBus-ით.
                  control terminals: <b>+10 V</b> (ref out) · <b>0–10 V</b> (speed in) · <b>GND</b>.
                  მინიმალური სიჩქარე ≈ 10–20 % rated; სრული სქემა იხილე მწარმოებლის official wiring diagram-ში
                  ({model.code}).
                </>
              ) : (
                <>AC ვენტილატორი — single/three phase L / N / PE. ბრუნვის სიჩქარე ფიქსირებული, regulation მხოლოდ TRIAC ან VFD-ით.</>
              )}
            </div>
          </div>
        </div>
        <div
          className="mt-4 text-[10px] p-2 rounded border"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)', color: 'var(--text-3)' }}
        >
          ℹ official wiring diagram არ არის ჩამოტვირთული JSON-ში — ჩასასმელად ხელით დავამატოთ
          PDF / SVG ფაილი <code>/lib/ahu-ashrae/fans/data/diagrams/{model.code}.svg</code>-ში.
        </div>
      </div>
    </div>
  );
}
