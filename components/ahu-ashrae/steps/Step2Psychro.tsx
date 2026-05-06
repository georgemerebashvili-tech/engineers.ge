'use client';

import React from 'react';
import { Thermometer, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Line, ReferenceLine,
  ComposedChart,
} from 'recharts';
import type { AhuWizardState, PsychrometricResults, PsychoPoint } from '@/lib/ahu-ashrae/types';
import { rhCurveLine } from '@/lib/ahu-ashrae/psychrometrics';

interface Props {
  state: AhuWizardState;
  psychro?: PsychrometricResults;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Psychro({ state, psychro }: Props) {
  if (!psychro) {
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
            დაბრუნდი წინა ნაბიჯზე და შეამოწმე საწყისი მონაცემები.
          </div>
        </div>
      </div>
    );
  }

  const points = [psychro.outdoor, psychro.mixed, psychro.supplyAir, psychro.roomAir, psychro.adp];

  return (
    <div className="space-y-5">
      {/* ── State points table ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--bdr)' }}>
          <Thermometer size={14} style={{ color: 'var(--blue)' }} />
          <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
            State Points — ASHRAE Ch.1
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
                <Th align="right">DP °C</Th>
                <Th align="right">W g/kg</Th>
                <Th align="right">RH %</Th>
                <Th align="right">h kJ/kg</Th>
                <Th align="right">v m³/kg</Th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr
                  key={p.label}
                  className="border-t"
                  style={{ borderColor: 'var(--bdr)' }}
                >
                  <Td>
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: pointColor(p.label) }}
                    />
                  </Td>
                  <Td><span className="font-bold" style={{ color: pointColor(p.label) }}>{p.label}</span></Td>
                  <Td><span style={{ color: 'var(--text-2)' }}>{p.description}</span></Td>
                  <Td align="right" mono>{p.tdb.toFixed(2)}</Td>
                  <Td align="right" mono>{p.twb.toFixed(2)}</Td>
                  <Td align="right" mono>{p.tdp.toFixed(2)}</Td>
                  <Td align="right" mono>{(p.w * 1000).toFixed(2)}</Td>
                  <Td align="right" mono>{p.rh.toFixed(1)}</Td>
                  <Td align="right" mono>{p.h.toFixed(2)}</Td>
                  <Td align="right" mono>{p.v.toFixed(3)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cooling capacity + key indicators ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CapacityBox
          title="გამაგრილების სიმძლავრე"
          subtitle="Cooling Capacity"
          rows={[
            { label: 'Sensible Qs', value: psychro.coolingCapacity.sensible.toFixed(2), unit: 'kW', color: 'var(--blue)' },
            { label: 'Latent Ql', value: psychro.coolingCapacity.latent.toFixed(2), unit: 'kW', color: 'var(--ora)' },
            { label: 'Total Qt', value: psychro.coolingCapacity.total.toFixed(2), unit: 'kW', color: 'var(--navy)', big: true },
          ]}
        />
        <CapacityBox
          title="ფსიქრომეტრიული მაჩვენებლები"
          subtitle="Performance Indicators"
          rows={[
            { label: 'SHR', value: (psychro.shr * 100).toFixed(0), unit: '%', color: 'var(--blue)' },
            { label: 'Contact Factor', value: (psychro.contactFactor * 100).toFixed(0), unit: '%', color: 'var(--grn)' },
            { label: 'Bypass Factor', value: ((1 - psychro.contactFactor) * 100).toFixed(0), unit: '%', color: 'var(--text-3)' },
          ]}
        />
        <CapacityBox
          title="ჰაერის თვისებები"
          subtitle="Mixed Air Properties"
          rows={[
            { label: 'Density', value: psychro.airDensity.toFixed(3), unit: 'kg/m³', color: 'var(--text-2)' },
            { label: 'ΔT (M→S)', value: (psychro.mixed.tdb - psychro.supplyAir.tdb).toFixed(1), unit: '°C', color: 'var(--blue)' },
            { label: 'ΔW (M→S)', value: ((psychro.mixed.w - psychro.supplyAir.w) * 1000).toFixed(2), unit: 'g/kg', color: 'var(--ora)' },
          ]}
        />
      </div>

      {/* ── Psychrometric chart ── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--navy)' }}>
            ფსიქრომეტრიული დიაგრამა
          </h2>
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            P = {state.design.pressure.toFixed(1)} kPa
          </div>
        </div>
        <PsychroChart psychro={psychro} />
        <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
          {points.map((p) => (
            <div key={p.label} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: pointColor(p.label) }} />
              <span style={{ color: 'var(--text-2)' }}>
                <strong style={{ color: pointColor(p.label) }}>{p.label}</strong> · {p.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Psychrometric Chart ──────────────────────────────────────────────────────

function PsychroChart({ psychro }: { psychro: PsychrometricResults }) {
  // Generate RH curves
  const rhValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const rhCurves = rhValues.map((rh) => ({
    rh,
    points: rhCurveLine(rh, -5, 50, 60).filter((p) => p.tdb >= -5 && p.tdb <= 50),
  }));

  // State points for scatter
  const statePoints = [
    { name: 'O', tdb: psychro.outdoor.tdb, w: psychro.outdoor.w * 1000, color: pointColor('O') },
    { name: 'M', tdb: psychro.mixed.tdb, w: psychro.mixed.w * 1000, color: pointColor('M') },
    { name: 'S', tdb: psychro.supplyAir.tdb, w: psychro.supplyAir.w * 1000, color: pointColor('S') },
    { name: 'R', tdb: psychro.roomAir.tdb, w: psychro.roomAir.w * 1000, color: pointColor('R') },
    { name: 'ADP', tdb: psychro.adp.tdb, w: psychro.adp.w * 1000, color: pointColor('ADP') },
  ];

  return (
    <div style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
          <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 4" />
          <XAxis
            dataKey="tdb"
            type="number"
            domain={[-5, 50]}
            ticks={[-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Dry-bulb temperature (°C)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <YAxis
            dataKey="w"
            type="number"
            domain={[0, 30]}
            ticks={[0, 5, 10, 15, 20, 25, 30]}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Humidity ratio (g/kg)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--sur)', border: '1px solid var(--bdr-2)', fontSize: 11 }}
            formatter={(v) => [Number(v).toFixed(2), '']}
            labelFormatter={(label) => `T = ${Number(label).toFixed(1)}°C`}
          />

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

          {/* Process line: O → M → S → R */}
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

          {/* Process line: M → S extended to ADP */}
          <Scatter
            data={[
              { tdb: psychro.mixed.tdb, w: psychro.mixed.w * 1000 },
              { tdb: psychro.adp.tdb, w: psychro.adp.w * 1000 },
            ]}
            line={{ stroke: 'var(--blue)', strokeWidth: 1, strokeDasharray: '3 3' }}
            shape={() => <></>}
            legendType="none"
            isAnimationActive={false}
          />

          {/* State points */}
          <Scatter
            data={statePoints}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={6} fill={payload.color} stroke="#fff" strokeWidth={1.5} />
                  <text
                    x={cx + 9}
                    y={cy + 3}
                    fontSize={11}
                    fontWeight={700}
                    fill={payload.color}
                  >
                    {payload.name}
                  </text>
                </g>
              );
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pointColor(label: string): string {
  switch (label) {
    case 'O': return '#c05010'; // outdoor — orange
    case 'M': return '#7a96b8'; // mixed — gray
    case 'S': return '#1f6fd4'; // supply — blue
    case 'R': return '#0f6e3a'; // room — green
    case 'ADP': return '#1a3a6b'; // ADP — navy
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
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
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
