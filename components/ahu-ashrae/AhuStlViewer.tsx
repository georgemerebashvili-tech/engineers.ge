'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';

export interface AhuSection {
  id: string;
  label: string;
  color: string;   // hex
  width: number;   // along X (m)
}

interface Props {
  sections: AhuSection[];
  height?: number; // m
  depth?: number;  // m
}

// Procedural AHU box visualizer (perspective only). Each section is a colored
// slab along X. Will swap for real STL loaded from /public/ahu/models/<id>.stl
// once admin catalog provides per-model files. For ortho side/front/top views
// the parent renders <AhuOrthoSchematic> instead — pure SVG technical drawing
// with dimension chains.
export function AhuStlViewer({ sections, height = 1.2, depth = 1.2 }: Props) {
  const totalW = sections.reduce((s, x) => s + x.width, 0);
  const cumOffsets = useMemo(() => {
    const out: number[] = [];
    let acc = -totalW / 2;
    for (const s of sections) {
      out.push(acc + s.width / 2);
      acc += s.width;
    }
    return out;
  }, [sections, totalW]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4, 2.5, 4.5], fov: 35 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#dde6f5', '#3a4a66', 0.5]} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2 - 0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#e8eef6" />
      </mesh>

      {/* AHU sections */}
      {sections.map((sec, i) => (
        <mesh key={sec.id} position={[cumOffsets[i], 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[sec.width, height, depth]} />
          <meshStandardMaterial
            color={sec.color}
            metalness={0.15}
            roughness={0.55}
          />
          <Edges color="#1a2a4a" lineWidth={1} />
        </mesh>
      ))}

      {/* Section dividers (subtle vertical lines) */}
      {cumOffsets.slice(0, -1).map((_, i) => {
        const x = cumOffsets[i] + sections[i].width / 2;
        return (
          <mesh key={`div-${i}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.015, height + 0.02, depth + 0.02]} />
            <meshStandardMaterial color="#324560" metalness={0.6} roughness={0.4} />
          </mesh>
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <gridHelper args={[12, 12, '#a8b8d0', '#c4d4e8']} position={[0, -height / 2, 0]} />
    </Canvas>
  );
}
