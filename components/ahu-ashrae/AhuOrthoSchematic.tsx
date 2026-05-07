'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

export type AhuOrthoView = 'side' | 'front' | 'top';

export interface OrthoSection {
  id: string;
  label: string;
  color: string;
  /** Width along the air path in metres */
  width: number;
  /** Section type — used to draw schematic symbols */
  type?: string;
  /** Process state at the outlet of this section (side view annotations) */
  outletTdb?: number;   // °C
  outletRh?: number;    // 0..1
  outletW?: number;     // kg/kg
  energyKw?: number;    // net kW: positive = heating, negative = cooling
  deltaP?: number;      // Pa — pressure drop across this section
}

interface Props {
  sections: OrthoSection[];
  /** AHU casing height (m) — default 1.2 */
  heightM?: number;
  /** AHU casing depth (m) — default 1.2 */
  depthM?: number;
  view: AhuOrthoView;
  /** Estimated total AHU weight (kg) for the title block */
  weightKg?: number;
  /** Inlet (outdoor) air state for process annotations */
  inletState?: { tdb: number; rh: number; w: number };
}

// All dimension lines and labels work in millimetres. The SVG viewBox uses mm
// directly, so 1 unit = 1 mm and dimension callouts are simple integers.
const PAD_MM = 220;          // viewBox padding around the AHU footprint
const DIM_OFFSET = 80;       // distance from box edge to dim line
const DIM_TICK = 14;         // extension tick length
const FONT_PX_AT_VB = 56;    // text height in mm at the viewBox scale

const VIEW_LABEL: Record<AhuOrthoView, string> = {
  side:  'გვერდხედი',
  front: 'წინხედი',
  top:   'ზედხედი',
};

