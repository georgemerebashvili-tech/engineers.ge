'use client';

import {forwardRef, useEffect, useMemo, useRef, useState, type RefObject} from 'react';
import {Canvas, useThree, type ThreeEvent} from '@react-three/fiber';
import {Grid, Html, Line, OrbitControls, TransformControls} from '@react-three/drei';
import * as THREE from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {buildDxfThreeGroup} from '@/lib/dxf/to-three';
import type {DxfLoaded} from '@/lib/dxf/parse';
import type {DxfClassificationFilter} from '@/lib/dxf/wall-heuristic';
import type {TBuilding, TModule, TModuleType, TTransform} from '@/lib/building/module-schema';

type HoverPoint = {x: number; z: number} | null;
type ScenePoint = [number, number, number];
type SnapGuide = {
  targetId: string;
  transform: Partial<TTransform>;
  points: [ScenePoint, ScenePoint];
  gap: number;
  snapped: boolean;
};

type ComposerSceneProps = {
  building: TBuilding;
  dxfModel: DxfLoaded | null;
  dxfVisibleLayers: string[];
  dxfShowText: boolean;
  dxfClassificationFilter: DxfClassificationFilter;
  dxfSelectedEntityId: string | null;
  selectedId: string | null;
  pendingType: TModuleType | null;
  gizmoMode: 'translate' | 'rotate';
  onSelect: (id: string | null) => void;
  onSelectDxfEntity: (id: string | null) => void;
  onPlacePending: (transform: Partial<TTransform>) => void;
  onHoverPoint: (point: HoverPoint) => void;
  onTransformChange: (id: string, transform: Partial<TTransform>) => void;
  onConnectModules: (sourceId: string, targetId: string, transform: Partial<TTransform>) => void;
  onDisconnectModule: (id: string) => void;
};

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) {
      child.geometry.dispose();
    }
    if ('material' in child) {
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          if ('map' in item && item.map instanceof THREE.Texture) {
            item.map.dispose();
          }
          item.dispose();
        });
      } else if (material instanceof THREE.Material) {
        if ('map' in material && material.map instanceof THREE.Texture) {
          material.map.dispose();
        }
        material.dispose();
      }
    }
  });
}

function DxfLayerObject({
  model,
  visibleLayers,
  showText,
  classificationFilter,
  selectedEntityId,
  onSelectEntity
}: {
  model: DxfLoaded;
  visibleLayers: string[];
  showText: boolean;
  classificationFilter: DxfClassificationFilter;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}) {
  const group = useMemo(
    () =>
      buildDxfThreeGroup(model, {
        visibleLayers,
        showText,
        classificationFilter,
        selectedEntityId
      }),
    [classificationFilter, model, selectedEntityId, showText, visibleLayers]
  );

  useEffect(() => {
    return () => {
      disposeObject3D(group);
    };
  }, [group]);

  return (
    <primitive
      object={group}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const entityId = event.object.userData?.entityId as string | undefined;
        if (!entityId) return;
        event.stopPropagation();
        onSelectEntity(entityId);
      }}
    />
  );
}

function CameraAutoFit({
  model,
  controlsRef
}: {
  model: DxfLoaded | null;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const {camera} = useThree();

  useEffect(() => {
    if (!model || !(camera instanceof THREE.PerspectiveCamera)) return;

    const center = new THREE.Vector3(
      (model.bounds.min.x + model.bounds.max.x) / 2,
      0,
      (model.bounds.min.z + model.bounds.max.z) / 2
    );
    const spanX = Math.max(4, model.bounds.max.x - model.bounds.min.x);
    const spanZ = Math.max(4, model.bounds.max.z - model.bounds.min.z);
    const radius = Math.max(spanX, spanZ) * 0.5;
    const distance = radius / Math.tan((camera.fov * Math.PI) / 360) + 6;

    camera.position.set(center.x + distance * 0.7, distance * 0.85, center.z + distance * 0.7);
    camera.lookAt(center);
    controlsRef.current?.target.set(center.x, center.y, center.z);
    controlsRef.current?.update();
  }, [camera, controlsRef, model]);

  return null;
}

function useDarkModeFlag() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
    return () => observer.disconnect();
  }, []);

  return dark;
}

