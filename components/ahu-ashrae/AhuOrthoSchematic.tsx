'use client';

import React from 'react';

export type AhuOrthoView = 'side' | 'front' | 'top';

export interface OrthoSection {
  id: string;
  label: string;
  color: string;
  /** Width along the air path in metres */
  width: number;
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
}

// All dimension lines and labels work in millimetres. The SVG viewBox uses mm
// directly, so 1 unit = 1 mm and dimension callouts are simple integers.
const PAD_MM = 220;          // viewBox padding around the AHU footprint
const DIM_OFFSET = 80;       // distance from box edge to dim line
const DIM_TICK = 14;         // extension tick length
const FONT_PX_AT_VB = 56;    // text height in mm at the viewBox scale

export function AhuOrthoSchematic({ sections, heightM = 1.2, depthM = 1.2, view, weightKg }: Props) {
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
  const depthMm = Math.round(depthM * 1000);

  // Decide planar dimensions based on view
  // side : x = total width, y = height (looking along Z)
  // front: x = depth,       y = height (looking along X)
  // top  : x = total width, y = depth  (looking down Y)
  const planX = view === 'front' ? depthMm : totalWmm;
  const planY = view === 'top' ? depthMm : heightMm;

  // viewBox: [pad-extra-left, pad-extra-top, content+pads]
  // extra space at bottom/right for dim chains
  const extraBottom = view === 'front' ? PAD_MM + 240 : PAD_MM + 360;
  const extraRight = PAD_MM + 380;
  const vbW = planX + PAD_MM + extraRight;
  const vbH = planY + PAD_MM + extraBottom;
  const vbX = -PAD_MM;
  const vbY = -PAD_MM;

  // Title block coordinates
  const titleX = planX + 60;
  const titleY = -PAD_MM + 60;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Background grid (light) */}
      <defs>
        <pattern id="ahu-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e3e9f1" strokeWidth="2" />
        </pattern>
        <marker id="ahu-arrow" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="14" markerHeight="14" orient="auto">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="#324560" />
        </marker>
      </defs>
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#ahu-grid)" />

      {/* The AHU body — always at origin; planar Y is flipped because SVG y grows down */}
      {view === 'side' && (
        <SideOrTopBody sections={sections} widthsMm={widthsMm} planY={planY} mode="side" />
      )}
      {view === 'top' && (
        <SideOrTopBody sections={sections} widthsMm={widthsMm} planY={planY} mode="top" />
      )}
      {view === 'front' && (
        <FrontBody depthMm={depthMm} heightMm={heightMm} />
      )}

      {/* ── Dimension chains ── */}
      {(view === 'side' || view === 'top') && (
        <>
          <DimChain
            anchorY={planY + DIM_OFFSET}
            segments={widthsMm.map((w, i) => ({ length: w, label: `${w}`, sub: sections[i].label }))}
            startX={0}
          />
          <DimLineHoriz
            y={planY + DIM_OFFSET + 200}
            x1={0}
            x2={planX}
            label={`სრული სიგრძე — ${planX} mm`}
          />
        </>
      )}

      {/* Vertical dim — height (side/front) or depth (top) */}
      <DimLineVert
        x={planX + DIM_OFFSET}
        y1={0}
        y2={planY}
        label={view === 'top' ? `D = ${depthMm} mm` : `H = ${heightMm} mm`}
      />

      {/* Front-view extra horizontal dim — depth */}
      {view === 'front' && (
        <DimLineHoriz
          y={planY + DIM_OFFSET}
          x1={0}
          x2={depthMm}
          label={`D = ${depthMm} mm`}
        />
      )}

      {/* Title block — view name + summary */}
      <TitleBlock
        x={titleX}
        y={titleY}
        view={view}
        totalWmm={totalWmm}
        heightMm={heightMm}
        depthMm={depthMm}
        sectionCount={sections.length}
        weightKg={weightKg}
      />
    </svg>
  );
}

// ─── Sub-renderers ───────────────────────────────────────────────────────────

function SideOrTopBody({
  sections, widthsMm, planY, mode,
}: {
  sections: OrthoSection[];
  widthsMm: number[];
  planY: number;
  mode: 'side' | 'top';
}) {
  let acc = 0;
  return (
    <g>
      {sections.map((s, i) => {
        const x = acc;
        const w = widthsMm[i];
        acc += w;
        return (
          <g key={s.id}>
            <rect
              x={x}
              y={0}
              width={w}
              height={planY}
              fill={s.color}
              stroke="#1a2a4a"
              strokeWidth={3}
            />
            {/* Section number */}
            <text
              x={x + w / 2}
              y={planY / 2 - 30}
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
              y={planY / 2 + 50}
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

function TitleBlock({
  x, y, view, totalWmm, heightMm, depthMm, sectionCount, weightKg,
}: {
  x: number;
  y: number;
  view: AhuOrthoView;
  totalWmm: number;
  heightMm: number;
  depthMm: number;
  sectionCount: number;
  weightKg?: number;
}) {
  const W = 1100;
  const H = 400;
  const viewLabel: Record<AhuOrthoView, string> = {
    side: 'გვერდხედი (side view)',
    front: 'წინხედი (front view)',
    top: 'ზედხედი (top view)',
  };
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={W}
        height={H}
        fill="#ffffff"
        stroke="#0e1a32"
        strokeWidth={3}
      />
      <text x={x + 24} y={y + 60} fontSize={FONT_PX_AT_VB * 0.85} fontWeight={700} fill="#0e1a32">
        {viewLabel[view]}
      </text>
      <line x1={x} y1={y + 90} x2={x + W} y2={y + 90} stroke="#0e1a32" strokeWidth={2} />
      <text x={x + 24} y={y + 140} fontSize={FONT_PX_AT_VB * 0.65} fill="#34465a">
        L × H × D
      </text>
      <text x={x + 24} y={y + 200} fontSize={FONT_PX_AT_VB * 0.85} fontWeight={700} fill="#0e1a32">
        {totalWmm} × {heightMm} × {depthMm} mm
      </text>
      <text x={x + 24} y={y + 270} fontSize={FONT_PX_AT_VB * 0.65} fill="#34465a">
        სექციათა რაოდ. — {sectionCount}
      </text>
      {weightKg != null && (
        <text x={x + 24} y={y + 350} fontSize={FONT_PX_AT_VB * 0.85} fontWeight={700} fill="#0e1a32">
          წონა — {Math.round(weightKg)} kg
        </text>
      )}
    </g>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}