export function AhuOrthoSchematic({ sections, heightM = 1.2, depthM = 1.2, view, weightKg, inletState }: Props) {
  // ── zoom / pan ─────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; x0: number; y0: number; px0: number; py0: number }>({
    active: false, x0: 0, y0: 0, px0: 0, py0: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampZoom = (z: number) => Math.max(0.25, Math.min(8, z));

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => clampZoom(z * factor));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { active: true, x0: e.clientX, y0: e.clientY, px0: pan.x, py0: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active) return;
    setPan({ x: drag.current.px0 + e.clientX - drag.current.x0, y: drag.current.py0 + e.clientY - drag.current.y0 });
  };
  const onMouseUp = () => { drag.current.active = false; };

  const fitView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  // ── computed dims ───────────────────────────────────────────────────────────
  if (sections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs"
           style={{ color: 'var(--text-3)' }}>
        არცერთი სექცია არ არის ჩართული
      </div>
    );
  }

  const widthsMm = sections.map((s) => Math.round(s.width * 1000));
  const totalWmm = widthsMm.reduce((a, b) => a + b, 0);
  const heightMm = Math.round(heightM * 1000);
  const depthMm  = Math.round(depthM  * 1000);
  const planX = view === 'front' ? depthMm  : totalWmm;
  const planY = view === 'top'   ? depthMm  : heightMm;

  const extraBottom = view === 'front' ? PAD_MM + 240 : PAD_MM + 360;
  const extraRight  = PAD_MM + 120;
  const vbW = planX + PAD_MM + extraRight;
  const vbH = planY + PAD_MM + extraBottom;
  const vbX = -PAD_MM;
  const vbY = -PAD_MM;

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full select-none"
      style={{ background: '#f7f9fc' }}
    >
      {/* ── Info bar (was title block) ────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-1.5 border-b text-[11px] font-mono shrink-0"
        style={{ background: 'var(--sur)', borderColor: 'var(--bdr)', color: 'var(--text-2)' }}
      >
        <span className="font-bold text-[10px] uppercase tracking-wider" style={{ color: 'var(--navy)' }}>
          {VIEW_LABEL[view]}
        </span>
        <span>L = <strong>{totalWmm}</strong> mm</span>
        <span>H = <strong>{heightMm}</strong> mm</span>
        <span>D = <strong>{depthMm}</strong> mm</span>
        <span>სექც. <strong>{sections.length}</strong></span>
        {weightKg != null && <span>წ. <strong>{Math.round(weightKg)}</strong> kg</span>}

        {/* Zoom controls (right-aligned) */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] opacity-60 mr-1">{Math.round(zoom * 100)}%</span>
          <IconBtn title="Zoom in (+)" onClick={() => setZoom((z) => clampZoom(z * 1.25))}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="5" y1="2.5" x2="5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2.5" y1="5" x2="7.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="8" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </IconBtn>
          <IconBtn title="Zoom out (-)" onClick={() => setZoom((z) => clampZoom(z * 0.8))}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="2.5" y1="5" x2="7.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="8" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </IconBtn>
          <IconBtn title="Fit to view" onClick={fitView}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="1,4 1,1 4,1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="8,1 11,1 11,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="11,8 11,11 8,11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="4,11 1,11 1,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </IconBtn>
          <IconBtn title="სრული ეკრანი" onClick={toggleFullscreen}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="1,3.5 1,1 3.5,1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="8.5,1 11,1 11,3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="11,8.5 11,11 8.5,11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="3.5,11 1,11 1,8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3"/>
            </svg>
          </IconBtn>
        </div>
      </div>

      {/* ── Pannable / zoomable SVG area ─────────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden relative"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: drag.current.active ? 'grabbing' : 'grab' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '50% 50%',
            transition: drag.current.active ? 'none' : 'transform 0.08s ease-out',
          }}
        >
          <svg
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              <pattern id="ahu-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e3e9f1" strokeWidth="2" />
              </pattern>
              <marker id="ahu-arrow" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="14" markerHeight="14" orient="auto">
                <path d="M 0 0 L 12 6 L 0 12 z" fill="#324560" />
              </marker>
            </defs>
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#ahu-grid)" />

            {view === 'side'  && <SideOrTopBody sections={sections} widthsMm={widthsMm} planY={planY} mode="side" inletState={inletState} />}
            {view === 'top'   && <SideOrTopBody sections={sections} widthsMm={widthsMm} planY={planY} mode="top" />}
            {view === 'front' && <FrontBody depthMm={depthMm} heightMm={heightMm} />}

            {(view === 'side' || view === 'top') && (
              <>
                <DimChain
                  anchorY={planY + DIM_OFFSET}
                  segments={widthsMm.map((w, i) => ({ length: w, label: `${w}`, sub: sections[i].label }))}
                  startX={0}
                />
                <DimLineHoriz y={planY + DIM_OFFSET + 200} x1={0} x2={planX} label={`სრული სიგრძე — ${planX} mm`} />
              </>
            )}

            <DimLineVert
              x={planX + DIM_OFFSET}
              y1={0}
              y2={planY}
              label={view === 'top' ? `D = ${depthMm} mm` : `H = ${heightMm} mm`}
            />

            {view === 'front' && (
              <DimLineHoriz y={planY + DIM_OFFSET} x1={0} x2={depthMm} label={`D = ${depthMm} mm`} />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center w-6 h-6 rounded border transition-colors"
      style={{ background: 'var(--sur)', borderColor: 'var(--bdr-2)', color: 'var(--text-2)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-lt)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--sur)')}
    >
      {children}
    </button>
  );
}

// ─── Sub-renderers ───────────────────────────────────────────────────────────

// ─── Process State Annotations ────────────────────────────────────────────────
// Rendered above the AHU box (using PAD_MM=220 of negative-y space).
// Layout (y-axis, box top = 0, upward = negative):
//   y = 0     : state point circle (r=20)
//   y = -55   : T value baseline
//   y = -113  : φ value baseline
//   y = -168  : W value baseline
// All within vbY = -220. Energy Q badges rendered inside the box by SideOrTopBody.

function ProcessStateLayer({
  sections, widthsMm, inletState,
}: {
  sections: OrthoSection[];
  widthsMm: number[];
  inletState?: { tdb: number; rh: number; w: number };
}) {
  const FS = 46;
  const FSSub = 38;
  const LH = 58;
  const CR = 20;

  type StatePoint = { x: number; tdb: number; rh: number; w: number; label: number; isInlet: boolean };

  // Pre-compute left edges of each section
  const leftX: number[] = [];
  let totalW = 0;
  for (let i = 0; i < sections.length; i++) {
    leftX[i] = totalW;
    totalW += widthsMm[i];
  }

  const pts: StatePoint[] = [];

  // Inlet: placed to the left of the first section
  if (inletState) {
    const indent = Math.min(100, (widthsMm[0] ?? 300) * 0.35);
    pts.push({ x: -indent, ...inletState, label: 0, isInlet: true });
  }

  // Each section's outlet: centered within that section's box
  sections.forEach((s, i) => {
    if (s.outletTdb != null && s.outletRh != null && s.outletW != null) {
      pts.push({
        x: leftX[i] + widthsMm[i] / 2,
        tdb: s.outletTdb, rh: s.outletRh, w: s.outletW,
        label: pts.length,
        isInlet: false,
      });
    }
  });

  if (pts.length === 0) return null;

  return (
    <g>
      <line x1={-30} y1={0} x2={totalW + 30} y2={0}
        stroke="#1565c0" strokeWidth={1.5} strokeOpacity={0.2} />

      {pts.map((pt, pi) => {
        const prev = pi > 0 ? pts[pi - 1] : null;
        const dT = prev ? pt.tdb - prev.tdb : null;
        const tFill = dT == null ? '#0e1a32'
          : dT < -0.15 ? '#1d4ed8'
          : dT > 0.15 ? '#c2410c'
          : '#334a5a';
        return (
          <g key={pi}>
            <line x1={pt.x} y1={-CR} x2={pt.x} y2={-(LH * 2 + FS + 30)}
              stroke={pt.isInlet ? '#1565c0' : '#5a6e8a'}
              strokeWidth={pt.isInlet ? 2.5 : 1.8}
              strokeDasharray={pt.isInlet ? undefined : '15 8'}
              strokeOpacity={0.45}
            />
            <circle cx={pt.x} cy={0} r={CR}
              fill={pt.isInlet ? '#1565c0' : '#2d4870'}
              stroke="#f0f4fa" strokeWidth={3} />
            <text x={pt.x} y={CR * 0.4}
              fontSize={CR} fontWeight={700}
              textAnchor="middle" dominantBaseline="middle" fill="white">
              {pt.label}
            </text>
            <text x={pt.x} y={-55}
              fontSize={FS} fontWeight={700} textAnchor="middle" fill={tFill}>
              {pt.tdb.toFixed(1)}°C
            </text>
            <text x={pt.x} y={-55 - LH}
              fontSize={FSSub} fontWeight={600} textAnchor="middle" fill="#2d5a9e">
              φ {(pt.rh * 100).toFixed(0)}%
            </text>
            <text x={pt.x} y={-55 - LH * 2}
              fontSize={FSSub * 0.85} fontWeight={500} textAnchor="middle"
              fill="#324560" opacity={0.72}>
              {(pt.w * 1000).toFixed(1)} g/kg
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Section types that change air temperature (show ΔT annotation)
const T_CHANGING_TYPES = new Set([
  'cooling_coil', 'preheat', 'reheat', 'heat_recovery', 'fan', 'mixing_box',
]);
// Section types that change air moisture (show ΔW annotation)
const W_CHANGING_TYPES = new Set(['humidifier', 'cooling_coil', 'mixing_box']);

function SideOrTopBody({
  sections, widthsMm, planY, mode, inletState,
}: {
  sections: OrthoSection[];
  widthsMm: number[];
  planY: number;
  mode: 'side' | 'top';
  inletState?: { tdb: number; rh: number; w: number };
}) {
  // Pre-compute the inlet state for each section (= previous section's outlet)
  const prevStates: Array<{ tdb: number; rh: number; w: number } | null> = [];
  {
    let last: { tdb: number; rh: number; w: number } | null = inletState ?? null;
    for (const s of sections) {
      prevStates.push(last);
      if (s.outletTdb != null && s.outletRh != null && s.outletW != null) {
        last = { tdb: s.outletTdb, rh: s.outletRh, w: s.outletW };
      }
    }
  }

  const ANN_FS = FONT_PX_AT_VB * 0.56;
  const ANN_LH = 60;

  let acc = 0;
  return (
    <g>
      {sections.map((s, i) => {
        const x = acc;
        const w = widthsMm[i];
        acc += w;
        const symHalf = Math.min(w * 0.36, planY * 0.30, 370);
        const prev = prevStates[i];
        const stype = s.type ?? '';

        // Build per-section annotation lines (side view only)
        type AnnLine = { text: string; color: string; bold?: boolean };
        const annLines: AnnLine[] = [];

        if (mode === 'side') {
          // ΔP — every section
          if (s.deltaP != null) {
            annLines.push({ text: `ΔP ${Math.round(s.deltaP)} Pa`, color: '#4a5e7a' });
          }

          // Q energy — thermally active sections
          if (s.energyKw != null && Math.abs(s.energyKw) >= 0.05) {
            const sign = s.energyKw > 0 ? '+' : '';
            annLines.push({
              text: `Q ${sign}${s.energyKw.toFixed(1)} kW`,
              color: s.energyKw > 0 ? '#c2410c' : '#1d4ed8',
              bold: true,
            });
          }

          // ΔT — only for T-changing sections
          if (T_CHANGING_TYPES.has(stype) && s.outletTdb != null && prev != null) {
            const dT = s.outletTdb - prev.tdb;
            if (Math.abs(dT) >= 0.1) {
              const sign = dT >= 0 ? '+' : '';
              annLines.push({
                text: `ΔT ${sign}${dT.toFixed(1)}°C`,
                color: dT > 0 ? '#b45309' : '#1e40af',
              });
            }
          }

          // ΔW — only for moisture-changing sections
          if (W_CHANGING_TYPES.has(stype) && s.outletW != null && prev != null) {
            const dW = (s.outletW - prev.w) * 1000; // g/kg
            if (Math.abs(dW) >= 0.05) {
              const sign = dW >= 0 ? '+' : '';
              annLines.push({
                text: `ΔW ${sign}${dW.toFixed(1)} g/kg`,
                color: '#0369a1',
              });
            }
          }
        }

        return (
          <g key={s.id}>
            <rect x={x} y={0} width={w} height={planY}
              fill={s.color} stroke="#1a2a4a" strokeWidth={3} />

            {/* Schematic symbol (side view only) */}
            {mode === 'side' && s.type && (
              <SectionSymbol
                type={s.type}
                cx={x + w / 2}
                cy={planY * 0.40}
                sw={symHalf}
                sh={symHalf}
              />
            )}

            {/* Process annotations — bottom-anchored above section number */}
            {mode === 'side' && annLines.map((line, li) => {
              const lineY = planY - 195 - (annLines.length - 1 - li) * ANN_LH;
              return (
                <text key={li}
                  x={x + w / 2}
                  y={lineY}
                  fontSize={ANN_FS}
                  fontWeight={line.bold ? 700 : 600}
                  textAnchor="middle"
                  fill={line.color}
                  opacity={0.9}
                >
                  {line.text}
                </text>
              );
            })}

            {/* Section number */}
            <text
              x={x + w / 2}
              y={mode === 'side' ? planY - 160 : planY / 2 - 30}
              fontSize={FONT_PX_AT_VB}
              fontWeight={700}
              textAnchor="middle"
              fill="#0e1a32"
              opacity={0.85}
            >
              #{i + 1}
            </text>
            {/* Section short label */}
            <text
              x={x + w / 2}
              y={mode === 'side' ? planY - 88 : planY / 2 + 50}
              fontSize={FONT_PX_AT_VB * 0.7}
              textAnchor="middle"
              fill="#0e1a32"
              opacity={0.7}
            >
              {truncate(s.label, mode === 'side' ? 14 : 10)}
            </text>
          </g>
        );
      })}
      {/* Outer outline */}
      <rect x={0} y={0} width={acc} height={planY} fill="none" stroke="#0e1a32" strokeWidth={6} />
      {/* Process state annotations — side view only */}
      {mode === 'side' && (
        <ProcessStateLayer
          sections={sections}
          widthsMm={widthsMm}
          inletState={inletState}
        />
      )}
    </g>
  );
}

