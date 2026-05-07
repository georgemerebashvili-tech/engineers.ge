'use client';

import React, { useState } from 'react';
import {
  Thermometer, AlertTriangle, Eye, EyeOff,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer, Scatter, XAxis, YAxis,
  CartesianGrid,
  ComposedChart,
  useXAxisScale, useYAxisScale,
} from 'recharts';
import type { AhuWizardState, PsychrometricResults } from '@/lib/ahu-ashrae/types';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import { MollierView } from './Step2Mollier';
import {
  rhCurveLine, wetBulbCurveLine, enthalpyCurveLine,
  specVolumeCurveLine, vapourPressureCurveLine,
} from '@/lib/ahu-ashrae/psychrometrics';
import {
  COMFORT_OVERLAYS, getOverlay, adjustOverlayForPmv,
  DEFAULT_COMFORT_PARAMS,
  describeAirVelocity, describeClo, describeMet, describeMrt,
  type OverlayId, type ComfortOverlay, type ComfortParams,
} from '@/lib/ahu-ashrae/comfort-overlays';
import {
  PROCESS_OVERLAYS, getProcessOverlay,
  type ProcessOverlayId, type ProcessArrow,
} from '@/lib/ahu-ashrae/process-overlays';

interface Props {
  state: AhuWizardState;
  psychro?: PsychrometricResults;
  chain?: ChainResult;
}

// ─── Chart-metric definitions ────────────────────────────────────────────────

type MetricId = 'dryBulb' | 'absHumid' | 'relHumid' | 'wetBulb' | 'vapPress' | 'specVol' | 'enthalpy';

interface MetricDef {
  id: MetricId;
  label: string;
  color: string;
  /** Default-on flag */
  on: boolean;
}

const METRICS: MetricDef[] = [
  { id: 'dryBulb',  label: 'Dry-Bulb Temp.',  color: 'var(--text-3)', on: true },
  { id: 'absHumid', label: 'Absolute Humidity', color: 'var(--text-3)', on: true },
  { id: 'relHumid', label: 'Relative Humidity', color: '#1f6fd4',     on: true },
  { id: 'wetBulb',  label: 'Wet-Bulb Temp.',   color: '#0f6e3a',      on: true },
  { id: 'vapPress', label: 'Vapour Pressure',  color: '#7c4ec0',      on: false },
  { id: 'specVol',  label: 'Specific Volume',  color: '#c05010',      on: false },
  { id: 'enthalpy', label: 'Enthalpy',         color: '#a06010',      on: true },
];

