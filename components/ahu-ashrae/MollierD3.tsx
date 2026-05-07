'use client';

import React, {
  useRef, useState, useMemo, useEffect, useCallback,
} from 'react';
import * as d3 from 'd3';
import { Download, RotateCcw } from 'lucide-react';
import type { ChainResult } from '@/lib/ahu-ashrae/chain';
import {
  satW, enthalpy, dewPoint, rhFromDbW,
} from '@/lib/ahu-ashrae/psychrometrics';
import {
  satCurvePoints, rhCurvePoints, isothermSegment, wetBulbSegment, specVolPts,
  type IdPt,
} from '@/lib/ahu-ashrae/mollier-geometry';

// ─── Chart dimensions ─────────────────────────────────────────────────────────
const SVG_W = 900;
const SVG_H = 540;
const M = { top: 24, right: 44, bottom: 52, left: 60 } as const;
const IW = SVG_W - M.left - M.right; // 796
const IH = SVG_H - M.top - M.bottom; // 464

const D_DOM: [number, number] = [0, 30];    // g/kg
const H_DOM: [number, number] = [-10, 130]; // kJ/kg

const ISO_TEMPS = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const RH_VALS   = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const WB_TEMPS  = [0, 5, 10, 15, 20, 25, 30];
const SVOL_VALS = [0.78, 0.80, 0.82, 0.84, 0.86, 0.88, 0.90, 0.92];
const X_TICKS   = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const Y_TICKS   = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];

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
  cx: number; cy: number; // plot coords (for crosshair)
  d: number; h: number;
  T: number; rh: number; tdp: number;
}

export interface MollierD3Props {
  chain?: ChainResult;
  pressure?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const zoomGRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const afRef   = useRef(0);

  const [zt,    setZt]    = useState(() => d3.zoomIdentity);
  const [hover, setHover] = useState<HoverData | null>(null);

  // ── Base scales (constant) ────────────────────────────────────────────────
  const xS = useMemo(() => d3.scaleLinear().domain(D_DOM).range([0, IW]), []);
  const yS = useMemo(() => d3.scaleLinear().domain(H_DOM).range([IH, 0]), []);

  // ── Zoomed scales (for axis ticks, updated on zoom) ───────────────────────
  const xZ = useMemo(() => zt.rescaleX(xS), [zt, xS]);
  const yZ = useMemo(() => zt.rescaleY(yS), [zt, yS]);

  // ── Line generator (base scale — zoom group handles transform) ────────────
  const ln = useMemo(() => makeLine(xS, yS), [xS, yS]);

  // ── Static paths (pressure-dependent only) ────────────────────────────────
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

  const svPaths = useMemo(
    () => SVOL_VALS.map((v) => ({ v, d: ln(specVolPts(v, pressure)) ?? '' })),
    [ln, pressure],
  );

  // ── Fixed labels (inside zoom group, move with chart) ─────────────────────
  const isoLabels = useMemo(
    () =>
      ISO_TEMPS.map((T) => {
        const h0 = enthalpy(T, 0);
        if (h0 < H_DOM[0] - 2 || h0 > H_DOM[1] + 2) return null;
        return { T, x: xS(0) + 3, y: yS(h0) };
      }),
    [xS, yS],
  );

  const rhLabels = useMemo(() => {
    const T_lbl = 36;
    return [10, 20, 40, 60, 80, 90].map((rh) => {
      const w = satW(T_lbl, pressure) * (rh / 100);
      const d = w * 1000;
      if (d > 30 || d < 0) return null;
      return { rh, x: xS(d) + 3, y: yS(enthalpy(T_lbl, w)) };
    });
  }, [xS, yS, pressure]);

  const wbLabels = useMemo(
    () =>
      WB_TEMPS.map((Twb) => {
        const wSat = satW(Twb, pressure);
        const dSat = Math.min(wSat * 1000, 30);
        if (dSat <= 0) return null;
        const hSat = enthalpy(Twb, wSat);
        const slope = (4.186 * Twb) / 1000;
        const h0 = hSat - slope * dSat;
        const y = yS(h0);
        if (y < -5 || y > IH + 5) return null;
        return { Twb, x: xS(0) + 3, y: y + 10 };
      }),
    [xS, yS, pressure],
  );