function moduleVisual(module: TModule) {
  switch (module.type) {
    case 'stair':
      return {
        size: [
          Math.max(1.8, module.params.shaftW),
          Math.max(1.8, module.params.floorH * 0.82),
          Math.max(2.2, module.params.shaftD * 0.65)
        ] as [number, number, number],
        color: '#1f6fd4',
        label: 'Stair'
      };
    case 'elevator':
      return {
        size: [
          Math.max(1.6, module.params.shaftW),
          Math.max(1.7, module.params.floorH * 0.78),
          Math.max(1.6, module.params.shaftD * 0.7)
        ] as [number, number, number],
        color: '#c0201a',
        label: 'Lift'
      };
    case 'parking': {
      const width = Math.max(4, Math.sqrt(module.params.area) * 0.18);
      const depth = Math.max(5, (module.params.area / Math.max(1, Math.sqrt(module.params.area))) * 0.18);
      return {
        size: [width, Math.max(0.8, module.params.ceilingH * 0.18), depth] as [number, number, number],
        color: '#0f6e3a',
        label: 'Parking'
      };
    }
    case 'corridor':
      return {
        size: [
          Math.max(4, module.params.length * 0.22),
          Math.max(0.8, module.params.height * 0.18),
          Math.max(1.4, module.params.width * 0.45)
        ] as [number, number, number],
        color: '#c05010',
        label: 'Corridor'
      };
  }
}

function resolveStack(module: TModule) {
  if (module.type === 'stair' || module.type === 'elevator') {
    return {
      enabled: true,
      count: Math.max(1, Math.min(40, Math.round(module.repeats?.count ?? module.params.floors))),
      step: module.params.floorH
    };
  }

  return {
    enabled: false,
    count: 1,
    step: 0
  };
}

function moduleFootprint(module: TModule, transform: Partial<TTransform> = module.transform) {
  const visual = moduleVisual(module);
  const rotY = transform.rotY ?? module.transform.rotY;
  const swapAxes = Math.abs(Math.sin(rotY)) > 0.707;

  return {
    halfW: (swapAxes ? visual.size[2] : visual.size[0]) / 2,
    halfD: (swapAxes ? visual.size[0] : visual.size[2]) / 2
  };
}

function moduleCenter(module: TModule, transform: Partial<TTransform> = module.transform): ScenePoint {
  const visual = moduleVisual(module);
  const stack = resolveStack(module);
  const totalHeight = (stack.count - 1) * stack.step + visual.size[1];

  return [
    transform.x ?? module.transform.x,
    (transform.y ?? module.transform.y) + totalHeight / 2,
    transform.z ?? module.transform.z
  ];
}

function findSnapCandidate(
  movingModule: TModule,
  transform: Partial<TTransform>,
  modules: TBuilding['modules']
): SnapGuide | null {
  const movingX = transform.x ?? movingModule.transform.x;
  const movingZ = transform.z ?? movingModule.transform.z;
  const movingFootprint = moduleFootprint(movingModule, transform);
  let best: SnapGuide | null = null;

  for (const target of modules) {
    if (target.id === movingModule.id) continue;

    const targetFootprint = moduleFootprint(target);
    const overlapX =
      Math.min(movingX + movingFootprint.halfW, target.transform.x + targetFootprint.halfW) -
      Math.max(movingX - movingFootprint.halfW, target.transform.x - targetFootprint.halfW);
    const overlapZ =
      Math.min(movingZ + movingFootprint.halfD, target.transform.z + targetFootprint.halfD) -
      Math.max(movingZ - movingFootprint.halfD, target.transform.z - targetFootprint.halfD);

    const candidates: SnapGuide[] = [];

    if (overlapZ > 0.35) {
      const snapLeft = target.transform.x - targetFootprint.halfW - movingFootprint.halfW;
      const snapRight = target.transform.x + targetFootprint.halfW + movingFootprint.halfW;
      candidates.push({
        targetId: target.id,
        transform: {x: snapLeft, z: movingZ, rotY: transform.rotY ?? movingModule.transform.rotY},
        points: [moduleCenter(movingModule, {x: snapLeft, z: movingZ}), moduleCenter(target)],
        gap: Math.abs(movingX - snapLeft),
        snapped: Math.abs(movingX - snapLeft) <= 0.1
      });
      candidates.push({
        targetId: target.id,
        transform: {x: snapRight, z: movingZ, rotY: transform.rotY ?? movingModule.transform.rotY},
        points: [moduleCenter(movingModule, {x: snapRight, z: movingZ}), moduleCenter(target)],
        gap: Math.abs(movingX - snapRight),
        snapped: Math.abs(movingX - snapRight) <= 0.1
      });
    }

    if (overlapX > 0.35) {
      const snapTop = target.transform.z - targetFootprint.halfD - movingFootprint.halfD;
      const snapBottom = target.transform.z + targetFootprint.halfD + movingFootprint.halfD;
      candidates.push({
        targetId: target.id,
        transform: {x: movingX, z: snapTop, rotY: transform.rotY ?? movingModule.transform.rotY},
        points: [moduleCenter(movingModule, {x: movingX, z: snapTop}), moduleCenter(target)],
        gap: Math.abs(movingZ - snapTop),
        snapped: Math.abs(movingZ - snapTop) <= 0.1
      });
      candidates.push({
        targetId: target.id,
        transform: {x: movingX, z: snapBottom, rotY: transform.rotY ?? movingModule.transform.rotY},
        points: [moduleCenter(movingModule, {x: movingX, z: snapBottom}), moduleCenter(target)],
        gap: Math.abs(movingZ - snapBottom),
        snapped: Math.abs(movingZ - snapBottom) <= 0.1
      });
    }

    for (const candidate of candidates) {
      if (candidate.gap > 0.5) continue;
      if (!best || candidate.gap < best.gap) {
        best = candidate;
      }
    }
  }

  return best;
}