const DEFAULT_METRICS: Record<MetricId, boolean> = METRICS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.on }),
  {} as Record<MetricId, boolean>,
);

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Psychro({ state, psychro, chain }: Props) {
  const [chartMode, setChartMode] = useState<'tx' | 'id'>('tx');
  const [overlayId, setOverlayId] = useState<OverlayId>('iso7730');
  const [processId, setProcessId] = useState<ProcessOverlayId>('none');
  const [params, setParams] = useState<ComfortParams>(DEFAULT_COMFORT_PARAMS);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<Record<MetricId, boolean>>(DEFAULT_METRICS);

  if (!psychro && !chain) {
    return (
      <div
        className="rounded-xl border p-8 flex items-center gap-3"
        style={{ background: 'var(--ora-lt)', borderColor: 'var(--ora-bd)' }}
      >
        <AlertTriangle size={20} style={{ color: 'var(--ora)' }} />
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--ora)' }}>
            ფსიქრომეტრიული გაანგარიშება ვერ მოხერხდა
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            დაბრუნდი წინა ნაბიჯზე და შეამოწმე საწყისი მონაცემები + სექციათა ჯაჭვი.
          </div>
        </div>
      </div>
    );
  }

  const overlayBase = getOverlay(overlayId);
  const overlay = overlayBase
    ? (overlayId === 'iso7730' || overlayId === 'ashrae55_summer' ||
       overlayId === 'ashrae55_winter' || overlayId === 'en15251')
      ? adjustOverlayForPmv(overlayBase, params)
      : overlayBase
    : null;

  const processOverlay = getProcessOverlay(processId);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Thermometer size={14} style={{ color: 'var(--blue)' }} />
            <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
              ფსიქრომეტრიული დიაგრამა
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Chart mode tabs */}
            <div
              className="flex rounded-md overflow-hidden border text-[10px] font-bold"
              style={{ borderColor: 'var(--bdr)' }}
            >
              {(['tx', 'id'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className="px-2.5 py-1 transition-colors"
                  style={{
                    background: chartMode === mode ? 'var(--blue)' : 'var(--sur-2)',
                    color: chartMode === mode ? '#fff' : 'var(--text-2)',
                  }}
                >
                  {mode === 'tx' ? 'T-x (ASHRAE)' : 'i-d (Mollier)'}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              P = {state.design.pressure.toFixed(1)} kPa
            </div>
          </div>
        </div>

        {/* ── i-d (Mollier) mode ── */}
        {chartMode === 'id' && (
          <MollierView chain={chain} pressure={state.design.pressure} />
        )}

        {/* ── T-x (ASHRAE) mode ── */}
        {chartMode === 'tx' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
          {/* ── Chart ── */}
          <div>
            <PsychroChart
              psychro={psychro}
              chain={chain}
              overlay={overlay}
              processArrows={processOverlay.arrows}
              metrics={metrics}
              showGrid={showGrid}
              pressure={state.design.pressure}
            />

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
              {overlay && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm border"
                      style={{ background: overlay.fill, borderColor: overlay.border }}
                    />
                    <span style={{ color: 'var(--text-2)' }}>{overlay.label}</span>
                    <span className="font-mono" style={{ color: 'var(--text-3)' }}>· {overlay.reference}</span>
                  </div>
                  {overlay.zones?.filter((z) => z.label).map((z, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: z.fill }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{z.label}</span>
                    </div>
                  ))}
                </>
              )}
              {chain && chain.states.map((p, i) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: stateColor(i, p.sectionType) }}
                  />
                  <span style={{ color: 'var(--text-2)' }}>
                    <strong style={{ color: stateColor(i, p.sectionType) }}>s{i}</strong> {p.label}
                  </span>
                </div>
              ))}
              {!chain && psychro && (
                <>
                  {(['outdoor', 'mixed', 'supplyAir', 'roomAir', 'adp'] as const).map((k) => {
                    const p = psychro[k];
                    return (
                      <div key={p.label} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: pointColor(p.label) }} />
                        <span style={{ color: 'var(--text-2)' }}>
                          <strong style={{ color: pointColor(p.label) }}>{p.label}</strong> · {p.description}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Right sidebar: 3 panels ── */}
          <div className="space-y-3 text-[11px]">
            <ComfortPanel
              overlayId={overlayId}
              onOverlayChange={setOverlayId}
              params={params}
              onParamsChange={setParams}
              showGrid={showGrid}
              onShowGridChange={setShowGrid}
            />
            <ProcessPanel processId={processId} onChange={setProcessId} />
            <MetricsPanel metrics={metrics} onChange={setMetrics} />
          </div>
        </div>
        )}
      </div>

      {/* ── Chain state inline table ── */}
      {chain && chain.states.length > 1 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
        >
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--bdr)' }}>
            <Thermometer size={14} style={{ color: 'var(--blue)' }} />
            <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
              ჯაჭვის წერტილები
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--sur-2)' }}>
                  <Th>•</Th>
                  <Th>State</Th>
                  <Th>აღწერა</Th>
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
                    <Td>
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: stateColor(i, p.sectionType) }} />
                    </Td>
                    <Td><span className="font-bold font-mono" style={{ color: stateColor(i, p.sectionType) }}>s{i}</span></Td>
                    <Td><span style={{ color: 'var(--text-2)' }}>{p.label}</span></Td>
                    <Td align="right" mono>{p.state.tdb.toFixed(2)}</Td>
                    <Td align="right" mono>{p.state.twb.toFixed(2)}</Td>
                    <Td align="right" mono>{(p.state.w * 1000).toFixed(2)}</Td>
                    <Td align="right" mono>{(p.state.rh * 100).toFixed(1)}</Td>
                    <Td align="right" mono>{p.state.h.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Capacity boxes ── */}
      {psychro && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CapacityBox
            title="გამაგრილების სიმძლავრე"
            subtitle="Cooling Capacity (legacy)"
            rows={[
              { label: 'Sensible Qs', value: psychro.coolingCapacity.sensible.toFixed(2), unit: 'kW', color: 'var(--blue)' },
              { label: 'Latent Ql', value: psychro.coolingCapacity.latent.toFixed(2), unit: 'kW', color: 'var(--ora)' },
              { label: 'Total Qt', value: psychro.coolingCapacity.total.toFixed(2), unit: 'kW', color: 'var(--navy)', big: true },
            ]}
          />
          <CapacityBox
            title="ფსიქრომეტრიული მაჩვენებლები"
            subtitle="Performance"
            rows={[
              { label: 'SHR', value: (psychro.shr * 100).toFixed(0), unit: '%', color: 'var(--blue)' },
              { label: 'Contact Factor', value: (psychro.contactFactor * 100).toFixed(0), unit: '%', color: 'var(--grn)' },
              { label: 'Bypass Factor', value: ((1 - psychro.contactFactor) * 100).toFixed(0), unit: '%', color: 'var(--text-3)' },
            ]}
          />
          <CapacityBox
            title="ჯაჭვი (chain) ჯამები"
            subtitle="Pipeline totals"
            rows={chain ? [
              { label: 'Cooling Q', value: chain.totalCooling.toFixed(2), unit: 'kW', color: 'var(--blue)' },
              { label: 'Heating Q', value: chain.totalHeating.toFixed(2), unit: 'kW', color: 'var(--ora)' },
              { label: 'Total ΔP', value: chain.totalDeltaP.toFixed(0), unit: 'Pa', color: 'var(--navy)', big: true },
            ] : [{ label: 'Chain ჯერ არ არის გაშვებული', value: '—', unit: '', color: 'var(--text-3)' }]}
          />
        </div>
      )}
    </div>
  );
}

