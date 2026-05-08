'use client';

import React, {
  useRef, useState, useMemo, useCallback,
} from 'react';
import * as d3 from 'd3';
import { Download, Eye, EyeOff } from 'lucide-react';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import {
  satW, enthalpy, dewPoint, rhFromDbW,
} from '@/lib/ahu-ashrae/psychrometrics';
import {
  satCurvePoints, rhCurvePoints, isothermSegment, wetBulbSegment,
  type IdPt,
} from '@/lib/ahu-ashrae/mollier-geometry';
import {
  COMFORT_OVERLAYS, getOverlay,
  type OverlayId,
} from '@/lib/ahu-ashrae/comfort-overlays';

// ─── Chart dimensions ─────────────────────────────────────────────────────────
const SVG_W = 920;
const SVG_H = 560;
const M = { top: 28, right: 24, bottom: 56, left: 72 } as const;
const IW = SVG_W - M.left - M.right;
const IH = SVG_H - M.top - M.bottom;

const D_DOM: [number, number] = [-0.3, 25];
const H_DOM: [number, number] = [-12, 95];

/** Clips dead zone — no HVAC process above this temperature */
const T_CLIP = 50;

const ISO_TEMPS       = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const ISO_LABEL_TEMPS = [-10, 0, 10, 20, 30, 40, 50];
const RH_VALS         = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const WB_TEMPS        = [5, 10, 15, 20, 25, 30];
const X_TICKS         = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const Y_TICKS         = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

