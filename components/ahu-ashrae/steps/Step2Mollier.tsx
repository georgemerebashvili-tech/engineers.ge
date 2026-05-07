'use client';

/**
 * i-d (Mollier) Psychrometric Diagram
 * Axes: x = d (humidity ratio, g/kg), y = i (specific enthalpy, kJ/kg)
 * Rectangular coordinate version of the Mollier h-x chart, standard in
 * German/Georgian HVAC practice.
 *
 * Lines displayed:
 *  – Saturation curve (100% RH) — blue thick
 *  – Isotherms (T=const, straight lines in d-h space)
 *  – Constant RH curves (10–90%)
 *  – Constant wet-bulb lines (nearly horizontal, slight +slope)
 *  – Constant enthalpy reference lines (horizontal dashes)
 *
 * State annotations include: T_db, φ, d, h, T_wb, T_dp
 * Dew-point indicator: vertical dashed line from state → saturation curve
 * Wet-bulb indicator: oblique dashed line from state → saturation curve
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, Scatter, XAxis, YAxis, CartesianGrid,
  ComposedChart, useXAxisScale, useYAxisScale,
} from 'recharts';
import { Droplets } from 'lucide-react';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';

// ─── Psychrometrics ──────────────────────────────────────────────────────────

/** Saturation vapour pressure [kPa], Magnus formula */
function pWs(T: number): number {
  return T >= 0
    ? 0.61078 * Math.exp(17.2694 * T / (T + 237.29))
    : 0.61078 * Math.exp(21.8746 * T / (T + 265.49));
}

/** Saturation humidity ratio [g/kg dry air] */
function dSat(T: number, P: number): number {
  const ps = pWs(T);
  return ps >= P ? 999 : 622 * ps / (P - ps);
}

/** Specific enthalpy [kJ/kg dry air], d in g/kg */
function ih(T: number, d: number): number {
  return 1.006 * T + d * (2.501 + 0.00186 * T);
}

/** Dew-point temperature [°C] from humidity ratio d [g/kg] */
function dewPt(d: number, P: number): number {
  let T = d > 8 ? 10 : d > 2 ? 0 : -15;
  for (let i = 0; i < 50; i++) {
    const dT = 0.01;
    const f = dSat(T, P) - d;
    const df = (dSat(T + dT, P) - dSat(T - dT, P)) / (2 * dT);
    if (!df) break;
    T -= f / df;
    if (Math.abs(f / (df || 1)) < 0.0001) break;
  }
  return T;
}

// ─── Curve generators ────────────────────────────────────────────────────────

type Pt = { d: number; h: number };
const D_MAX = 30;    // g/kg chart upper limit
const H_MIN = -10;   // kJ/kg lower limit
const H_MAX = 130;   // kJ/kg upper limit

function genSatCurve(P: number): Pt[] {
  const pts: Pt[] = [];
  for (let T = -15; T <= 62; T += 0.4) {
    const d = dSat(T, P);
    if (d < 0 || d > D_MAX + 1) continue;
    pts.push({ d, h: ih(T, d) });
  }
  return pts;
}

function genRhCurve(rh: number, P: number): Pt[] {
  const pts: Pt[] = [];
  for (let T = -15; T <= 60; T++) {
    const d = (rh / 100) * dSat(T, P);
    if (d < -0.05 || d > D_MAX + 0.5) continue;
    const dc = Math.max(0, d);
    pts.push({ d: dc, h: ih(T, dc) });
  }
  return pts;
}

function genIsotherm(T: number, P: number): Pt[] {
  const dEnd = Math.min(dSat(T, P), D_MAX);
  if (dEnd <= 0) return [];
  return [{ d: 0, h: ih(T, 0) }, { d: dEnd, h: ih(T, dEnd) }];
}