  // ── D3 zoom setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !zoomGRef.current) return;
    const svg = d3.select(svgRef.current);
    const g   = d3.select(zoomGRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 14])
      .translateExtent([[-300, -150], [SVG_W + 300, SVG_H + 150]])
      .on('zoom', (e) => {
        g.attr('transform', e.transform.toString());
        setZt(e.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);
    svg.on('dblclick.zoom', () =>
      svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity),
    );
    return () => { svg.on('.zoom', null); };
  }, []);

  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  // ── Hover ─────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      cancelAnimationFrame(afRef.current);
      afRef.current = requestAnimationFrame(() => {
        const rect = svgRef.current!.getBoundingClientRect();
        // Scale factor: SVG viewBox vs rendered size
        const scaleX = SVG_W / rect.width;
        const scaleY = SVG_H / rect.height;
        const plotX = (e.clientX - rect.left) * scaleX - M.left;
        const plotY = (e.clientY - rect.top)  * scaleY - M.top;

        // Invert zoom transform to get base-scale coords
        const [invX, invY] = zt.invert([plotX, plotY]);
        const d = xS.invert(invX);
        const h = yS.invert(invY);

        if (d < -0.5 || d > 31 || h < -12 || h > 132) {
          setHover(null);
          return;
        }
        const w = Math.max(0, d) / 1000;
        // Invert i = 1.006·T + w·(2501 + 1.86·T)  →  T = (i − 2501·w) / (1.006 + 1.86·w)
        const T   = (h - 2501 * w) / (1.006 + 1.86 * w);
        const rh  = rhFromDbW(T, w, pressure);
        const tdp = dewPoint(w, pressure);
        setHover({ cx: plotX, cy: plotY, d, h, T, rh, tdp });
      });
    },
    [zt, xS, yS, pressure],
  );

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(afRef.current);
    setHover(null);
  }, []);

  // ── SVG export ────────────────────────────────────────────────────────────
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
    Object.assign(document.createElement('a'), {
      href: url, download: 'mollier.svg',
    }).click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, []);

  // ── Process arrows + state points ─────────────────────────────────────────
  const processLayer = useMemo(() => {
    if (!chain || chain.states.length < 1) return null;
    const ARR = 8, ARR_W = 4;
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
          const nx = -uy * 16, ny = ux * 16;
          const qLabel =
            st.energy != null && Math.abs(st.energy) >= 0.05
              ? `${st.energy > 0 ? '+' : ''}${st.energy.toFixed(1)} kW`
              : '';
          return (
            <g key={st.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth={2.5} opacity={0.9} />
              {len > 6 && (
                <polygon fill={color}
                  points={`${x2},${y2} ${x2 - ux * ARR + uy * ARR_W},${y2 - uy * ARR - ux * ARR_W} ${x2 - ux * ARR - uy * ARR_W},${y2 - uy * ARR + ux * ARR_W}`} />
              )}
              {qLabel && (
                <g>
                  <rect x={mx + nx - 27} y={my + ny - 7} width={54} height={12}
                    rx={3} fill={color} opacity={0.15} />
                  <text x={mx + nx} y={my + ny + 2} fontSize={8.5} textAnchor="middle"
                    fontWeight={700} fill={color}>
                    {qLabel}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {chain.states.map((st, i) => {
          const d  = st.state.w * 1000;
          const h  = st.state.h;
          const cx = xS(d), cy = yS(h);
          const color = secColor(st.sectionType, i);

          // Dew-point vertical indicator
          const tdp  = dewPoint(st.state.w, pressure);
          const hDp  = enthalpy(tdp, st.state.w);
          const cyDp = yS(hDp);

          // Label position: alternate sides
          const side   = i % 2 === 0 ? 1 : -1;
          const ax     = cx + side * 15;
          const anchor = side > 0 ? 'start' : 'end';

          return (
            <g key={st.id}>
              {cy > cyDp + 6 && (
                <>
                  <line x1={cx} y1={cy} x2={cx} y2={cyDp}
                    stroke={color} strokeWidth={0.9}
                    strokeDasharray="3 3" opacity={0.4} />
                  <circle cx={cx} cy={cyDp} r={2.5}
                    fill="none" stroke={color} strokeWidth={1.2} opacity={0.6} />
                </>
              )}
              <circle cx={cx} cy={cy} r={7}
                fill={color} stroke="white" strokeWidth={2} />
              <text x={cx} y={cy + 0.5} fontSize={9.5} textAnchor="middle"
                dominantBaseline="middle" fontWeight={700} fill="white">
                {i}
              </text>
              <text x={ax} y={cy - 27} fontSize={10.5} fontWeight={700}
                textAnchor={anchor} fill={color}>
                {st.state.tdb.toFixed(1)}°C
              </text>
              <text x={ax} y={cy - 16} fontSize={9} textAnchor={anchor} fill="#2d5a9e">
                φ {(st.state.rh * 100).toFixed(0)}%
              </text>
              <text x={ax} y={cy - 5} fontSize={8.5} textAnchor={anchor} fill="#334a5a" opacity={0.8}>
                i {h.toFixed(1)} kJ/kg
              </text>
              <text x={ax} y={cy + 6} fontSize={8} textAnchor={anchor} fill="#0f6e3a">
                wb {st.state.twb.toFixed(1)}°C
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [chain, xS, yS, pressure]);

  // ── Hover tooltip (SVG group) ─────────────────────────────────────────────
  const tooltipEl = useMemo(() => {
    if (!hover) return null;
    const ttW = 172, ttH = 66;
    const ttX = hover.cx + 10 + (hover.cx > IW - 190 ? -(ttW + 20) : 0);
    const ttY = hover.cy - 72  + (hover.cy < 80      ? 80           : 0);
    return (
      <g transform={`translate(${M.left + ttX},${M.top + ttY})`}
        style={{ pointerEvents: 'none' }}>
        <rect width={ttW} height={ttH} rx={5}
          fill="white" stroke="#cbd5e1" strokeWidth={1} opacity={0.96}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.12))' }} />
        <text x={10} y={18} fontSize={10.5} fontWeight={700} fill="#1e293b">
          {hover.T.toFixed(1)}°C  ·  φ {hover.rh.toFixed(0)}%
        </text>
        <text x={10} y={32} fontSize={9.5} fill="#475569">
          d = {hover.d.toFixed(2)} g/kg
        </text>
        <text x={10} y={44} fontSize={9.5} fill="#475569">
          i = {hover.h.toFixed(1)} kJ/kg
        </text>
        <text x={10} y={56} fontSize={9.5} fill="#0f6e3a">
          T_dp = {hover.tdp.toFixed(1)}°C
        </text>
      </g>
    );
  }, [hover]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--bdr)', color: 'var(--text-2)', background: 'var(--sur)' }}
        >
          <Download size={11} /> SVG
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--bdr)', color: 'var(--text-2)', background: 'var(--sur)' }}
        >
          <RotateCcw size={11} /> Reset zoom
        </button>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-3)' }}>
          scroll → zoom · drag → pan · dblclick → reset
        </span>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', userSelect: 'none', cursor: 'crosshair' }}
      >
        <defs>
          <clipPath id={CLIP_ID}>
            <rect x={0} y={0} width={IW} height={IH} />
          </clipPath>
        </defs>

        <g transform={`translate(${M.left},${M.top})`}>
          {/* ── Clipped chart area ── */}
          <g clipPath={`url(#${CLIP_ID})`}>

            {/* Zoom group — D3 sets transform on this element */}
            <g ref={zoomGRef}>
              {/* Background fill */}
              <rect x={0} y={0} width={IW} height={IH} fill="#f8fafc" />

              {/* Grid */}
              {X_TICKS.map((d) => (
                <line key={d} x1={xS(d)} y1={0} x2={xS(d)} y2={IH}
                  stroke="#e2e8f0" strokeWidth={0.4} />
              ))}
              {Y_TICKS.map((h) => (
                <line key={h} x1={0} y1={yS(h)} x2={IW} y2={yS(h)}
                  stroke="#e2e8f0" strokeWidth={0.4} />
              ))}

              {/* Specific volume lines */}
              {svPaths.map(({ v, d }) => d && (
                <path key={v} d={d} fill="none"
                  stroke="#94a3b8" strokeWidth={0.55} strokeDasharray="4 6" opacity={0.3} />
              ))}

              {/* Wet-bulb lines */}
              {wbPaths.map(({ Twb, d }) => d && (
                <path key={Twb} d={d} fill="none"
                  stroke="#34d399" strokeWidth={0.75} strokeDasharray="5 4" opacity={0.5} />
              ))}

              {/* Isotherms */}
              {isoPaths.map(({ T, d }) => d && (
                <path key={T} d={d} fill="none"
                  stroke={T === 0 ? '#2d4870' : '#7a96b8'}
                  strokeWidth={T === 0 ? 1.5 : 0.8}
                  strokeDasharray={T < 0 ? '4 3' : '0'}
                  opacity={0.75}
                />
              ))}

              {/* RH curves */}
              {rhPaths.map(({ rh, d }) => d && (
                <path key={rh} d={d} fill="none"
                  stroke="#3b82f6" strokeWidth={0.85}
                  strokeDasharray="4 2" opacity={0.55} />
              ))}

              {/* Saturation curve */}
              <path d={satPath} fill="none" stroke="#1d4ed8" strokeWidth={2.8} />

              {/* Isotherm labels */}
              {isoLabels.map((lbl) => lbl && (
                <text key={lbl.T} x={lbl.x} y={lbl.y - 4}
                  fontSize={9} fill="#4a5e7a" opacity={0.85}>
                  {lbl.T > 0 ? `+${lbl.T}` : lbl.T}°C
                </text>
              ))}

              {/* RH labels */}
              {rhLabels.map((lbl) => lbl && (
                <text key={lbl.rh} x={lbl.x} y={lbl.y - 3}
                  fontSize={8.5} fill="#1d4ed8" opacity={0.7}>
                  {lbl.rh}%
                </text>
              ))}

              {/* Wet-bulb labels */}
              {wbLabels.map((lbl) => lbl && (
                <text key={lbl.Twb} x={lbl.x} y={lbl.y}
                  fontSize={8} fill="#059669" opacity={0.6}>
                  wb {lbl.Twb}°
                </text>
              ))}

              {/* Spec-vol labels (rightmost visible tick) */}
              {svPaths.map(({ v, d: path }) => {
                if (!path) return null;
                const pts = specVolPts(v, pressure);
                if (!pts.length) return null;
                const last = pts[pts.length - 1];
                if (last.d < 0 || last.d > 30) return null;
                return (
                  <text key={v} x={xS(last.d) - 2} y={yS(last.h) - 4}
                    fontSize={7.5} fill="#64748b" opacity={0.5} textAnchor="end">
                    {v}
                  </text>
                );
              })}

              {/* Process layer */}
              {processLayer}
            </g>

            {/* Crosshair (outside zoom group — stays at cursor pos) */}
            {hover && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={hover.cx} y1={0} x2={hover.cx} y2={IH}
                  stroke="#0f172a" strokeWidth={0.8}
                  strokeDasharray="3 3" opacity={0.55} />
                <line x1={0} y1={hover.cy} x2={IW} y2={hover.cy}
                  stroke="#0f172a" strokeWidth={0.8}
                  strokeDasharray="3 3" opacity={0.55} />
                <circle cx={hover.cx} cy={hover.cy} r={3.5}
                  fill="#0f172a" opacity={0.8} />
              </g>
            )}

            {/* Invisible hover listener */}
            <rect x={0} y={0} width={IW} height={IH}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </g>

          {/* ── X axis (updates on zoom) ── */}
          {X_TICKS.map((d) => {
            const x = xZ(d);
            if (x < -4 || x > IW + 4) return null;
            return (
              <g key={d} transform={`translate(${x},${IH})`}>
                <line y2={5} stroke="#94a3b8" strokeWidth={0.8} />
                <text y={17} textAnchor="middle" fontSize={9.5} fill="#64748b">{d}</text>
              </g>
            );
          })}

          {/* ── Y axis (updates on zoom) ── */}
          {Y_TICKS.map((h) => {
            const y = yZ(h);
            if (y < -4 || y > IH + 4) return null;
            return (
              <g key={h} transform={`translate(0,${y})`}>
                <line x2={-5} stroke="#94a3b8" strokeWidth={0.8} />
                <text x={-8} textAnchor="end" dominantBaseline="middle"
                  fontSize={9.5} fill="#64748b">{h}</text>
              </g>
            );
          })}

          {/* Chart border */}
          <rect x={0} y={0} width={IW} height={IH}
            fill="none" stroke="#cbd5e1" strokeWidth={1} />

          {/* Axis labels */}
          <text x={IW / 2} y={IH + 44} textAnchor="middle"
            fontSize={11.5} fill="#475569" fontWeight={600}>
            Humidity ratio  d  (g/kg)
          </text>
          <text
            transform={`translate(-46,${IH / 2}) rotate(-90)`}
            textAnchor="middle" fontSize={11.5} fill="#475569" fontWeight={600}>
            Specific enthalpy  i  (kJ/kg dry air)
          </text>

          {/* Hover tooltip (SVG group, above everything) */}
          {tooltipEl}
        </g>
      </svg>
    </div>
  );
}