function ModuleSlice({
  visual,
  moduleId,
  selected,
  ghost = false,
  onSelect,
  onDisconnect
}: {
  visual: ReturnType<typeof moduleVisual>;
  moduleId: string;
  selected: boolean;
  ghost?: boolean;
  onSelect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}) {
  return (
    <>
      <mesh
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.(moduleId);
        }}
        onContextMenu={(event) => {
          event.stopPropagation();
          event.nativeEvent.preventDefault();
          onDisconnect?.(moduleId);
        }}
      >
        <boxGeometry args={visual.size} />
        <meshStandardMaterial
          color={visual.color}
          emissive={selected ? visual.color : '#000000'}
          emissiveIntensity={selected ? 0.18 : 0}
          opacity={ghost ? 0.28 : 0.88}
          transparent={ghost}
          roughness={0.62}
          metalness={0.08}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...visual.size)]} />
        <lineBasicMaterial color={selected ? '#1f6fd4' : '#a7b7d1'} transparent opacity={ghost ? 0.4 : 0.9} />
      </lineSegments>
    </>
  );
}

const ModuleMesh = forwardRef<
  THREE.Group,
  {
    module: TModule;
    selected: boolean;
    ghost?: boolean;
    onSelect?: (id: string) => void;
    onDisconnect?: (id: string) => void;
  }
>(function ModuleMesh({module, selected, ghost = false, onSelect, onDisconnect}, ref) {
  const visual = moduleVisual(module);
  const stack = resolveStack(module);
  const totalHeight = (stack.count - 1) * stack.step + visual.size[1];
  const useInstances = stack.enabled && stack.count > 10;
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh || !useInstances) return;

    const dummy = new THREE.Object3D();
    for (let index = 0; index < stack.count; index += 1) {
      dummy.position.set(0, index * stack.step + visual.size[1] / 2, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [stack.count, stack.step, useInstances, visual.size]);

  return (
    <group
      ref={ref}
      position={[module.transform.x, module.transform.y, module.transform.z]}
      rotation={[0, module.transform.rotY, 0]}
    >
      {useInstances ? (
        <>
          <instancedMesh
            ref={instancedRef}
            args={[undefined, undefined, stack.count]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(module.id);
            }}
            onContextMenu={(event) => {
              event.stopPropagation();
              event.nativeEvent.preventDefault();
              onDisconnect?.(module.id);
            }}
          >
            <boxGeometry args={visual.size} />
            <meshStandardMaterial
              color={visual.color}
              emissive={selected ? visual.color : '#000000'}
              emissiveIntensity={selected ? 0.16 : 0}
              opacity={ghost ? 0.22 : 0.9}
              transparent={ghost}
              roughness={0.62}
              metalness={0.08}
            />
          </instancedMesh>
          <group position={[0, totalHeight / 2, 0]}>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(visual.size[0], totalHeight, visual.size[2])]} />
              <lineBasicMaterial color={selected ? '#1f6fd4' : '#a7b7d1'} transparent opacity={ghost ? 0.35 : 0.88} />
            </lineSegments>
          </group>
        </>
      ) : (
        Array.from({length: stack.count}).map((_, index) => (
          <group key={`${module.id}-${index}`} position={[0, index * stack.step + visual.size[1] / 2, 0]}>
            <ModuleSlice
              visual={visual}
              moduleId={module.id}
              selected={selected}
              ghost={ghost}
              onSelect={onSelect}
              onDisconnect={onDisconnect}
            />
          </group>
        ))
      )}

      <Html position={[0, totalHeight + 0.35, 0]} center distanceFactor={18}>
        <div className="rounded-[6px] border border-bdr bg-sur/95 px-2 py-1 font-mono text-[10px] font-bold text-navy shadow-card">
          {module.name || visual.label}
          {stack.count > 1 ? ` ×${stack.count}` : ''}
        </div>
      </Html>
    </group>
  );
});