function genWetBulbLine(Twb: number, P: number): Pt[] {
  // h = h_sat(Twb) + (d − d_sat(Twb)) × cp_liq × Twb/1000
  // slope ≈ +4.186 × Twb / 1000 kJ/kg per g/kg (positive, near-horizontal)
  const ds = Math.min(dSat(Twb, P), D_MAX);
  if (ds < 0) return [];
  const hs = ih(Twb, ds);
  const slope = 4.186 * Twb / 1000;
  return [
    { d: 0,  h: hs - slope * ds },
    { d: ds, h: hs },
  ];
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function sectionColor(type?: string): string {
  switch (type) {
    case 'preheat': case 'reheat': return '#c2410c';
    case 'cooling_coil':  return '#1d4ed8';
    case 'humidifier':    return '#0891b2';
    case 'heat_recovery': return '#7c3aed';
    case 'fan':           return '#64748b';
    case 'mixing_box':    return '#059669';
    default:              return '#94a3b8';
  }
}

function stateColor(i: number, type?: string) {
  return i === 0 ? '#c05010' : sectionColor(type);
}

// ─── SVG layers (must be defined BEFORE MollierChart — Turbopack hoisting) ──

function IsothermLabels({ temps, P }: { temps: number[]; P: number }) {
  const xS = useXAxisScale();
  const yS = useYAxisScale();
  if (!xS || !yS) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {temps.map((T) => {
        const h0 = ih(T, 0);
        if (h0 < H_MIN || h0 > H_MAX) return null;
        const cx = (xS(0) ?? 0) + 5;
        const cy = yS(h0) ?? 0;
        return (
          <text key={T} x={cx} y={cy - 3} fontSize={9} fill="#4a5e7a" opacity={0.85}>
            {T > 0 ? `+${T}` : T}°C
          </text>
        );
      })}
    </g>
  );
}

function RhCurveLabels({ rhs, P }: { rhs: number[]; P: number }) {
  const xS = useXAxisScale();
  const yS = useYAxisScale();
  if (!xS || !yS) return null;
  const T_label = 36; // temperature at which to place the label
  return (
    <g style={{ pointerEvents: 'none' }}>
      {rhs.map((rh) => {
        const d = (rh / 100) * dSat(T_label, P);
        if (d > D_MAX || d < 0) return null;
        const h = ih(T_label, d);
        if (h > H_MAX) return null;
        return (
          <text key={rh}
            x={(xS(d) ?? 0) + 3} y={(yS(h) ?? 0) - 3}
            fontSize={8.5} fill="#1565c0" opacity={0.75}>
            {rh}%
          </text>
        );
      })}
    </g>
  );
}

function WetBulbLabels({ twbs, P }: { twbs: number[]; P: number }) {
  const xS = useXAxisScale();
  const yS = useYAxisScale();
  if (!xS || !yS) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {twbs.map((Twb) => {
        const ds = Math.min(dSat(Twb, P), D_MAX);
        if (ds < 0) return null;
        const hs = ih(Twb, ds);
        const slope = 4.186 * Twb / 1000;
        const h0 = hs - slope * ds;
        if (h0 < H_MIN || h0 > H_MAX) return null;
        return (
          <text key={Twb}
            x={(xS(0) ?? 0) + 5} y={(yS(h0) ?? 0) + 10}
            fontSize={8} fill="#0f6e3a" opacity={0.60}>
            wb {Twb}°
          </text>
        );
      })}
    </g>
  );
}

