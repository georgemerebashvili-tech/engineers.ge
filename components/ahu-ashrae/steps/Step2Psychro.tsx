'use client';

import React, { useState } from 'react';
import { Thermometer, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  ResponsiveContainer, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Customized,
  ComposedChart,
} from 'recharts';
import type { AhuWizardState, PsychrometricResults } from '@/lib/ahu-ashrae/types';
import type { ChainResult, ChainStateLabel } from '@/lib/ahu-ashrae/chain';
import { rhCurveLine } from '@/lib/ahu-ashrae/psychrometrics';
import {
  COMFORT_OVERLAYS, getOverlay, type OverlayId, type ComfortOverlay,
} from '@/lib/ahu-ashrae/comfort-overlays';

interface Props {
  state: AhuWizardState;
  psychro?: PsychrometricResults;
  chain?: ChainResult;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Psychro({ state, psychro, chain }: Props) {
  const [overlayId, setOverlayId] = useState<OverlayId>('givoni');

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

  const overlay = getOverlay(overlayId);

  return (
    <div className="space-y-5">
      {/* ── Psychrometric chart ── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Thermometer size={14} style={{ color: 'var(--blue)' }} />
            <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
              ფსიქრომეტრიული დიაგრამა (i-d)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <ComfortSelector value={overlayId} onChange={setOverlayId} />
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              P = {state.design.pressure.toFixed(1)} kPa
            </div>
          </div>
        </div>

        <PsychroChart psychro={psychro} chain={chain} overlay={overlay} />

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
          {overlay && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm border"
                style={{ background: overlay.fill, borderColor: overlay.border }}
              />
              <span style={{ color: 'var(--text-2)' }}>{overlay.label}</span>
              <span className="font-mono" style={{ color: 'var(--text-3)' }}>· {overlay.reference}</span>
            </div>
          )}
          {chain && chain.states.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: chainColor(i, chain.states.length) }}
              />
              <span style={{ color: 'var(--text-2)' }}>
                <strong style={{ color: chainColor(i, chain.states.length) }}>s{i}</strong> {p.label}
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
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: chainColor(i, chain.states.length) }} />
                    </Td>
                    <Td><span className="font-bold font-mono" style={{ color: chainColor(i, chain.states.length) }}>s{i}</span></Td>
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

      {/* ── Capacity boxes (fall back to legacy psychro if available) ── */}
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

// ─── Comfort selector ────────────────────────────────────────────────────────

function ComfortSelector({ value, onChange }: { value: OverlayId; onChange: (id: OverlayId) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {value === 'none'
        ? <EyeOff size={12} style={{ color: 'var(--text-3)' }} />
        : <Eye size={12} style={{ color: 'var(--blue)' }} />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OverlayId)}
        className="text-[11px] font-medium rounded-md border px-2 py-1"
        style={{ borderColor: 'var(--bdr-2)', background: 'var(--sur)', color: 'var(--text)' }}
      >
        <option value="none">No Comfort Overlay</option>
        {COMFORT_OVERLAYS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Psychrometric Chart ──────────────────────────────────────────────────────

interface ChartProps {
  psychro?: PsychrometricResults;
  chain?: ChainResult;
  overlay: ComfortOverlay | null;
}

function PsychroChart({ psychro, chain, overlay }: ChartProps) {
  const rhValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const rhCurves = rhValues.map((rh) => ({
    rh,
    points: rhCurveLine(rh, -5, 50, 60).filter((p) => p.tdb >= -5 && p.tdb <= 50),
  }));

  return (
    <div style={{ width: '100%', height: 440 }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
          <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 4" />
          <XAxis
            dataKey="tdb"
            type="number"
            domain={[-5, 45]}
            ticks={[-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45]}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Dry-bulb temperature (°C)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <YAxis
            dataKey="w"
            type="number"
            domain={[0, 28]}
            ticks={[0, 4, 8, 12, 16, 20, 24, 28]}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Humidity ratio (g/kg)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--sur)', border: '1px solid var(--bdr-2)', fontSize: 11 }}
            formatter={(v) => [Number(v).toFixed(2), '']}
            labelFormatter={(label) => `T = ${Number(label).toFixed(1)}°C`}
          />

          {/* Comfort overlay polygon — drawn first so chart elements overlay it */}
          {overlay && (
            <Customized
              key={`overlay-${overlay.id}`}
              component={(props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }> }) => (
                <ComfortPolygon overlay={overlay} {...props} />
              )}
            />
          )}

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

          {/* Chain process line — connects all states sequentially */}
          {chain && (
            <Scatter
              data={chain.states.map((s) => ({ tdb: s.state.tdb, w: s.state.w * 1000 }))}
              line={{ stroke: 'var(--navy)', strokeWidth: 1.5 }}
              shape={() => <></>}
              legendType="none"
              isAnimationActive={false}
            />
          )}

          {/* Chain state markers */}
          {chain && (
            <Scatter
              data={chain.states.map((s, i) => ({
                tdb: s.state.tdb,
                w: s.state.w * 1000,
                name: `s${i}`,
                color: chainColor(i, chain.states.length),
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

          {/* Legacy points (only if no chain) */}
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

// ─── Comfort polygon SVG injection ────────────────────────────────────────────

interface PolygonProps {
  overlay: ComfortOverlay;
  xAxisMap?: Record<string, { scale: (v: number) => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
}
function ComfortPolygon({ overlay, xAxisMap, yAxisMap }: PolygonProps) {
  if (!xAxisMap || !yAxisMap) return null;
  const xKey = Object.keys(xAxisMap)[0];
  const yKey = Object.keys(yAxisMap)[0];
  const xScale = xAxisMap[xKey]?.scale;
  const yScale = yAxisMap[yKey]?.scale;
  if (!xScale || !yScale) return null;
  const pts = overlay.vertices
    .map((v) => `${xScale(v.tdb)},${yScale(v.w)}`)
    .join(' ');
  return (
    <polygon
      points={pts}
      fill={overlay.fill}
      stroke={overlay.border}
      strokeWidth={1}
      strokeDasharray="3 3"
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chainColor(i: number, total: number): string {
  // OA red → mixed gray → supply blue → room green
  if (i === 0) return '#c05010'; // outdoor — orange
  if (i === total - 1) return '#1f6fd4'; // supply — blue
  // intermediate: blue gradient navy → blue
  const t = total > 2 ? (i - 1) / (total - 2) : 0;
  const r = Math.round(26 + t * 5);
  const g = Math.round(58 + t * 53);
  const b = Math.round(107 + t * 105);
  return `rgb(${r}, ${g}, ${b})`;
}

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