function SceneContent({
  building,
  dxfModel,
  dxfVisibleLayers,
  dxfShowText,
  dxfClassificationFilter,
  dxfSelectedEntityId,
  selectedId,
  pendingType,
  gizmoMode,
  onSelect,
  onSelectDxfEntity,
  onPlacePending,
  onHoverPoint,
  onTransformChange,
  onConnectModules,
  onDisconnectModule
}: ComposerSceneProps) {
  const dark = useDarkModeFlag();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const selectedModule = building.modules.find((module) => module.id === selectedId) ?? null;
  const selectedRef = useRef<THREE.Group>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint>(null);
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);

  const connectionPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: Array<{id: string; points: [ScenePoint, ScenePoint]}> = [];

    building.modules.forEach((item) => {
      item.connections.forEach((targetId) => {
        const key = [item.id, targetId].sort().join(':');
        if (seen.has(key)) return;
        const target = building.modules.find((node) => node.id === targetId);
        if (!target) return;
        seen.add(key);
        pairs.push({
          id: key,
          points: [moduleCenter(item), moduleCenter(target)]
        });
      });
    });

    return pairs;
  }, [building.modules]);

  useEffect(() => {
    queueMicrotask(() => {
      setSnapGuide(null);
    });
  }, [selectedId]);

  const ghostModule = useMemo<TModule | null>(() => {
    if (!pendingType || !hoverPoint) return null;
    const template = building.modules.find((module) => module.type === pendingType);
    const base = template ?? building.modules[0] ?? null;
    const transform = {x: hoverPoint.x, y: 0, z: hoverPoint.z, rotY: 0};
    if (base && base.type === pendingType) {
      return {
        ...base,
        id: `ghost-${pendingType}`,
        transform
      } as TModule;
    }
    const shapeStub: Record<TModuleType, TModule> = {
      stair: {
        id: 'ghost-stair',
        type: 'stair',
        name: 'Ghost Stair',
        standard: {id: 'EN-12101-6', classOrType: 'A'},
        units: 'metric',
        transform,
        connections: [],
        params: {
          floors: 5,
          floorH: 3,
          basement: 0,
          shaftW: 2.4,
          shaftD: 5.2,
          stairType: 'switchback',
          doorW: 900,
          doorH: 2100,
          doorPos: 'front',
          supply: 'bottom',
          dp: 50
        }
      },
      elevator: {
        id: 'ghost-elevator',
        type: 'elevator',
        name: 'Ghost Elevator',
        standard: {id: 'NFPA-92', classOrType: 'elevator'},
        units: 'metric',
        transform,
        connections: [],
        params: {
          floors: 10,
          floorH: 3,
          shaftW: 2.3,
          shaftD: 2.7,
          cabinW: 1.1,
          cabinD: 1.4,
          velocity: 2,
          doorW: 900,
          doorH: 2100,
          dp: 37,
          includeMachineRoom: false
        }
      },
      parking: {
        id: 'ghost-parking',
        type: 'parking',
        name: 'Ghost Parking',
        standard: {id: 'ASHRAE-62.1', classOrType: 'normal'},
        units: 'metric',
        transform,
        connections: [],
        params: {
          area: 1200,
          ceilingH: 3.1,
          spots: 48,
          ramp: {w: 3.8, l: 14},
          fanCount: 6,
          fanThrust: 100,
          scenario: 'peak'
        }
      },
      corridor: {
        id: 'ghost-corridor',
        type: 'corridor',
        name: 'Ghost Corridor',
        standard: {id: 'EN-12101-6', classOrType: 'B'},
        units: 'metric',
        transform,
        connections: [],
        params: {
          length: 24,
          width: 2.4,
          height: 3,
          roomCount: 12,
          stairDp: 50,
          liftDp: 37,
          openDoors: [],
          dp: 50
        }
      }
    };
    return shapeStub[pendingType];
  }, [building.modules, hoverPoint, pendingType]);

  return (
    <>
      <color attach="background" args={[dark ? '#0f1724' : '#f2f5fa']} />
      <fog attach="fog" args={[dark ? '#0f1724' : '#f2f5fa', 20, 70]} />
      <ambientLight intensity={dark ? 0.7 : 0.95} />
      <directionalLight
        castShadow
        intensity={1}
        position={[12, 18, 10]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight intensity={0.28} position={[-10, 8, -8]} color={dark ? '#4a9eff' : '#6ba6ff'} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerMove={(event) => {
          const point = {x: Number(event.point.x.toFixed(2)), z: Number(event.point.z.toFixed(2))};
          setHoverPoint(point);
          onHoverPoint(point);
        }}
        onPointerOut={() => {
          setHoverPoint(null);
          onHoverPoint(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          const point = {x: Number(event.point.x.toFixed(2)), z: Number(event.point.z.toFixed(2))};
          if (pendingType) {
            onPlacePending({x: point.x, y: 0, z: point.z, rotY: 0});
            return;
          }
          onSelectDxfEntity(null);
          onSelect(null);
        }}
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={dark ? '#151f2f' : '#ffffff'} transparent opacity={0.02} />
      </mesh>

      <Grid
        args={[50, 50]}
        cellColor={dark ? '#324566' : '#dde6f2'}
        sectionColor={dark ? '#4a6080' : '#1f6fd4'}
        cellSize={1}
        sectionSize={5}
        cellThickness={0.5}
        sectionThickness={1.1}
        fadeDistance={70}
        fadeStrength={1}
        position={[0, 0.001, 0]}
      />
      <axesHelper args={[4]} />

      {dxfModel ? (
        <>
          <DxfLayerObject
            model={dxfModel}
            visibleLayers={dxfVisibleLayers}
            showText={dxfShowText}
            classificationFilter={dxfClassificationFilter}
            selectedEntityId={dxfSelectedEntityId}
            onSelectEntity={onSelectDxfEntity}
          />
          <CameraAutoFit model={dxfModel} controlsRef={controlsRef} />
        </>
      ) : null}

      {building.modules
        .filter((module) => module.id !== selectedId)
        .map((module) => (
          <ModuleMesh
            key={module.id}
            module={module}
            selected={false}
            onSelect={onSelect}
            onDisconnect={onDisconnectModule}
          />
        ))}

      {connectionPairs.map((pair) => (
        <Line
          key={pair.id}
          points={pair.points}
          color="#1f6fd4"
          transparent
          opacity={0.5}
          dashed
          dashSize={0.45}
          gapSize={0.22}
          lineWidth={1}
        />
      ))}

      {snapGuide ? (
        <Line
          points={snapGuide.points}
          color={snapGuide.snapped ? '#1f6fd4' : '#6ba6ff'}
          transparent
          opacity={0.9}
          dashed
          dashSize={0.3}
          gapSize={0.16}
          lineWidth={1.4}
        />
      ) : null}

      {selectedModule ? (
        <TransformControls
          mode={gizmoMode}
          showY={false}
          onObjectChange={() => {
            const group = selectedRef.current;
            if (!group) return;
            const nextTransform = {
              x: Number(group.position.x.toFixed(2)),
              y: 0,
              z: Number(group.position.z.toFixed(2)),
              rotY: Number(group.rotation.y.toFixed(3))
            };
            const candidate = findSnapCandidate(selectedModule, nextTransform, building.modules);
            if (candidate) {
              setSnapGuide(candidate);
              if (candidate.snapped) {
                group.position.x = candidate.transform.x ?? nextTransform.x;
                group.position.z = candidate.transform.z ?? nextTransform.z;
              }
            } else {
              setSnapGuide(null);
            }

            onTransformChange(selectedModule.id, candidate?.snapped ? candidate.transform : nextTransform);
          }}
          onMouseUp={() => {
            if (!selectedModule || !snapGuide?.snapped) return;
            onConnectModules(selectedModule.id, snapGuide.targetId, snapGuide.transform);
            setSnapGuide(null);
          }}
        >
          <ModuleMesh
            ref={selectedRef}
            module={selectedModule}
            selected
            onSelect={onSelect}
            onDisconnect={onDisconnectModule}
          />
        </TransformControls>
      ) : null}

      {ghostModule ? <ModuleMesh module={ghostModule} selected={false} ghost /> : null}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        maxPolarAngle={Math.PI * 0.47}
        minDistance={8}
        maxDistance={160}
      />
    </>
  );
}

export function ComposerScene(props: ComposerSceneProps) {
  return (
    <div className="h-full w-full rounded-card border border-bdr bg-sur shadow-card">
      <Canvas
        shadows
        camera={{position: [12, 11, 14], fov: 46}}
        gl={{antialias: true}}
        onCreated={({raycaster}) => {
          raycaster.params.Line.threshold = 0.2;
        }}
        className="h-full w-full rounded-card"
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