function FrontBody({ depthMm, heightMm }: { depthMm: number; heightMm: number }) {
  return (
    <g>
      <rect x={0} y={0} width={depthMm} height={heightMm} fill="#dbe5f3" stroke="#0e1a32" strokeWidth={6} />
      {/* Cross-pattern (face inlet diagonals) */}
      <line x1={0} y1={0} x2={depthMm} y2={heightMm} stroke="#0e1a32" strokeWidth={2} opacity={0.25} />
      <line x1={depthMm} y1={0} x2={0} y2={heightMm} stroke="#0e1a32" strokeWidth={2} opacity={0.25} />
      <text
        x={depthMm / 2}
        y={heightMm / 2}
        fontSize={FONT_PX_AT_VB * 1.2}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0e1a32"
        opacity={0.85}
      >
        წინხედი
      </text>
    </g>
  );
}

interface DimSegment {
  length: number; // mm
  label: string;  // e.g. "300"
  sub?: string;   // section label
}

function DimChain({
  anchorY, segments, startX,
}: {
  anchorY: number;
  segments: DimSegment[];
  startX: number;
}) {
  let acc = startX;
  return (
    <g stroke="#324560" strokeWidth={2}>
      {segments.map((seg, i) => {
        const x1 = acc;
        const x2 = acc + seg.length;
        acc = x2;
        return (
          <g key={i}>
            {/* Extension lines */}
            <line x1={x1} y1={anchorY - DIM_OFFSET} x2={x1} y2={anchorY + DIM_TICK} />
            {i === segments.length - 1 && (
              <line x1={x2} y1={anchorY - DIM_OFFSET} x2={x2} y2={anchorY + DIM_TICK} />
            )}
            {/* Dimension line with arrows */}
            <line
              x1={x1 + 6}
              y1={anchorY}
              x2={x2 - 6}
              y2={anchorY}
              markerStart="url(#ahu-arrow)"
              markerEnd="url(#ahu-arrow)"
            />
            {/* Numeric label */}
            <text
              x={(x1 + x2) / 2}
              y={anchorY - 16}
              fontSize={FONT_PX_AT_VB * 0.8}
              fontWeight={700}
              textAnchor="middle"
              fill="#0e1a32"
              stroke="none"
            >
              {seg.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function DimLineHoriz({
  y, x1, x2, label,
}: {
  y: number;
  x1: number;
  x2: number;
  label: string;
}) {
  return (
    <g stroke="#0e1a32" strokeWidth={2}>
      <line x1={x1} y1={y - DIM_OFFSET / 2} x2={x1} y2={y + DIM_TICK} />
      <line x1={x2} y1={y - DIM_OFFSET / 2} x2={x2} y2={y + DIM_TICK} />
      <line
        x1={x1 + 6}
        y1={y}
        x2={x2 - 6}
        y2={y}
        markerStart="url(#ahu-arrow)"
        markerEnd="url(#ahu-arrow)"
      />
      <text
        x={(x1 + x2) / 2}
        y={y + 70}
        fontSize={FONT_PX_AT_VB * 0.9}
        fontWeight={700}
        textAnchor="middle"
        fill="#0e1a32"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}

function DimLineVert({
  x, y1, y2, label,
}: {
  x: number;
  y1: number;
  y2: number;
  label: string;
}) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke="#0e1a32" strokeWidth={2}>
      <line x1={x - DIM_TICK} y1={y1} x2={x + DIM_OFFSET / 2} y2={y1} />
      <line x1={x - DIM_TICK} y1={y2} x2={x + DIM_OFFSET / 2} y2={y2} />
      <line
        x1={x}
        y1={y1 + 6}
        x2={x}
        y2={y2 - 6}
        markerStart="url(#ahu-arrow)"
        markerEnd="url(#ahu-arrow)"
      />
      <text
        x={x + 24}
        y={mid}
        fontSize={FONT_PX_AT_VB * 0.9}
        fontWeight={700}
        textAnchor="start"
        dominantBaseline="middle"
        fill="#0e1a32"
        stroke="none"
        transform={`rotate(-90 ${x + 24} ${mid})`}
      >
        {label}
      </text>
    </g>
  );
}


function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

// ─── Schematic symbols ────────────────────────────────────────────────────────
// Coordinate system: [-1, 1] × [-1, 1], centre (0,0).
// Uniform scale: sz = min(sw, sh) so symbols never distort.
// No markerEnd — arrowheads are inline polygons so they scale correctly.

/** Right-pointing arrowhead at (tx, ty) in normalised coords. */
function Arrowhead({ tx, ty, size = 0.11, color = '#34465a' }: { tx: number; ty: number; size?: number; color?: string }) {
  return (
    <polygon
      points={`${tx},${ty} ${tx - size},${ty - size * 0.5} ${tx - size},${ty + size * 0.5}`}
      fill={color}
      stroke="none"
    />
  );
}

/** Left-pointing arrowhead at (tx, ty). */
function ArrowheadL({ tx, ty, size = 0.11, color = '#34465a' }: { tx: number; ty: number; size?: number; color?: string }) {
  return (
    <polygon
      points={`${tx},${ty} ${tx + size},${ty - size * 0.5} ${tx + size},${ty + size * 0.5}`}
      fill={color}
      stroke="none"
    />
  );
}

function SectionSymbol({
  type, cx, cy, sw, sh,
}: {
  type: string;
  cx: number;
  cy: number;
  sw: number;
  sh: number;
}) {
  // Uniform (isotropic) scale so symbols stay square
  const sz = Math.min(sw, sh);
  const t = `translate(${cx} ${cy}) scale(${sz})`;
  const lw = 0.042; // normalised stroke-width (~5mm at sz=120)

  switch (type) {

    // ── Damper — 3 tilted blade cross-sections inside outline box ──────────
    case 'damper': return (
      <g transform={t} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {[- 0.5, 0, 0.5].map((oy, i) => (
          <rect key={i}
            x={-0.65} y={oy - 0.11}
            width={1.3} height={0.22}
            rx={0.04}
            fill="#34465a" fillOpacity={0.55}
            stroke="#1a2a4a" strokeWidth={lw * 0.6}
            transform={`rotate(-22, 0, ${oy})`}
          />
        ))}
        {/* Actuator stem */}
        <line x1={0} y1={-0.88} x2={0} y2={-1.18} stroke="#34465a" strokeWidth={lw} />
        <rect x={-0.12} y={-1.32} width={0.24} height={0.16} rx={0.04}
          fill="#34465a" fillOpacity={0.7} stroke="none" />
      </g>
    );

    // ── Filter — vertical media pack with zigzag pleats ────────────────────
    case 'filter': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {/* 5 pleated media columns */}
        {[-0.66, -0.33, 0, 0.33, 0.66].map((px, col) => {
          const pts = [];
          const rows = 7;
          for (let r = 0; r <= rows; r++) {
            const py = -0.72 + (1.44 / rows) * r;
            pts.push(`${px + (r % 2 === 0 ? -0.12 : 0.12)},${py}`);
          }
          return <polyline key={col} points={pts.join(' ')}
            stroke="#34465a" strokeWidth={lw * 1.1} strokeOpacity={0.8} />;
        })}
      </g>
    );

    // ── Coil (cooling) — serpentine pipe + vertical fins, blue ────────────
    case 'cooling_coil': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="#e8f4fb" fillOpacity={0.35} />
        {/* Vertical fins */}
        {Array.from({ length: 11 }).map((_, i) => {
          const px = -0.74 + (1.48 / 10) * i;
          return <line key={i} x1={px} y1={-0.74} x2={px} y2={0.62}
            stroke="#2d7dd2" strokeWidth={lw * 0.55} strokeOpacity={0.4} />;
        })}
        {/* 4 U-bend tube passes */}
        {[-0.62, -0.22, 0.18, 0.54].map((oy, i) => (
          <path key={i}
            d={`M -0.72 ${oy} Q 0 ${oy - 0.26} 0.72 ${oy}`}
            stroke="#2d7dd2" strokeWidth={lw * 1.7} />
        ))}
      </g>
    );

    // ── Coil (heating) — same shape, orange/red ───────────────────────────
    case 'preheat':
    case 'reheat': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="#fdf2ec" fillOpacity={0.35} />
        {Array.from({ length: 11 }).map((_, i) => {
          const px = -0.74 + (1.48 / 10) * i;
          return <line key={i} x1={px} y1={-0.74} x2={px} y2={0.62}
            stroke="#c84b11" strokeWidth={lw * 0.55} strokeOpacity={0.4} />;
        })}
        {[-0.62, -0.22, 0.18, 0.54].map((oy, i) => (
          <path key={i}
            d={`M -0.72 ${oy} Q 0 ${oy - 0.26} 0.72 ${oy}`}
            stroke="#c84b11" strokeWidth={lw * 1.7} />
        ))}
      </g>
    );

    // ── Heat recovery — plate pack with two opposing flow channels ─────────
    case 'heat_recovery': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {/* Corrugated plate pack (7 diagonal fins) */}
        {Array.from({ length: 7 }).map((_, i) => {
          const px = -0.66 + (1.32 / 6) * i;
          return <line key={i} x1={px} y1={-0.72} x2={px - 0.18} y2={0.72}
            stroke="#5a6e8a" strokeWidth={lw * 0.9} strokeOpacity={0.55} />;
        })}
        {/* Supply flow arrow (left→right, top channel) */}
        <line x1={-0.78} y1={-0.45} x2={0.62} y2={-0.45} stroke="#2d7dd2" strokeWidth={lw * 1.3} />
        <Arrowhead tx={0.74} ty={-0.45} size={0.12} color="#2d7dd2" />
        {/* Exhaust flow arrow (right→left, bottom channel) */}
        <line x1={0.78} y1={0.45} x2={-0.62} y2={0.45} stroke="#c84b11" strokeWidth={lw * 1.3} />
        <ArrowheadL tx={-0.74} ty={0.45} size={0.12} color="#c84b11" />
      </g>
    );

    // ── Mixing box — funnel shape with two inlets + one outlet ────────────
    case 'mixing_box': return (
      <g transform={t} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {/* Funnel outline */}
        <path d="M -0.78 -0.72 L -0.12 -0.08 L -0.12 0.08 L -0.78 0.72"
          stroke="#34465a" strokeWidth={lw * 1.2} />
        {/* Outlet duct */}
        <line x1={0.12} y1={0} x2={0.78} y2={0}
          stroke="#34465a" strokeWidth={lw * 1.2} />
        <Arrowhead tx={0.82} ty={0} size={0.12} color="#34465a" />
        {/* Two inlet arrows */}
        <line x1={-0.88} y1={-0.48} x2={-0.72} y2={-0.48} stroke="#34465a" strokeWidth={lw * 1.1} />
        <Arrowhead tx={-0.60} ty={-0.48} size={0.10} color="#34465a" />
        <line x1={-0.88} y1={0.48} x2={-0.72} y2={0.48} stroke="#34465a" strokeWidth={lw * 1.1} />
        <Arrowhead tx={-0.60} ty={0.48} size={0.10} color="#34465a" />
      </g>
    );

    // ── Fan — impeller circle with curved blades ───────────────────────────
    case 'fan': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {/* Outer casing circle */}
        <circle cx={0} cy={0} r={0.72} stroke="#34465a" strokeWidth={lw * 1.1} />
        {/* 7 backward-curved blades */}
        {Array.from({ length: 7 }).map((_, i) => {
          const a0 = (i / 7) * 2 * Math.PI;
          const a1 = a0 + 0.55;
          const r0 = 0.22, r1 = 0.62;
          const x0 = Math.cos(a0) * r0, y0 = Math.sin(a0) * r0;
          const xc = Math.cos(a0) * r1 * 0.6, yc = Math.sin(a0) * r1 * 0.6;
          const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1;
          return <path key={i} d={`M ${x0} ${y0} Q ${xc} ${yc} ${x1} ${y1}`}
            stroke="#34465a" strokeWidth={lw * 1.4} />;
        })}
        {/* Hub */}
        <circle cx={0} cy={0} r={0.18} fill="#34465a" />
        {/* Outlet nozzle (right) */}
        <line x1={0.72} y1={-0.22} x2={0.88} y2={-0.22} stroke="#34465a" strokeWidth={lw * 0.9} />
        <line x1={0.72} y1={0.22}  x2={0.88} y2={0.22}  stroke="#34465a" strokeWidth={lw * 0.9} />
        <Arrowhead tx={0.88} ty={0} size={0.12} color="#34465a" />
      </g>
    );

    // ── Humidifier — spray header + nozzle jets + droplets ────────────────
    case 'humidifier': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="#eaf6fb" fillOpacity={0.3} />
        {/* Header pipe */}
        <line x1={-0.68} y1={0.42} x2={0.68} y2={0.42} stroke="#2b8aad" strokeWidth={lw * 2} />
        {/* 5 upward spray nozzles */}
        {[-0.54, -0.27, 0, 0.27, 0.54].map((px) => (
          <g key={px}>
            <line x1={px} y1={0.42} x2={px - 0.14} y2={-0.12} stroke="#2b8aad" strokeWidth={lw * 0.9} />
            <line x1={px} y1={0.42} x2={px}        y2={-0.18} stroke="#2b8aad" strokeWidth={lw * 0.9} />
            <line x1={px} y1={0.42} x2={px + 0.14} y2={-0.12} stroke="#2b8aad" strokeWidth={lw * 0.9} />
          </g>
        ))}
        {/* Water droplets (teardrop shape) */}
        {[[-0.5, -0.5], [-0.18, -0.38], [0.18, -0.52], [0.5, -0.42]].map(([px, py], i) => (
          <path key={i}
            d={`M ${px} ${py - 0.13} C ${px - 0.07} ${py - 0.04} ${px - 0.07} ${py + 0.02} ${px} ${py + 0.06} C ${px + 0.07} ${py + 0.02} ${px + 0.07} ${py - 0.04} ${px} ${py - 0.13} Z`}
            fill="#2b8aad" fillOpacity={0.65} stroke="none" />
        ))}
      </g>
    );

    // ── Silencer — 3 absorptive baffles with air channels between ─────────
    case 'silencer': return (
      <g transform={t} strokeLinecap="round" fill="none">
        <rect x={-0.88} y={-0.88} width={1.76} height={1.76}
          stroke="#34465a" strokeWidth={lw} strokeOpacity={0.45}
          fill="white" fillOpacity={0.12} />
        {/* 3 absorptive baffles */}
        {[-0.52, 0, 0.52].map((oy, i) => (
          <rect key={i}
            x={-0.74} y={oy - 0.14}
            width={1.48} height={0.28}
            rx={0.04}
            fill="#7a8da0" fillOpacity={0.4}
            stroke="#34465a" strokeWidth={lw * 0.9} />
        ))}
        {/* Flow arrows in the air channels (not on baffles) */}
        {[-0.26, 0.26].map((oy) => (
          <React.Fragment key={oy}>
            <line x1={-0.74} y1={oy} x2={0.56} y2={oy}
              stroke="#34465a" strokeWidth={lw * 0.9} strokeOpacity={0.55} strokeDasharray="0.08 0.06" />
            <Arrowhead tx={0.66} ty={oy} size={0.10} color="#34465a" />
          </React.Fragment>
        ))}
      </g>
    );

    default: return null;
  }
}