function MollierSegmentLayer({ chain }: { chain: ChainResult }) {
  const xS = useXAxisScale();
  const yS = useYAxisScale();
  if (!xS || !yS || chain.states.length < 2) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {chain.states.slice(1).map((st, i) => {
        const prev = chain.states[i];
        const x1 = xS(prev.state.w * 1000) ?? 0;
        const y1 = yS(prev.state.h) ?? 0;
        const x2 = xS(st.state.w  * 1000) ?? 0;
        const y2 = yS(st.state.h)  ?? 0;
        const color = sectionColor(st.sectionType);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const A = 8, W = 4;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const px = -uy * 14, py = ux * 14;
        const qLabel = st.energy != null && Math.abs(st.energy) >= 0.05
          ? `${st.energy > 0 ? '+' : ''}${st.energy.toFixed(1)} kW` : '';
        return (
          <g key={st.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={2.5} />
            {len > 5 && (
              <polygon fill={color}
                points={`${x2},${y2} ${x2 - ux*A + uy*W},${y2 - uy*A - ux*W} ${x2 - ux*A - uy*W},${y2 - uy*A + ux*W}`}
              />
            )}
            {qLabel && (
              <g>
                <rect x={mx+px-24} y={my+py-8} width={48} height={13}
                  rx={3} fill={color} opacity={0.18} />
                <text x={mx+px} y={my+py+2} fontSize={9} textAnchor="middle"
                  fontWeight={700} fill={color}>{qLabel}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function MollierStateLayer({ chain, P }: { chain: ChainResult; P: number }) {
  const xS = useXAxisScale();
  const yS = useYAxisScale();
  if (!xS || !yS) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {chain.states.map((st, i) => {
        const d  = st.state.w * 1000;
        const h  = st.state.h;
        const cx = xS(d) ?? 0;
        const cy = yS(h) ?? 0;
        const color = stateColor(i, st.sectionType);

        // Dew-point indicator: vertical line → saturation curve at same d
        const dp    = dewPt(d, P);
        const h_dp  = ih(dp, d);
        const cy_dp = yS(h_dp) ?? 0;

        // Wet-bulb indicator: oblique line → saturation point at Twb
        const Twb   = st.state.twb;
        const d_wb  = Math.min(dSat(Twb, P), D_MAX);
        const h_wb  = ih(Twb, d_wb);
        const cx_wb = xS(d_wb) ?? 0;
        const cy_wb = yS(h_wb) ?? 0;

        // Alternate annotation side to reduce overlaps
        const side = i % 2 === 0 ? 1 : -1;
        const ax = cx + side * 12;
        const anchor = side > 0 ? 'start' : 'end';

        return (
          <g key={st.id}>
            {/* Dew-point vertical dashed line */}
            <line x1={cx} y1={cy} x2={cx} y2={cy_dp}
              stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
            {/* Dew-point dot on saturation curve */}
            <circle cx={cx} cy={cy_dp} r={3} fill="none"
              stroke={color} strokeWidth={1.5} opacity={0.7} />
            {/* T_dp label at bottom */}
            <text x={cx + 4} y={cy_dp + 3} fontSize={8} fill={color} opacity={0.75}>
              Tdp {dp.toFixed(1)}°C
            </text>

            {/* Wet-bulb indicator line */}
            <line x1={cx} y1={cy} x2={cx_wb} y2={cy_wb}
              stroke="#0f6e3a" strokeWidth={1} strokeDasharray="3 4" opacity={0.4} />
            <circle cx={cx_wb} cy={cy_wb} r={3}
              fill="#0f6e3a" opacity={0.55} />

            {/* State point circle */}
            <circle cx={cx} cy={cy} r={6.5}
              fill={color} stroke="#fff" strokeWidth={1.5} />
            <text x={cx} y={cy + 0.5} fontSize={9} textAnchor="middle"
              dominantBaseline="middle" fontWeight={700} fill="white">
              {i}
            </text>

            {/* Annotation block */}
            <text x={ax} y={cy - 24} fontSize={10.5} fontWeight={700}
              textAnchor={anchor} fill={color}>
              {st.state.tdb.toFixed(1)}°C
            </text>
            <text x={ax} y={cy - 13} fontSize={9} textAnchor={anchor} fill="#2d5a9e">
              φ {(st.state.rh * 100).toFixed(0)}%
            </text>
            <text x={ax} y={cy - 2} fontSize={8.5} textAnchor={anchor} fill="#334a5a">
              i {h.toFixed(1)} kJ/kg
            </text>
            <text x={ax} y={cy + 8} fontSize={8} textAnchor={anchor} fill="#0f6e3a">
              Twb {Twb.toFixed(1)}°C
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Main chart ───────────────────────────────────────────────────────────────

const ISO_TEMPS = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const RH_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const WB_VALUES = [0, 5, 10, 15, 20, 25, 30];
const H_TICKS   = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
const D_TICKS   = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const H_GRIDLINES = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];

interface ChartProps {
  chain?: ChainResult;
  pressure: number;
}

function MollierChartInner({ chain, pressure }: ChartProps) {
  const P = pressure;

  const satPts   = useMemo(() => genSatCurve(P), [P]);
  const rhCurves = useMemo(() => RH_VALUES.map((rh) => ({ rh, pts: genRhCurve(rh, P) })), [P]);
  const isoLines = useMemo(() => ISO_TEMPS.map((T)  => ({ T,  pts: genIsotherm(T, P) })), [P]);
  const wbLines  = useMemo(() => WB_VALUES.map((Twb) => ({ Twb, pts: genWetBulbLine(Twb, P) })), [P]);

  return (
    <div style={{ width: '100%', height: 540 }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 20, right: 30, left: 5, bottom: 30 }}>
          <CartesianGrid stroke="var(--bdr)" strokeDasharray="2 5" strokeOpacity={0.6} />

          <XAxis
            dataKey="d" type="number" domain={[0, D_MAX]} ticks={D_TICKS}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Humidity ratio  d (g/kg)', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--text-2)' }}
          />
          <YAxis
            dataKey="h" type="number" domain={[H_MIN, H_MAX]} ticks={H_TICKS}
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            label={{ value: 'Enthalpy  i (kJ/kg)', angle: -90, position: 'insideLeft', offset: 18, fontSize: 11, fill: 'var(--text-2)' }}
          />

          {/* ── Enthalpy reference lines (horizontal) ── */}
          {H_GRIDLINES.map((h) => (
            <Scatter key={`hg-${h}`}
              data={[{ d: 0, h }, { d: D_MAX, h }]}
              line={{ stroke: '#a07020', strokeWidth: 0.45, strokeDasharray: '10 5' }}
              shape={() => <></>} legendType="none" isAnimationActive={false} />
          ))}

          {/* ── Wet-bulb lines ── */}
          {wbLines.map(({ Twb, pts }) => (
            <Scatter key={`wb-${Twb}`} data={pts}
              line={{ stroke: '#0f6e3a', strokeWidth: 0.8, strokeDasharray: '6 3' }}
              shape={() => <></>} legendType="none" isAnimationActive={false} />
          ))}

          {/* ── Isotherms ── */}
          {isoLines.map(({ T, pts }) => (
            <Scatter key={`iso-${T}`} data={pts}
              line={{
                stroke: T === 0 ? '#2d4870' : '#7a96b8',
                strokeWidth: T === 0 ? 1.3 : 0.75,
                strokeDasharray: T < 0 ? '4 3' : '0',
              }}
              shape={() => <></>} legendType="none" isAnimationActive={false} />
          ))}

          {/* ── Constant RH curves ── */}
          {rhCurves.map(({ rh, pts }) => (
            <Scatter key={`rh-${rh}`} data={pts}
              line={{ stroke: '#1565c0', strokeWidth: 0.75, strokeDasharray: '3 2' }}
              shape={() => <></>} legendType="none" isAnimationActive={false} />
          ))}

          {/* ── Saturation curve (100% RH) ── */}
          <Scatter data={satPts}
            line={{ stroke: '#1565c0', strokeWidth: 2.5 }}
            shape={() => <></>} legendType="none" isAnimationActive={false} />

          {/* ── Labels (SVG layers via hooks) ── */}
          <IsothermLabels temps={ISO_TEMPS} P={P} />
          <RhCurveLabels  rhs={RH_VALUES}   P={P} />
          <WetBulbLabels  twbs={WB_VALUES}  P={P} />

          {/* ── AHU process ── */}
          {chain && (
            <MollierSegmentLayer
              key={`seg-${chain.states.length}`}
              chain={chain}
            />
          )}
          {chain && (
            <MollierStateLayer
              key={`st-${chain.states.length}`}
              chain={chain}
              P={P}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── State table ──────────────────────────────────────────────────────────────

function StateTable({ chain, P }: { chain: ChainResult; P: number }) {
  return (
    <div
      className="rounded-xl border overflow-hidden mt-5"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr)' }}
    >
      <div className="px-4 py-2.5 border-b flex items-center gap-2"
           style={{ borderColor: 'var(--bdr)', background: 'var(--sur-2)' }}>
        <Droplets size={13} style={{ color: 'var(--blue)' }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--navy)' }}>
          i-d ცხრილი — ჯაჭვის წერტილები
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--sur-2)' }}>
              {['•', 'State', 'სექცია', 'T_db °C', 'T_wb °C', 'T_dp °C',
                'd g/kg', 'i kJ/kg', 'φ %', 'ΔP Pa', 'Q kW'].map((h) => (
                <th key={h} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: 'var(--text-3)', textAlign: h === '•' ? 'center' : 'right',
                             whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chain.states.map((st, i) => {
              const d   = st.state.w * 1000;
              const dp  = dewPt(d, P);
              const color = stateColor(i, st.sectionType);
              return (
                <tr key={st.id} className="border-t" style={{ borderColor: 'var(--bdr)' }}>
                  <td className="px-2.5 py-1.5 text-center">
                    <span className="inline-block w-2 h-2 rounded-full"
                          style={{ background: color }} />
                  </td>
                  <td className="px-2.5 py-1.5 font-mono font-bold"
                      style={{ color }}>s{i}</td>
                  <td className="px-2.5 py-1.5 max-w-[120px] truncate"
                      style={{ color: 'var(--text-2)' }}>{st.label}</td>
                  <Num v={st.state.tdb.toFixed(2)} />
                  <Num v={st.state.twb.toFixed(2)} />
                  <Num v={dp.toFixed(2)} color="#0f6e3a" />
                  <Num v={d.toFixed(2)} />
                  <Num v={st.state.h.toFixed(2)} color="var(--navy)" bold />
                  <Num v={(st.state.rh * 100).toFixed(1)} />
                  <Num v={st.deltaP != null ? st.deltaP.toFixed(0) : '—'} />
                  <Num v={st.energy != null ? `${st.energy > 0 ? '+' : ''}${st.energy.toFixed(2)}` : '—'}
                       color={st.energy == null ? undefined : st.energy < 0 ? '#1d4ed8' : '#c2410c'} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Num({ v, color, bold }: { v: string; color?: string; bold?: boolean }) {
  return (
    <td className={`px-2.5 py-1.5 text-right font-mono ${bold ? 'font-bold' : ''}`}
        style={{ color: color ?? 'var(--text)' }}>
      {v}
    </td>
  );
}

// ─── Chart legend ─────────────────────────────────────────────────────────────

function ChartLegend() {
  const items = [
    { color: '#1565c0', dash: false,   thick: true,  label: 'Saturation curve (100% RH)' },
    { color: '#1565c0', dash: true,    thick: false, label: 'RH = const (10–90%)' },
    { color: '#4a5e7a', dash: false,   thick: false, label: 'T = const (isotherms)' },
    { color: '#0f6e3a', dash: true,    thick: false, label: 'Twb = const (wet-bulb lines)' },
    { color: '#a07020', dash: true,    thick: false, label: 'i = const (enthalpy lines)' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px]">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <svg width="22" height="8">
            <line x1="0" y1="4" x2="22" y2="4"
              stroke={it.color}
              strokeWidth={it.thick ? 2 : 1.2}
              strokeDasharray={it.dash ? '4 2' : '0'} />
          </svg>
          <span style={{ color: 'var(--text-2)' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props {
  chain?: ChainResult;
  pressure: number;
}

export function MollierView({ chain, pressure }: Props) {
  return (
    <div>
      <MollierChartInner chain={chain} pressure={pressure} />
      <ChartLegend />
      {chain && chain.states.length >= 2 && (
        <StateTable chain={chain} P={pressure} />
      )}
    </div>
  );
}