// ─── Sidebar panels ──────────────────────────────────────────────────────────

function PanelHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded-md border"
      style={{ background: 'var(--sur-2)', borderColor: 'var(--bdr)', color: 'var(--navy)' }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{title}</span>
      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </button>
  );
}

function ComfortPanel({
  overlayId, onOverlayChange,
  params, onParamsChange,
  showGrid, onShowGridChange,
}: {
  overlayId: OverlayId;
  onOverlayChange: (id: OverlayId) => void;
  params: ComfortParams;
  onParamsChange: (p: ComfortParams) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const showPmv = overlayId === 'iso7730' || overlayId === 'ashrae55_summer' ||
                  overlayId === 'ashrae55_winter' || overlayId === 'en15251';
  return (
    <div className="space-y-1.5">
      <PanelHeader title="Comfort Overlay" open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="rounded-md border p-2.5 space-y-2.5" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
          <div className="flex items-center gap-1.5">
            {overlayId === 'none'
              ? <EyeOff size={12} style={{ color: 'var(--text-3)' }} />
              : <Eye size={12} style={{ color: 'var(--blue)' }} />}
            <select
              value={overlayId}
              onChange={(e) => onOverlayChange(e.target.value as OverlayId)}
              className="flex-1 text-[11px] font-medium rounded-md border px-2 py-1"
              style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur-2)', color: 'var(--text)' }}
            >
              <option value="none">No Comfort Overlay</option>
              {COMFORT_OVERLAYS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-[10.5px]" style={{ color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => onShowGridChange(e.target.checked)}
            />
            Show Underlying Data Grid
          </label>

          {showPmv && (
            <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--bdr)' }}>
              <PmvSlider
                label="Air Velocity"
                unit="m/s"
                value={params.airVelocity}
                min={0} max={1.5} step={0.05}
                describe={describeAirVelocity}
                onChange={(v) => onParamsChange({ ...params, airVelocity: v })}
              />
              <PmvSlider
                label="Clothing Level"
                unit="clo"
                value={params.clo}
                min={0.3} max={1.5} step={0.05}
                describe={describeClo}
                onChange={(v) => onParamsChange({ ...params, clo: v })}
              />
              <PmvSlider
                label="Metabolic Rate"
                unit="met"
                value={params.met}
                min={0.8} max={3.0} step={0.05}
                describe={describeMet}
                onChange={(v) => onParamsChange({ ...params, met: v })}
              />
              <PmvSlider
                label="Mean Radiant Temp."
                unit="°C"
                value={params.mrt}
                min={10} max={35} step={0.5}
                describe={describeMrt}
                onChange={(v) => onParamsChange({ ...params, mrt: v })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PmvSlider({
  label, unit, value, min, max, step, describe, onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number; max: number; step: number;
  describe: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-medium" style={{ color: 'var(--text)' }}>{label}:</span>
        <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--blue)' }}>
          {value.toFixed(unit === 'clo' || unit === 'met' ? 2 : (unit === 'm/s' ? 2 : 1))} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-1"
      />
      <div className="text-[9.5px] italic" style={{ color: 'var(--text-3)' }}>{describe(value)}</div>
    </div>
  );
}

function ProcessPanel({ processId, onChange }: {
  processId: ProcessOverlayId;
  onChange: (id: ProcessOverlayId) => void;
}) {
  const [open, setOpen] = useState(true);
  const o = PROCESS_OVERLAYS[processId];
  return (
    <div className="space-y-1.5">
      <PanelHeader title="Process Overlay" open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="rounded-md border p-2.5 space-y-1.5" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
          <select
            value={processId}
            onChange={(e) => onChange(e.target.value as ProcessOverlayId)}
            className="w-full text-[11px] font-medium rounded-md border px-2 py-1"
            style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur-2)', color: 'var(--text)' }}
          >
            {(Object.keys(PROCESS_OVERLAYS) as ProcessOverlayId[]).map((id) => (
              <option key={id} value={id}>{PROCESS_OVERLAYS[id].label}</option>
            ))}
          </select>
          {o.description && (
            <div className="text-[9.5px] italic" style={{ color: 'var(--text-3)' }}>{o.description}</div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricsPanel({
  metrics, onChange,
}: {
  metrics: Record<MetricId, boolean>;
  onChange: (m: Record<MetricId, boolean>) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-1.5">
      <PanelHeader title="Chart Metrics" open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="rounded-md border p-2.5 space-y-1.5" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
          {METRICS.map((m) => {
            const on = metrics[m.id];
            return (
              <label key={m.id} className="flex items-center justify-between gap-2 text-[10.5px]"
                     style={{ color: on ? 'var(--text)' : 'var(--text-3)' }}>
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => onChange({ ...metrics, [m.id]: e.target.checked })}
                  />
                  <span>{m.label}</span>
                </span>
                {on
                  ? <Eye size={11} style={{ color: m.color }} />
                  : <EyeOff size={11} style={{ color: 'var(--text-3)' }} />}
              </label>
            );
          })}
          <div className="flex gap-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--bdr)' }}>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_METRICS)}
              className="flex-1 text-[10px] font-medium rounded border px-2 py-1"
              style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur-2)', color: 'var(--text-2)' }}
            >Default</button>
            <button
              type="button"
              onClick={() => onChange(METRICS.reduce((acc, m) => ({ ...acc, [m.id]: false }), {} as Record<MetricId, boolean>))}
              className="flex-1 text-[10px] font-medium rounded border px-2 py-1"
              style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur-2)', color: 'var(--text-2)' }}
            >None</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Psychrometric Chart ──────────────────────────────────────────────────────

interface ChartProps {
  psychro?: PsychrometricResults;
  chain?: ChainResult;
  overlay: ComfortOverlay | null;
  processArrows: ProcessArrow[];
  metrics: Record<MetricId, boolean>;
  showGrid: boolean;
  pressure: number;
}

function PsychroChart({ psychro, chain, overlay, processArrows, metrics, showGrid, pressure }: ChartProps) {
  const rhValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const wbValues = [0, 5, 10, 15, 20, 25, 30];
  const hValues = [10, 30, 50, 70, 90, 110]; // kJ/kg
  const vValues = [0.80, 0.84, 0.88, 0.92, 0.96]; // m³/kg
  const wConstValues = [4, 8, 12, 16, 20, 24]; // g/kg — for vapour-pressure (constant W) horizontal lines

  const rhCurves = metrics.relHumid
    ? rhValues.map((rh) => ({ rh, points: rhCurveLine(rh, -5, 50, 60, pressure).filter((p) => p.tdb >= -5 && p.tdb <= 50) }))
    : [];

  const wbCurves = metrics.wetBulb
    ? wbValues.map((twb) => ({ twb, points: wetBulbCurveLine(twb, -5, 50, 50, pressure) }))
    : [];

  const hCurves = metrics.enthalpy
    ? hValues.map((h) => ({ h, points: enthalpyCurveLine(h, -5, 50, 50) }))
    : [];

  const vCurves = metrics.specVol
    ? vValues.map((v) => ({ v, points: specVolumeCurveLine(v, -5, 50, 50, pressure) }))
    : [];

  const wConstLines = metrics.vapPress
    ? wConstValues.map((wg) => ({ wg, points: [{ tdb: -5, w: wg }, { tdb: 50, w: wg }] as Array<{ tdb: number; w: number }> }))
    : [];

  return (
    <div style={{ width: '100%', height: 520 }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
          {showGrid && <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 4" />}
          <XAxis
            dataKey="tdb"
            type="number"
            domain={[-5, 45]}
            ticks={[-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45]}
            tick={metrics.dryBulb ? { fontSize: 10, fill: 'var(--text-3)' } : false}
            label={{ value: 'Dry-bulb temperature (°C)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <YAxis
            dataKey="w"
            type="number"
            domain={[0, 28]}
            ticks={[0, 4, 8, 12, 16, 20, 24, 28]}
            tick={metrics.absHumid ? { fontSize: 10, fill: 'var(--text-3)' } : false}
            label={{ value: 'Humidity ratio (g/kg)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: 'var(--text-2)' }}
          />

          {/* Comfort overlay polygon */}
          {overlay && <ComfortPolygon key={`overlay-${overlay.id}-${overlay.vertices[0].tdb.toFixed(2)}`} overlay={overlay} />}

          {/* Constant W (= vapour-pressure) horizontal lines */}
          {wConstLines.map((line) => (
            <Scatter
              key={`vp-${line.wg}`}
              data={line.points}
              line={{ stroke: '#7c4ec0', strokeWidth: 0.5, strokeDasharray: '1 3' }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          ))}

          {/* Constant specific-volume oblique lines */}
          {vCurves.map((c) => (
            <Scatter
              key={`v-${c.v}`}
              data={c.points}
              line={{ stroke: '#c05010', strokeWidth: 0.5, strokeDasharray: '4 2' }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          ))}

          {/* Constant enthalpy oblique lines */}
          {hCurves.map((c) => (
            <Scatter
              key={`h-${c.h}`}
              data={c.points}
              line={{ stroke: '#a06010', strokeWidth: 0.5, strokeDasharray: '6 3' }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          ))}

          {/* Constant wet-bulb oblique lines */}
          {wbCurves.map((c) => (
            <Scatter
              key={`wb-${c.twb}`}
              data={c.points}
              line={{ stroke: '#0f6e3a', strokeWidth: 0.5, strokeDasharray: '3 3' }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          ))}

          {/* RH curves */}
          {rhCurves.map((curve) => (
            <Scatter
              key={`rh-${curve.rh}`}
              data={curve.points}
              line={{ stroke: curve.rh === 100 ? 'var(--blue)' : 'var(--bdr-2)', strokeWidth: curve.rh === 100 ? 1.5 : 0.7, strokeDasharray: curve.rh === 100 ? '0' : '2 2' }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          ))}

          {/* Process overlay arrows (educational) */}
          {processArrows.length > 0 && (
            <ProcessArrows
              key={`proc-${processArrows.map((a) => a.id).join('-')}`}
              arrows={processArrows}
            />
          )}

          {/* Chain process: colored per-section segments with arrows + Q badges */}
          {chain && <ProcessSegmentLayer key={`seg-${chain.states.length}`} chain={chain} />}

          {/* Chain state markers */}
          {chain && (
            <Scatter
              data={chain.states.map((s, i) => ({
                tdb: s.state.tdb,
                w: s.state.w * 1000,
                name: `s${i}`,
                color: stateColor(i, s.sectionType),
              }))}
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={5.5} fill={payload.color} stroke="#fff" strokeWidth={1.5} />
                    <text x={cx + 8} y={cy + 4} fontSize={10} fontWeight={700} fill={payload.color}>{payload.name}</text>
                  </g>
                );
              }}
              isAnimationActive={false}
            />
          )}

          {/* Legacy points */}
          {!chain && psychro && (
            <>
              <Scatter
                data={[
                  { tdb: psychro.outdoor.tdb, w: psychro.outdoor.w * 1000 },
                  { tdb: psychro.mixed.tdb, w: psychro.mixed.w * 1000 },
                  { tdb: psychro.supplyAir.tdb, w: psychro.supplyAir.w * 1000 },
                  { tdb: psychro.roomAir.tdb, w: psychro.roomAir.w * 1000 },
                ]}
                line={{ stroke: 'var(--navy)', strokeWidth: 1.5 }}
                shape={() => <></>}
                legendType="none"
                isAnimationActive={false}
              />
              <Scatter
                data={[
                  { tdb: psychro.outdoor.tdb, w: psychro.outdoor.w * 1000, name: 'O', color: pointColor('O') },
                  { tdb: psychro.mixed.tdb, w: psychro.mixed.w * 1000, name: 'M', color: pointColor('M') },
                  { tdb: psychro.supplyAir.tdb, w: psychro.supplyAir.w * 1000, name: 'S', color: pointColor('S') },
                  { tdb: psychro.roomAir.tdb, w: psychro.roomAir.w * 1000, name: 'R', color: pointColor('R') },
                  { tdb: psychro.adp.tdb, w: psychro.adp.w * 1000, name: 'ADP', color: pointColor('ADP') },
                ]}
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={6} fill={payload.color} stroke="#fff" strokeWidth={1.5} />
                      <text x={cx + 9} y={cy + 3} fontSize={11} fontWeight={700} fill={payload.color}>{payload.name}</text>
                    </g>
                  );
                }}
                isAnimationActive={false}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── SVG injectors (use Recharts 3 axis-scale hooks) ──────────────────────────

function segmentColor(type?: string): string {
  switch (type) {
    case 'preheat':
    case 'reheat':      return '#c2410c';
    case 'cooling_coil': return '#1d4ed8';
    case 'humidifier':  return '#0891b2';
    case 'heat_recovery': return '#7c3aed';
    case 'fan':         return '#64748b';
    case 'mixing_box':  return '#059669';
    default:            return '#94a3b8';
  }
}

function stateColor(i: number, sectionType?: string): string {
  return i === 0 ? '#c05010' : segmentColor(sectionType);
}

function formatQ(kw: number): string {
  if (Math.abs(kw) < 0.05) return '';
  return `${kw > 0 ? '+' : ''}${kw.toFixed(1)} kW`;
}

function ProcessSegmentLayer({ chain }: { chain: ChainResult }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale || chain.states.length < 2) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {chain.states.slice(1).map((st, i) => {
        const prev = chain.states[i];
        const x1 = xScale(prev.state.tdb) ?? 0;
        const y1 = yScale(prev.state.w * 1000) ?? 0;
        const x2 = xScale(st.state.tdb) ?? 0;
        const y2 = yScale(st.state.w * 1000) ?? 0;
        const color = segmentColor(st.sectionType);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const head = 8, wing = 4;
        const hx1 = x2 - ux * head + uy * wing;
        const hy1 = y2 - uy * head - ux * wing;
        const hx2 = x2 - ux * head - uy * wing;
        const hy2 = y2 - uy * head + ux * wing;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const qLabel = st.energy != null ? formatQ(st.energy) : '';
        // offset badge perpendicular to line to avoid overlap
        const px = -uy * 14, py = ux * 14;
        return (
          <g key={st.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} />
            {len > 4 && (
              <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} />
            )}
            {qLabel && (
              <g>
                <rect
                  x={mx + px - 22} y={my + py - 8}
                  width={44} height={13} rx={3}
                  fill={color} opacity={0.18}
                />
                <text
                  x={mx + px} y={my + py + 2}
                  fontSize={9} textAnchor="middle" fontWeight={700} fill={color}
                >{qLabel}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ComfortPolygon({ overlay }: { overlay: ComfortOverlay }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;

  const renderPoly = (
    verts: { tdb: number; w: number }[],
    fill: string,
    border: string,
    key: string,
  ) => {
    const pts = verts.map((v) => `${xScale(v.tdb) ?? 0},${yScale(v.w) ?? 0}`).join(' ');
    return (
      <polygon key={key} points={pts} fill={fill} stroke={border} strokeWidth={1.2}
        style={{ pointerEvents: 'none' }} />
    );
  };

  return (
    <g style={{ pointerEvents: 'none' }}>
      {renderPoly(overlay.vertices, overlay.fill, overlay.border, 'main')}
      {overlay.zones?.map((z, i) =>
        renderPoly(z.vertices, z.fill, z.border, `z${i}`)
      )}
    </g>
  );
}

function ProcessArrows({ arrows }: { arrows: ProcessArrow[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return (
    <g>
      {arrows.map((a) => {
        const x1 = xScale(a.from.tdb) ?? 0;
        const y1 = yScale(a.from.w) ?? 0;
        const x2 = xScale(a.to.tdb) ?? 0;
        const y2 = yScale(a.to.w) ?? 0;
        // Arrowhead — small triangle at tip
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const head = 7;
        const wing = 3.5;
        const hx1 = x2 - ux * head + uy * wing;
        const hy1 = y2 - uy * head - ux * wing;
        const hx2 = x2 - ux * head - uy * wing;
        const hy2 = y2 - uy * head + ux * wing;
        return (
          <g key={a.id} style={{ pointerEvents: 'none' }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeWidth={1.5} />
            <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} fill={a.color} />
            <text
              x={x2 + ux * 6}
              y={y2 + uy * 6 + 3}
              fontSize={9}
              fill={a.color}
              opacity={0.85}
            >{a.label}</text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pointColor(label: string): string {
  switch (label) {
    case 'O': return '#c05010';
    case 'M': return '#7a96b8';
    case 'S': return '#1f6fd4';
    case 'R': return '#0f6e3a';
    case 'ADP': return '#1a3a6b';
    default: return '#7a96b8';
  }
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em]"
      style={{ color: 'var(--text-3)', textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', mono }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean }) {
  return (
    <td
      className={`px-3 py-2 text-xs ${mono ? 'font-mono' : ''}`}
      style={{ color: 'var(--text)', textAlign: align }}
    >
      {children}
    </td>
  );
}

function CapacityBox({
  title, subtitle, rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string; unit: string; color: string; big?: boolean }>;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}>
      <div className="mb-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
          {subtitle}
        </div>
        <div className="text-xs font-bold" style={{ color: 'var(--navy)' }}>{title}</div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between items-baseline">
            <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{r.label}</span>
            <span className={`font-mono font-bold ${r.big ? 'text-base' : 'text-xs'}`} style={{ color: r.color }}>
              {r.value} <span className="text-[10px] font-normal" style={{ color: 'var(--text-3)' }}>{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
