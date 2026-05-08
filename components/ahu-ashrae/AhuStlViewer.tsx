'use client';

import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { Eye, EyeOff, Upload, X, Box, RotateCcw, RotateCw } from 'lucide-react';
import type { SectionType } from '@/lib/ahu-ashrae/sections';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface AhuSection {
  id: string;
  label: string;
  color: string;
  width: number;       // m, along X (air path)
  type?: SectionType;  // resolves /public/ahu/stl/<type>.stl
  outletTdb?: number;
  outletRh?: number;
  outletW?: number;
  energyKw?: number;
  deltaP?: number;
}

interface Props {
  sections: AhuSection[];
  height?: number;  // m
  depth?: number;   // m
}

// ─── STL section mesh ─────────────────────────────────────────────────────────
// Loads STL from `url`. On 404 / error silently falls back to a shaded box.

interface StlMeshProps {
  url: string | null;
  color: string;
  position: [number, number, number];
  rotation: number; // radians, Y-axis
  width: number;
  height: number;
  depth: number;
}

function StlSectionMesh({ url, color, position, rotation, width, height, depth }: StlMeshProps) {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    setGeo(null);
    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (loaded) => {
        if (!alive.current) { loaded.dispose(); return; }
        loaded.computeVertexNormals();
        // Centre + uniform-scale to fit the section envelope
        loaded.computeBoundingBox();
        const bbox = loaded.boundingBox!;
        const centre = new THREE.Vector3();
        bbox.getCenter(centre);
        loaded.translate(-centre.x, -centre.y, -centre.z);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetMax = Math.max(width, height, depth);
        if (maxDim > 0) {
          const s = targetMax / maxDim;
          loaded.scale(s, s, s);
        }
        setGeo(loaded);
      },
      undefined,
      () => { /* silently keep box fallback */ },
    );

    return () => { alive.current = false; };
  }, [url, width, height, depth]);

  useEffect(() => () => { geo?.dispose(); }, [geo]);

  if (geo) {
    return (
      <mesh geometry={geo} position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.42} />
      </mesh>
    );
  }

  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} metalness={0.15} roughness={0.55} />
      <Edges color="#1a2a4a" lineWidth={1} />
    </mesh>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export function AhuStlViewer({ sections, height = 1.2, depth = 1.2 }: Props) {
  const [visibility, setVisibility]   = useState<Record<string, boolean>>({});
  const [rotations,  setRotations]    = useState<Record<string, number>>({});
  const [customStls, setCustomStls]   = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Keep visibility + rotation maps in sync as sections are added / removed
  useEffect(() => {
    setVisibility((prev) => {
      const next: Record<string, boolean> = {};
      sections.forEach((s) => { next[s.id] = prev[s.id] ?? true; });
      return next;
    });
    setRotations((prev) => {
      const next: Record<string, number> = {};
      sections.forEach((s) => { next[s.id] = prev[s.id] ?? 0; });
      return next;
    });
  }, [sections]);

  // Revoke all blob URLs on unmount
  const customStlsRef = useRef(customStls);
  customStlsRef.current = customStls;
  useEffect(() => () => {
    Object.values(customStlsRef.current).forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const totalW = useMemo(() => sections.reduce((s, x) => s + x.width, 0), [sections]);

  const cumOffsets = useMemo(() => {
    const out: number[] = [];
    let acc = -totalW / 2;
    for (const s of sections) { out.push(acc + s.width / 2); acc += s.width; }
    return out;
  }, [sections, totalW]);

  const toggleVisibility = useCallback((id: string) => {
    setVisibility((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const showAll = useCallback(() => {
    setVisibility(Object.fromEntries(sections.map((s) => [s.id, true])));
  }, [sections]);

  const hideAll = useCallback(() => {
    setVisibility(Object.fromEntries(sections.map((s) => [s.id, false])));
  }, [sections]);

  const rotate = useCallback((id: string, deltaDeg: number) => {
    setRotations((p) => ({ ...p, [id]: (p[id] ?? 0) + deltaDeg * (Math.PI / 180) }));
  }, []);

  const resetRotation = useCallback((id: string) => {
    setRotations((p) => ({ ...p, [id]: 0 }));
  }, []);

  const handleUpload = useCallback((id: string, file: File) => {
    setCustomStls((prev) => {
      if (prev[id]) URL.revokeObjectURL(prev[id]);
      return { ...prev, [id]: URL.createObjectURL(file) };
    });
  }, []);

  const clearCustom = useCallback((id: string) => {
    setCustomStls((prev) => {
      if (prev[id]) URL.revokeObjectURL(prev[id]);
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const visibleCount = sections.filter((s) => visibility[s.id] !== false).length;
  const allVisible   = visibleCount === sections.length;
  const allHidden    = visibleCount === 0;
  const camDist      = Math.max(4, totalW * 1.6 + 2.5);

  return (
    <div className="flex gap-3 w-full h-full">

      {/* ── Side panel ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col rounded-lg border shrink-0 overflow-hidden"
        style={{ width: 210, background: 'var(--sur)', borderColor: 'var(--bdr)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--bdr)', background: 'var(--sur-2, #f4f6fa)' }}
        >
          <span className="text-[11px] font-bold" style={{ color: 'var(--navy)' }}>
            კომპონენტები
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button" onClick={showAll} disabled={allVisible}
              className="text-[9px] px-1.5 py-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: 'var(--blue)', background: 'var(--blue-ghost, #eff6ff)' }}
            >
              ყველა
            </button>
            <button
              type="button" onClick={hideAll} disabled={allHidden}
              className="text-[9px] px-1.5 py-0.5 rounded transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-3)', background: 'var(--sur-2, #f4f6fa)' }}
            >
              დამალვა
            </button>
          </div>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-8"
              style={{ color: 'var(--text-3)' }}>
              <Box size={22} strokeWidth={1.4} />
              <span className="text-[11px]">სექცია არ არის</span>
            </div>
          ) : (
            sections.map((sec) => {
              const visible   = visibility[sec.id] !== false;
              const hasCustom = !!customStls[sec.id];
              return (
                <div key={sec.id} className="border-b" style={{ borderColor: 'var(--bdr)' }}>
                  {/* Label row */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 transition-opacity"
                    style={{ opacity: visible ? 1 : 0.4 }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-[3px] shrink-0 border"
                      style={{ background: sec.color, borderColor: 'rgba(0,0,0,0.12)' }}
                    />
                    <span
                      className="text-[11px] font-medium flex-1 truncate leading-none"
                      title={sec.label}
                      style={{ color: 'var(--text-1)' }}
                    >
                      {sec.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleVisibility(sec.id)}
                      className="shrink-0 rounded p-0.5 transition-colors hover:opacity-70"
                      title={visible ? 'დამალვა' : 'ჩვენება'}
                      style={{ color: visible ? 'var(--blue)' : 'var(--text-3)' }}
                    >
                      {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>

                  {/* Rotation row */}
                  <div className="px-3 pb-1 flex items-center gap-1" style={{ opacity: visible ? 1 : 0.4 }}>
                    <button type="button" onClick={() => rotate(sec.id, -90)}
                      title="-90°"
                      className="flex items-center justify-center rounded p-0.5 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--blue)' }}>
                      <RotateCcw size={11} />
                    </button>
                    <button type="button" onClick={() => rotate(sec.id, -15)}
                      className="text-[9px] font-mono px-1 rounded hover:opacity-70"
                      style={{ color: 'var(--blue)' }}>-15°</button>
                    <button type="button" onClick={() => resetRotation(sec.id)}
                      className="text-[9px] font-mono px-1.5 rounded hover:opacity-70 flex-1 text-center"
                      style={{ color: rotations[sec.id] ? '#dc2626' : 'var(--text-3)' }}
                      title="გადატვირთვა">
                      {Math.round(((rotations[sec.id] ?? 0) * 180) / Math.PI)}°
                    </button>
                    <button type="button" onClick={() => rotate(sec.id, 15)}
                      className="text-[9px] font-mono px-1 rounded hover:opacity-70"
                      style={{ color: 'var(--blue)' }}>+15°</button>
                    <button type="button" onClick={() => rotate(sec.id, 90)}
                      title="+90°"
                      className="flex items-center justify-center rounded p-0.5 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--blue)' }}>
                      <RotateCw size={11} />
                    </button>
                  </div>

                  {/* Upload row */}
                  <div className="px-3 pb-2.5 flex items-center gap-1.5">
                    {hasCustom ? (
                      <>
                        <span className="text-[9px] font-semibold flex-1 truncate"
                          style={{ color: '#16a34a' }}>
                          ✓ custom STL
                        </span>
                        <button
                          type="button" onClick={() => clearCustom(sec.id)}
                          title="სტანდარტულზე დაბრუნება"
                          className="shrink-0 rounded p-0.5 hover:opacity-70"
                          style={{ color: 'var(--text-3)' }}
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRefs.current[sec.id]?.click()}
                        className="flex items-center gap-1 text-[10px] hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--blue)' }}
                        title="STL ფაილის ჩატვირთვა"
                      >
                        <Upload size={10} />
                        STL ჩატვირთვა
                      </button>
                    )}
                    <input
                      ref={(el) => { fileRefs.current[sec.id] = el; }}
                      type="file" accept=".stl" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(sec.id, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3 py-1.5 border-t text-[10px] shrink-0"
          style={{ borderColor: 'var(--bdr)', color: 'var(--text-3)' }}
        >
          {visibleCount} / {sections.length} ჩართული
        </div>
      </div>

      {/* ── 3D Canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 rounded-lg overflow-hidden" style={{ minHeight: 0 }}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [camDist, camDist * 0.55, camDist * 0.85], fov: 32 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
          <ambientLight intensity={0.65} />
          <hemisphereLight args={['#dde6f5', '#3a4a66', 0.45]} />
          <directionalLight position={[6, 9, 5]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />

          {/* Floor plane */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -height / 2 - 0.01, 0]}
            receiveShadow
          >
            <planeGeometry args={[totalW + 6, 10]} />
            <meshStandardMaterial color="#e8eef6" />
          </mesh>

          {/* AHU section meshes */}
          {sections.map((sec, i) => {
            if (visibility[sec.id] === false) return null;
            const stlUrl = customStls[sec.id]
              ?? (sec.type ? `/ahu/stl/${sec.type}.stl` : null);
            return (
              <StlSectionMesh
                key={sec.id}
                url={stlUrl}
                color={sec.color}
                position={[cumOffsets[i], 0, 0]}
                rotation={rotations[sec.id] ?? 0}
                width={sec.width}
                height={height}
                depth={depth}
              />
            );
          })}

          {/* Section dividers */}
          {cumOffsets.slice(0, -1).map((_, i) => {
            const bothHidden =
              visibility[sections[i]?.id] === false &&
              visibility[sections[i + 1]?.id] === false;
            if (bothHidden) return null;
            const x = cumOffsets[i] + sections[i].width / 2;
            return (
              <mesh key={`div-${i}`} position={[x, 0, 0]}>
                <boxGeometry args={[0.013, height + 0.02, depth + 0.02]} />
                <meshStandardMaterial color="#324560" metalness={0.6} roughness={0.4} />
              </mesh>
            );
          })}

          <OrbitControls
            enableDamping dampingFactor={0.08}
            minDistance={2} maxDistance={22}
            maxPolarAngle={Math.PI / 2 - 0.04}
          />
          <gridHelper
            args={[totalW + 6, 14, '#a8b8d0', '#c4d4e8']}
            position={[0, -height / 2, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}