// ─── Section colors ───────────────────────────────────────────────────────────
const SEC_COLORS: Record<string, string> = {
  preheat: '#c2410c', reheat: '#c2410c',
  cooling_coil: '#1d4ed8',
  humidifier: '#0891b2',
  heat_recovery: '#7c3aed',
  fan: '#64748b',
  mixing_box: '#059669',
};
function secColor(type?: string, idx?: number): string {
  if (idx === 0) return '#c05010';
  return type ? (SEC_COLORS[type] ?? '#94a3b8') : '#94a3b8';
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface HoverData {
  cx: number; cy: number;
  d: number; h: number;
  T: number; rh: number; tdp: number;
}
export interface MollierD3Props {
  chain?: ChainResult;
  pressure?: number;
}

// ─── Line generator factory ───────────────────────────────────────────────────
function makeLine(
  xS: d3.ScaleLinear<number, number>,
  yS: d3.ScaleLinear<number, number>,
) {
  return d3
    .line<IdPt>()
    .x((p) => xS(p.d))
    .y((p) => yS(p.h))
    .defined((p) => isFinite(p.d) && isFinite(p.h));
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MollierD3({ chain, pressure = 101.325 }: MollierD3Props) {
  const CLIP_ID = 'clip-mollier-d3';
  const svgRef  = useRef<SVGSVGElement>(null);
  const afRef   = useRef(0);

  const [hover, setHover] = useState<HoverData | null>(null);
  const [overlayId, setOverlayId] = useState<OverlayId>('none');

  // ── Scales ────────────────────────────────────────────────────────────────
  const xS = useMemo(() => d3.scaleLinear().domain(D_DOM).range([0, IW]), []);
  const yS = useMemo(() => d3.scaleLinear().domain(H_DOM).range([IH, 0]), []);
  const ln  = useMemo(() => makeLine(xS, yS), [xS, yS]);

  // ── Trapezoid clip (T=T_CLIP isotherm as upper boundary) ─────────────────
  // At d=0: h=enthalpy(50,0)≈50.3 kJ/kg  →  clips dead zone upper-left
  // At d=30: h=enthalpy(50,0.03)≈128 kJ/kg  →  near chart top
  const clipYL = Math.max(0, yS(enthalpy(T_CLIP, 0)));
  // Isotherm may exit the top of chart before reaching right edge — clamp to 0
  const clipYR = Math.max(0, yS(enthalpy(T_CLIP, D_DOM[1] / 1000)));
  const clipPts = `0,${IH} ${IW},${IH} ${IW},${clipYR.toFixed(1)} 0,${clipYL.toFixed(1)}`;

  // ── Static chart paths ────────────────────────────────────────────────────
  const satPath = useMemo(() => ln(satCurvePoints(pressure)) ?? '', [ln, pressure]);
  const rhPaths = useMemo(
    () => RH_VALS.map((rh) => ({ rh, d: ln(rhCurvePoints(rh, pressure)) ?? '' })),
    [ln, pressure],
  );
  const isoPaths = useMemo(
    () => ISO_TEMPS.map((T) => ({ T, d: ln(isothermSegment(T, pressure)) ?? '' })),
    [ln, pressure],
  );
  const wbPaths = useMemo(
    () => WB_TEMPS.map((Twb) => ({ Twb, d: ln(wetBulbSegment(Twb, pressure)) ?? '' })),
    [ln, pressure],
  );
  // ── Comfort overlay ───────────────────────────────────────────────────────
  const overlay = useMemo(() => getOverlay(overlayId), [overlayId]);

  // Convert (tdb [°C], w [g/kg]) → Mollier (d [g/kg], h [kJ/kg]) SVG points
  const toIdSvg = useCallback(
    (verts: { tdb: number; w: number }[]) =>
      verts
        .map((v) => `${xS(v.w).toFixed(1)},${yS(enthalpy(v.tdb, v.w / 1000)).toFixed(1)}`)
        .join(' '),
    [xS, yS],
  );

  const comfortEl = useMemo(() => {
    if (!overlay) return null;
    return (
      <g style={{ pointerEvents: 'none' }}>
        <polygon
          points={toIdSvg(overlay.vertices)}
          fill={overlay.fill}
          stroke={overlay.border}
          strokeWidth={1.4}
        />
        {overlay.zones?.map((z, i) => (
          <polygon
            key={i}
            points={toIdSvg(z.vertices)}
            fill={z.fill}
            stroke={z.border}
            strokeWidth={1}
          />
        ))}
      </g>
    );
  }, [overlay, toIdSvg]);

  // ── Isotherm labels — placed near saturation curve ───────────────────────
  const isoLabels = useMemo(
    () =>
      ISO_TEMPS.map((T) => {
        const dSat = satW(T, pressure) * 1000;
        const dEnd = Math.min(dSat, D_DOM[1] - 0.3) * 0.88;
        if (dEnd < 0) return null;
        const hEnd = enthalpy(T, dEnd / 1000);
        if (hEnd < H_DOM[0] || hEnd > H_DOM[1]) return null;
        return { T, x: xS(dEnd) - 2, y: yS(hEnd) - 4 };
      }),
    [xS, yS, pressure],
  );

  // ── RH labels — placed at T ≈ 28°C along each RH curve ─────────────────
  const rhLabels = useMemo(() => {
    const T_lbl = 28;
    return [20, 30, 40, 50, 60, 70, 80].map((rh) => {
      const w = satW(T_lbl, pressure) * (rh / 100);
      const d = w * 1000;
      if (d > D_DOM[1] - 0.5 || d < 0) return null;
      return { rh, x: xS(d) + 3, y: yS(enthalpy(T_lbl, w)) - 3 };
    });
  }, [xS, yS, pressure]);

  // ── Wet-bulb labels ───────────────────────────────────────────────────────
  const wbLabels = useMemo(
    () =>
      WB_TEMPS.map((Twb) => {
        const wSat = satW(Twb, pressure);
        const dSat = Math.min(wSat * 1000, 30);
        if (dSat <= 0) return null;
        const hSat  = enthalpy(Twb, wSat);
        const slope = (4.186 * Twb) / 1000;
        const h0    = hSat - slope * dSat;
        const y     = yS(h0);
        if (y < 4 || y > IH - 4) return null;
        return { Twb, x: xS(0) + 5, y: y + 9 };
      }),
    [xS, yS, pressure],
  );

  // ── Hover ─────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      cancelAnimationFrame(afRef.current);
      afRef.current = requestAnimationFrame(() => {
        const rect   = svgRef.current!.getBoundingClientRect();
        const scaleX = SVG_W / rect.width;
        const scaleY = SVG_H / rect.height;
        const plotX  = (e.clientX - rect.left) * scaleX - M.left;
        const plotY  = (e.clientY - rect.top)  * scaleY - M.top;
        const d = xS.invert(plotX);
        const h = yS.invert(plotY);
        if (d < -0.5 || d > 26 || h < -14 || h > 96) { setHover(null); return; }
        const w   = Math.max(0, d) / 1000;
        const T   = (h - 2501 * w) / (1.006 + 1.86 * w);
        // Don't show tooltip in clipped dead zone
        if (T > T_CLIP + 1) { setHover(null); return; }
        const rh  = rhFromDbW(T, w, pressure);
        const tdp = dewPoint(w, pressure);
        setHover({ cx: plotX, cy: plotY, d, h, T, rh, tdp });
      });
    },
    [xS, yS, pressure],
  );
  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(afRef.current);
    setHover(null);
  }, []);

  // ── SVG export ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = 'text{font-family:Inter,Arial,sans-serif}';
    clone.insertBefore(style, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml',
    });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'mollier.svg' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, []);

  // ── Process arrows ─────────────────────────────────────────────────────────
  const arrowLayer = useMemo(() => {
    if (!chain || chain.states.length < 2) return null;
    const A = 7, AW = 3.5;
    return (
      <g>
        {chain.states.slice(1).map((st, i) => {
          const prev  = chain.states[i];
          const x1 = xS(prev.state.w * 1000), y1 = yS(prev.state.h);
          const x2 = xS(st.state.w  * 1000), y2 = yS(st.state.h);
          const color = secColor(st.sectionType);
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const nx = -uy * 14, ny = ux * 14;
          const qLabel =
            st.energy != null && Math.abs(st.energy) >= 0.05
              ? `${st.energy > 0 ? '+' : ''}${st.energy.toFixed(1)} kW` : '';
          return (
            <g key={st.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth={2.2} opacity={0.85} />
              {len > 5 && (
                <polygon fill={color}
                  points={`${x2},${y2} ${x2-ux*A+uy*AW},${y2-uy*A-ux*AW} ${x2-ux*A-uy*AW},${y2-uy*A+ux*AW}`} />
              )}
              {qLabel && (
                <g>
                  <rect x={mx+nx-24} y={my+ny-7} width={48} height={12}
                    rx={3} fill={color} opacity={0.12} />
                  <text x={mx+nx} y={my+ny+2} fontSize={8} textAnchor="middle"
                    fontWeight={700} fill={color}>{qLabel}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  }, [chain, xS, yS]);

  // ── State circles ─────────────────────────────────────────────────────────
  const stateLayer = useMemo(() => {
    if (!chain || chain.states.length < 1) return null;
    return (
      <g>
        {chain.states.map((st, i) => {
          const cx    = xS(st.state.w * 1000);
          const cy    = yS(st.state.h);
          const color = secColor(st.sectionType, i);
          const above = i % 2 === 0;
          const labelY = above ? cy - 13 : cy + 19;
          return (
            <g key={st.id}>
              <circle cx={cx} cy={cy} r={9}  fill="white" opacity={0.9} />
              <circle cx={cx} cy={cy} r={7}  fill={color} stroke="white" strokeWidth={1.8} />
              <text x={cx} y={cy + 0.5} fontSize={8.5} textAnchor="middle"
                dominantBaseline="middle" fontWeight={700} fill="white">
                {i}
              </text>
              <text x={cx} y={labelY} fontSize={8.5} textAnchor="middle"
                fontWeight={600} stroke="white" strokeWidth={3}
                style={{ paintOrder: 'stroke' } as React.CSSProperties}>
                {st.state.tdb.toFixed(1)}°C
              </text>
              <text x={cx} y={labelY} fontSize={8.5} textAnchor="middle"
                fontWeight={600} fill={color}>
                {st.state.tdb.toFixed(1)}°C
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [chain, xS, yS]);

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  const tooltipEl = useMemo(() => {
    if (!hover) return null;
    const TW = 168, TH = 66;
    const ttX = hover.cx + 14 + (hover.cx > IW - 190 ? -(TW + 24) : 0);
    const ttY = hover.cy - 74 + (hover.cy < 84 ? 84 : 0);
    return (
      <g transform={`translate(${M.left + ttX},${M.top + ttY})`}
        style={{ pointerEvents: 'none' }}>
        <rect width={TW} height={TH} rx={5}
          fill="white" stroke="#cbd5e1" strokeWidth={1} opacity={0.97}
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.14))' } as React.CSSProperties} />
        <text x={10} y={18} fontSize={10} fontWeight={700} fill="#1e293b">
          {hover.T.toFixed(1)}°C · φ {hover.rh.toFixed(0)}%
        </text>
        <text x={10} y={32} fontSize={9} fill="#475569">d = {hover.d.toFixed(2)} g/kg</text>
        <text x={10} y={44} fontSize={9} fill="#475569">i = {hover.h.toFixed(1)} kJ/kg</text>
        <text x={10} y={57} fontSize={9} fill="#0f6e3a">T_dp = {hover.tdp.toFixed(1)}°C</text>
      </g>
    );
  }, [hover]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:opacity-75"
          style={{ borderColor: 'var(--bdr)', color: 'var(--text-2)', background: 'var(--sur)' }}>
          <Download size={11} /> SVG
        </button>

        {/* Comfort overlay selector */}
        <div className="flex items-center gap-1.5">
          {overlayId === 'none'
            ? <EyeOff size={11} style={{ color: 'var(--text-3)' }} />
            : <Eye size={11} style={{ color: 'var(--blue)' }} />}
          <select
            value={overlayId}
            onChange={(e) => setOverlayId(e.target.value as OverlayId)}
            className="text-[10px] font-medium rounded border px-2 py-1 outline-none"
            style={{ borderColor: 'var(--bdr)', background: 'var(--sur)', color: 'var(--text)' }}
          >
            <option value="none">No Comfort Overlay</option>
            {COMFORT_OVERLAYS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-3)' }}>
          hover → values
        </span>
      </div>

      {/* Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', userSelect: 'none', cursor: 'crosshair' }}
      >
        <defs>
          {/* Trapezoid clip: upper boundary = T_CLIP isotherm (eliminates dead zone) */}
          <clipPath id={CLIP_ID}>
            <polygon points={clipPts} />
          </clipPath>
        </defs>

        <g transform={`translate(${M.left},${M.top})`}>

          {/* ── Plot area (clipped to trapezoid) ────────────────────────── */}
          <g clipPath={`url(#${CLIP_ID})`}>
            {/* Background */}
            <rect x={0} y={0} width={IW} height={IH} fill="#ffffff" />

            {/* Grid — vertical (d) */}
            {X_TICKS.map((d) => (
              <line key={d} x1={xS(d)} y1={0} x2={xS(d)} y2={IH}
                stroke="#d4dde8" strokeWidth={0.5} />
            ))}
            {/* Enthalpy reference lines (i = const) — horizontal, slightly bolder */}
            {Y_TICKS.map((h) => (
              <line key={h} x1={0} y1={yS(h)} x2={IW} y2={yS(h)}
                stroke="#c8d5e2" strokeWidth={0.6} />
            ))}

            {/* Comfort overlay (below chart curves) */}
            {comfortEl}

            {/* Wet-bulb lines */}
            {wbPaths.map(({ Twb, d }) => d && (
              <path key={Twb} d={d} fill="none"
                stroke="#2e7d32" strokeWidth={0.7} strokeDasharray="4 5" opacity={0.4} />
            ))}

            {/* Isotherms */}
            {isoPaths.map(({ T, d }) => d && (
              <path key={T} d={d} fill="none"
                stroke={T === 0 ? '#1e3a5f' : '#4a6e96'}
                strokeWidth={T === 0 ? 1.6 : 0.95}
                strokeDasharray={T < 0 ? '5 3' : undefined}
                opacity={T === 0 ? 1 : 0.85}
              />
            ))}

            {/* RH curves — solid, not dashed */}
            {rhPaths.map(({ rh, d }) => d && (
              <path key={rh} d={d} fill="none"
                stroke="#1d4ed8" strokeWidth={rh === 90 ? 1.0 : 0.85}
                opacity={0.55} />
            ))}

            {/* Saturation curve */}
            <path d={satPath} fill="none" stroke="#1e3a5f" strokeWidth={2.8} />

            {/* ── Labels ── */}

            {/* Isotherm labels */}
            {isoLabels.map((lbl) => lbl && (
              <g key={lbl.T}>
                <text x={lbl.x} y={lbl.y} textAnchor="end" fontSize={9}
                  stroke="white" strokeWidth={3} strokeLinejoin="round"
                  fontWeight={700} fill="white" style={{ paintOrder: 'stroke' } as React.CSSProperties}>
                  {lbl.T > 0 ? `+${lbl.T}` : `${lbl.T}`}°
                </text>
                <text x={lbl.x} y={lbl.y} textAnchor="end" fontSize={9}
                  fontWeight={700} fill="#1e3a5f">
                  {lbl.T > 0 ? `+${lbl.T}` : `${lbl.T}`}°
                </text>
              </g>
            ))}

            {/* RH labels */}
            {rhLabels.map((lbl) => lbl && (
              <g key={lbl.rh}>
                <text x={lbl.x} y={lbl.y} fontSize={8.5}
                  stroke="white" strokeWidth={2.5} strokeLinejoin="round"
                  fontWeight={600} fill="white"
                  style={{ paintOrder: 'stroke' } as React.CSSProperties}>
                  {lbl.rh}%
                </text>
                <text x={lbl.x} y={lbl.y} fontSize={8.5}
                  fontWeight={600} fill="#1d4ed8" opacity={0.85}>
                  {lbl.rh}%
                </text>
              </g>
            ))}

            {/* Wet-bulb labels */}
            {wbLabels.map((lbl) => lbl && (
              <text key={lbl.Twb} x={lbl.x} y={lbl.y}
                fontSize={8} fill="#2e7d32" opacity={0.65} fontStyle="italic">
                {lbl.Twb}°wb
              </text>
            ))}

            {/* Process arrows */}
            {arrowLayer}
            {/* State circles */}
            {stateLayer}

            {/* Crosshair */}
            {hover && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={hover.cx} y1={0} x2={hover.cx} y2={IH}
                  stroke="#0f172a" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.45} />
                <line x1={0} y1={hover.cy} x2={IW} y2={hover.cy}
                  stroke="#0f172a" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.45} />
                <circle cx={hover.cx} cy={hover.cy} r={3}
                  fill="#0f172a" opacity={0.7} />
              </g>
            )}

            {/* Hover listener */}
            <rect x={0} y={0} width={IW} height={IH}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </g>

          {/* ── X axis ──────────────────────────────────────────────────── */}
          {X_TICKS.map((d) => {
            const x = xS(d);
            if (x < -4 || x > IW + 4) return null;
            return (
              <g key={d} transform={`translate(${x},${IH})`}>
                <line y2={5} stroke="#64748b" strokeWidth={0.9} />
                <text y={16} textAnchor="middle" fontSize={10} fill="#374151" fontWeight={500}>{d}</text>
              </g>
            );
          })}

          {/* ── Y axis ──────────────────────────────────────────────────── */}
          {Y_TICKS.map((h) => {
            const y = yS(h);
            if (y < -4 || y > IH + 4) return null;
            return (
              <g key={h} transform={`translate(0,${y})`}>
                <line x2={-5} stroke="#64748b" strokeWidth={0.9} />
                <text x={-9} textAnchor="end" dominantBaseline="middle"
                  fontSize={10} fill="#374151" fontWeight={500}>{h}</text>
              </g>
            );
          })}

          {/* Trapezoid chart border (matches clip boundary) */}
          <polygon
            points={`0,${clipYL.toFixed(1)} ${IW},${clipYR.toFixed(1)} ${IW},${IH} 0,${IH}`}
            fill="none" stroke="#94a3b8" strokeWidth={1.2}
          />

          {/* Axis labels */}
          <text x={IW / 2} y={IH + 46} textAnchor="middle"
            fontSize={12} fill="#1e293b" fontWeight={700}>
            Humidity ratio  d  (g/kg)
          </text>
          <text transform={`translate(-56,${IH / 2}) rotate(-90)`}
            textAnchor="middle" fontSize={12} fill="#1e293b" fontWeight={700}>
            Specific enthalpy  i  (kJ/kg dry air)
          </text>

          {/* Tooltip */}
          {tooltipEl}
        </g>
      </svg>

      {/* Comfort overlay legend */}
      {overlay && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px]"
          style={{ color: 'var(--text-3)' }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border"
              style={{ background: overlay.fill, borderColor: overlay.border }} />
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{overlay.label}</span>
            <span className="font-mono opacity-70">· {overlay.reference}</span>
          </div>
          {overlay.zones?.filter((z) => z.label).map((z, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm"
                style={{ background: z.fill, border: `1px solid ${z.border}` }} />
              <span>{z.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
