'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {Box, FolderOpen, Move3D, RotateCw, Save, ScanSearch, Trash2, Upload} from 'lucide-react';
import {ComposerScene} from './composer-scene';
import {DxfPanel} from './dxf-panel';
import {useComposerStore} from './composer-store';
import {
  parseDxfText,
  writeDxfClassificationCache,
  type DxfClassification,
  type DxfLoaded
} from '@/lib/dxf/parse';
import {
  applyClassificationResult,
  classifyEntities,
  matchesClassificationFilter,
  type DxfClassificationFilter
} from '@/lib/dxf/wall-heuristic';
import {
  addModule,
  connectModules,
  createEmptyBuilding,
  createModule,
  disconnectModules,
  findConnected,
  updateModule as updateBuildingModule
} from '@/lib/building/module-utils';
import type {TBuilding, TModule, TModuleType} from '@/lib/building/module-schema';

type Preset = {
  id: string;
  name: string;
  meta: string;
  build: () => TBuilding;
};

type SimulatorLaunch = {
  href: string;
  payload: unknown;
};

function isVerticalStackModule(module: TModule): module is Extract<TModule, {type: 'stair' | 'elevator'}> {
  return module.type === 'stair' || module.type === 'elevator';
}

function getStackCount(module: TModule) {
  if (!isVerticalStackModule(module)) return 1;
  return Math.max(1, Math.min(40, Math.round(module.repeats?.count ?? module.params.floors)));
}

function getStackStep(module: TModule) {
  return isVerticalStackModule(module) ? module.params.floorH : 0;
}

function createStackPatch(module: TModule, count: number): Partial<TModule> {
  if (!isVerticalStackModule(module)) return {};

  return {
    repeats: {
      axis: 'Y',
      count: Math.max(1, Math.min(40, Math.round(count))),
      step: module.params.floorH
    }
  };
}

function createCorridorSyncPatch(corridor: Extract<TModule, {type: 'corridor'}>, core: Extract<TModule, {type: 'stair' | 'elevator'}>): Partial<TModule> {
  return {
    params: {
      ...corridor.params,
      height: core.params.floorH,
      stairDp: core.type === 'stair' ? core.params.dp : corridor.params.stairDp,
      liftDp: core.type === 'elevator' ? core.params.dp : corridor.params.liftDp
    }
  } as Partial<TModule>;
}

function syncConnectionPair(building: TBuilding, sourceId: string, targetId: string) {
  const source = building.modules.find((item) => item.id === sourceId);
  const target = building.modules.find((item) => item.id === targetId);
  if (!source || !target) return building;

  if (source.type === 'corridor' && (target.type === 'stair' || target.type === 'elevator')) {
    return updateBuildingModule(building, source.id, createCorridorSyncPatch(source, target));
  }

  if (target.type === 'corridor' && (source.type === 'stair' || source.type === 'elevator')) {
    return updateBuildingModule(building, target.id, createCorridorSyncPatch(target, source));
  }

  return building;
}

function buildPreset(name: string, modules: Array<{type: TModuleType; x: number; z: number; override?: Partial<TModule>}>) {
  return modules.reduce((building, item) => {
    const nextModule = createModule(item.type, {
      ...item.override,
      transform: {
        x: item.x,
        y: 0,
        z: item.z,
        rotY: item.override?.transform?.rotY ?? 0
      }
    });
    return addModule(building, nextModule);
  }, createEmptyBuilding(name));
}

const PRESETS: Preset[] = [
  {
    id: 'sfh',
    name: 'SFH',
    meta: '1 core · 1 corridor',
    build: () =>
      buildPreset('Single Family Core', [
        {type: 'stair', x: -2.2, z: 0, override: {name: 'Residential Stair'}},
        {type: 'corridor', x: 2.8, z: 0, override: {name: 'Entry Corridor', params: {roomCount: 4, length: 18}} as Partial<TModule>}
      ])
  },
  {
    id: 'office-15',
    name: 'Office 15fl',
    meta: 'stair + lift + corridor',
    build: () =>
      buildPreset('Office 15 Floors', [
        {type: 'stair', x: -5.5, z: 0, override: {name: 'Office Stair', params: {floors: 15, floorH: 3.3}} as Partial<TModule>},
        {type: 'elevator', x: -0.6, z: 0, override: {name: 'Office Lift', params: {floors: 15, floorH: 3.3}} as Partial<TModule>},
        {type: 'corridor', x: 5.2, z: 0, override: {name: 'Main Corridor', params: {length: 32, roomCount: 16}} as Partial<TModule>}
      ])
  },
  {
    id: 'fire-suite',
    name: 'Fire Suite',
    meta: 'all 4 module types',
    build: () =>
      buildPreset('Mixed Fire Safety Suite', [
        {type: 'parking', x: 0, z: 6, override: {name: 'Podium Parking'}},
        {type: 'stair', x: -5.5, z: -2, override: {name: 'Main Stair', params: {floors: 12}} as Partial<TModule>},
        {type: 'elevator', x: -0.4, z: -2, override: {name: 'Lift Shaft', params: {floors: 12}} as Partial<TModule>},
        {type: 'corridor', x: 5.5, z: -2, override: {name: 'Refuge Corridor', params: {length: 30, roomCount: 12}} as Partial<TModule>}
      ])
  }
];

function formatStamp(value: string | null) {
  if (!value) return 'ჯერ არა';
  try {
    return new Date(value).toLocaleTimeString('ka-GE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return value;
  }
}

function toSimulatorStandard(id: TModule['standard']['id']) {
  if (id === 'EN-12101-6') return 'EN';
  if (id === 'NFPA-92') return 'NFPA';
  if (id === 'SP-7.13130') return 'SP';
  return 'ASHRAE';
}

function buildSimulatorLaunch(module: TModule): SimulatorLaunch {
  switch (module.type) {
    case 'stair': {
      const payload = {
        simulator: 'stair-pressurization',
        version: 1,
        standard: {
          id: toSimulatorStandard(module.standard.id),
          class: module.standard.classOrType
        },
        units: module.units,
        params: {
          ...module.params,
          flowViz: 'on',
          systemMode: 'normal',
          smokeMode: 'off',
          openDoors: [],
          activeFloor: 0
        }
      };
      return {
        href: '/calc/stair-pressurization',
        payload
      };
    }
    case 'elevator': {
      const payload = {
        simulator: 'elevator-shaft-press',
        version: 1,
        standard: {
          id: toSimulatorStandard(module.standard.id),
          class: module.standard.classOrType
        },
        units: module.units,
        params: {
          ...module.params,
          cabinFloor: 0,
          cabinMoving: 'off',
          doorPos: 'front',
          doorScenario: 'closed',
          supply: 'top',
          flowViz: 'on',
          basement: 0
        }
      };
      return {
        href: '/calc/elevator-shaft-press',
        payload
      };
    }
    case 'parking': {
      const payload = {
        simulator: 'parking-ventilation',
        version: 1,
        standard: {
          id: toSimulatorStandard(module.standard.id),
          class: module.standard.classOrType
        },
        units: module.units,
        params: {
          area: module.params.area,
          height: module.params.ceilingH,
          spots: module.params.spots,
          rampW: module.params.ramp.w,
          rampL: module.params.ramp.l,
          systemType: 'jet',
          fanCount: module.params.fanCount,
          fanThrust: module.params.fanThrust,
          fanNoise: 68,
          scenario: module.params.scenario,
          carsPerHour: module.params.scenario === 'peak' ? 80 : module.params.scenario === 'fire' ? 25 : 20,
          fireSize: module.params.scenario === 'fire' ? 5000 : 5000,
          coInitial: 8,
          flowViz: 'on',
          heatmap: 'on'
        }
      };
      return {
        href: '/calc/parking-ventilation',
        payload
      };
    }
    case 'corridor': {
      const payload = {
        simulator: 'floor-pressurization',
        version: 1,
        standard: {
          id: toSimulatorStandard(module.standard.id),
          class: module.standard.classOrType
        },
        units: module.units,
        params: {
          corridorL: module.params.length,
          corridorW: module.params.width,
          corridorH: module.params.height,
          roomCount: module.params.roomCount,
          doorW: 900,
          doorH: 2100,
          doorCrackArea: 0.01,
          wallLeakFactor: 0.001,
          dp: module.params.dp,
          flowViz: 'on',
          systemMode: 'normal',
          roomDoors: module.params.openDoors,
          activeRoom: module.params.openDoors[0] ?? 0
        }
      };
      return {
        href: '/calc/floor-pressurization',
        payload
      };
    }
  }
}

function NumberField({
  label,
  value,
  step = 1,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-semibold text-text-2">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-[5px] border-[1.5px] border-bdr bg-sur px-2 py-1.5 font-mono text-[11px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
      />
    </label>
  );
}

function EditorPanel({
  selectedModule,
  onUpdate,
  onRemove,
  gizmoMode,
  onGizmoMode,
  onOpenInSimulator
}: {
  selectedModule: TModule | null;
  onUpdate: (patch: Partial<TModule>) => void;
  onRemove: () => void;
  gizmoMode: 'translate' | 'rotate';
  onGizmoMode: (mode: 'translate' | 'rotate') => void;
  onOpenInSimulator: () => void;
}) {
  if (!selectedModule) {
    return (
      <div className="rounded-card border border-dashed border-bdr-2 bg-sur p-5 text-[12px] text-text-2 shadow-card">
        მოდული ჯერ არ არის არჩეული. Scene-ში დააკლიკე box-ს ან library-დან დაამატე ახალი.
      </div>
    );
  }

  const transform = selectedModule.transform;
  const stackCount = getStackCount(selectedModule);
  const stackStep = getStackStep(selectedModule);
  const isStackable = isVerticalStackModule(selectedModule);

  return (
    <div className="grid gap-3">
      <div className="rounded-card border border-bdr bg-sur p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[15px] font-bold text-navy">{selectedModule.name || 'Untitled module'}</div>
            <div className="text-[11px] text-text-2">{selectedModule.type}</div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red bg-red-lt text-red transition-colors hover:bg-red hover:text-white"
            aria-label="წაშლა"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 md:col-span-2">
            <span className="text-[10px] font-semibold text-text-2">სახელი</span>
            <input
              type="text"
              value={selectedModule.name ?? ''}
              onChange={(event) => onUpdate({name: event.target.value})}
              className="w-full rounded-[5px] border-[1.5px] border-bdr bg-sur px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-text-2">Standard</span>
            <select
              value={selectedModule.standard.id}
              onChange={(event) =>
                onUpdate({
                  standard: {
                    ...selectedModule.standard,
                    id: event.target.value as TModule['standard']['id']
                  }
                })
              }
              className="w-full rounded-[5px] border-[1.5px] border-bdr bg-sur px-2 py-1.5 text-[12px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
            >
              <option value="EN-12101-6">EN-12101-6</option>
              <option value="NFPA-92">NFPA-92</option>
              <option value="SP-7.13130">SP-7.13130</option>
              <option value="ASHRAE-62.1">ASHRAE-62.1</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-text-2">Class / Type</span>
            <input
              type="text"
              value={selectedModule.standard.classOrType}
              onChange={(event) =>
                onUpdate({
                  standard: {
                    ...selectedModule.standard,
                    classOrType: event.target.value
                  }
                })
              }
              className="w-full rounded-[5px] border-[1.5px] border-bdr bg-sur px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
            />
          </label>

          <div className="md:col-span-2 grid gap-2 rounded-card border border-bdr bg-sur-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                Transform
              </div>
              <div className="inline-flex rounded-[6px] border border-bdr overflow-hidden">
                <button
                  type="button"
                  onClick={() => onGizmoMode('translate')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold ${
                    gizmoMode === 'translate' ? 'bg-blue text-white' : 'bg-sur text-text-2'
                  }`}
                >
                  <Move3D size={12} />
                  Move
                </button>
                <button
                  type="button"
                  onClick={() => onGizmoMode('rotate')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold ${
                    gizmoMode === 'rotate' ? 'bg-blue text-white' : 'bg-sur text-text-2'
                  }`}
                >
                  <RotateCw size={12} />
                  Rotate
                </button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <NumberField label="X" value={transform.x} step={0.1} onChange={(value) => onUpdate({transform: {...transform, x: value}})} />
              <NumberField label="Z" value={transform.z} step={0.1} onChange={(value) => onUpdate({transform: {...transform, z: value}})} />
              <NumberField label="RotY" value={transform.rotY} step={0.1} onChange={(value) => onUpdate({transform: {...transform, rotY: value}})} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-bdr bg-sur p-4 shadow-card">
        <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
          3D Stack
        </div>
        {isStackable ? (
          <div className="grid gap-3 rounded-card border border-blue-bd bg-blue-lt p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-navy">ვერტიკალური განმეორება</div>
                <div className="text-[10px] text-text-2">
                  `repeats.step` ავტომატურად ემთხვევა `floorH`-ს.
                </div>
              </div>
              <div className="inline-flex items-center overflow-hidden rounded-[6px] border border-blue-bd bg-white">
                <button
                  type="button"
                  onClick={() => onUpdate(createStackPatch(selectedModule, stackCount - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center border-r border-blue-bd text-blue transition-colors hover:bg-blue hover:text-white"
                  aria-label="ერთით შემცირება"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={40}
                  step={1}
                  value={stackCount}
                  onChange={(event) => onUpdate(createStackPatch(selectedModule, Number(event.target.value)))}
                  className="h-8 w-14 border-0 bg-transparent text-center text-[12px] font-bold text-navy outline-none"
                />
                <button
                  type="button"
                  onClick={() => onUpdate(createStackPatch(selectedModule, stackCount + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center border-l border-blue-bd text-blue transition-colors hover:bg-blue hover:text-white"
                  aria-label="ერთით გაზრდა"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid gap-2 text-[10px] text-text-2 md:grid-cols-2">
              <div className="rounded-[6px] border border-bdr bg-white px-2.5 py-2">
                step: <span className="font-mono font-semibold text-navy">{stackStep.toFixed(2)} მ</span>
              </div>
              <div className="rounded-[6px] border border-bdr bg-white px-2.5 py-2">
                სულ clones: <span className="font-mono font-semibold text-navy">{stackCount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 rounded-card border border-dashed border-bdr-2 bg-sur-2 p-3 text-[11px] text-text-2 opacity-80">
            <div className="inline-flex items-center overflow-hidden rounded-[6px] border border-bdr bg-white opacity-60">
              <button type="button" disabled className="inline-flex h-8 w-8 items-center justify-center border-r border-bdr">
                -
              </button>
              <span className="inline-flex h-8 w-14 items-center justify-center font-bold text-navy">1</span>
              <button type="button" disabled className="inline-flex h-8 w-8 items-center justify-center border-l border-bdr">
                +
              </button>
            </div>
            <div>
              {selectedModule.type === 'parking'
                ? 'Parking მოდული phase 2-ში მხოლოდ single zone-ად რჩება.'
                : 'Corridor მოდული ამ ეტაპზე single-floor semantics-ზე რჩება.'}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-card border border-bdr bg-sur p-4 shadow-card">
        <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
          პარამეტრები
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {selectedModule.type === 'stair' ? (
            <>
              <NumberField label="Floors" value={selectedModule.params.floors} min={2} max={40} onChange={(value) => onUpdate({params: {...selectedModule.params, floors: Math.round(value)}} as Partial<TModule>)} />
              <NumberField label="Floor H" value={selectedModule.params.floorH} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, floorH: value}, repeats: {axis: 'Y', count: stackCount, step: value}} as Partial<TModule>)} />
              <NumberField label="Shaft W" value={selectedModule.params.shaftW} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, shaftW: value}} as Partial<TModule>)} />
              <NumberField label="Shaft D" value={selectedModule.params.shaftD} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, shaftD: value}} as Partial<TModule>)} />
              <NumberField label="Door W" value={selectedModule.params.doorW} step={10} onChange={(value) => onUpdate({params: {...selectedModule.params, doorW: value}} as Partial<TModule>)} />
              <NumberField label="Δp" value={selectedModule.params.dp} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, dp: value}} as Partial<TModule>)} />
            </>
          ) : null}

          {selectedModule.type === 'elevator' ? (
            <>
              <NumberField label="Floors" value={selectedModule.params.floors} min={2} max={40} onChange={(value) => onUpdate({params: {...selectedModule.params, floors: Math.round(value)}} as Partial<TModule>)} />
              <NumberField label="Floor H" value={selectedModule.params.floorH} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, floorH: value}, repeats: {axis: 'Y', count: stackCount, step: value}} as Partial<TModule>)} />
              <NumberField label="Velocity" value={selectedModule.params.velocity} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, velocity: value}} as Partial<TModule>)} />
              <NumberField label="Cabin W" value={selectedModule.params.cabinW} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, cabinW: value}} as Partial<TModule>)} />
              <NumberField label="Cabin D" value={selectedModule.params.cabinD} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, cabinD: value}} as Partial<TModule>)} />
              <NumberField label="Δp" value={selectedModule.params.dp} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, dp: value}} as Partial<TModule>)} />
            </>
          ) : null}

          {selectedModule.type === 'parking' ? (
            <>
              <NumberField label="Area" value={selectedModule.params.area} step={50} onChange={(value) => onUpdate({params: {...selectedModule.params, area: value}} as Partial<TModule>)} />
              <NumberField label="Ceiling H" value={selectedModule.params.ceilingH} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, ceilingH: value}} as Partial<TModule>)} />
              <NumberField label="Spots" value={selectedModule.params.spots} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, spots: Math.round(value)}} as Partial<TModule>)} />
              <NumberField label="Fans" value={selectedModule.params.fanCount} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, fanCount: Math.round(value)}} as Partial<TModule>)} />
              <NumberField label="Thrust" value={selectedModule.params.fanThrust} step={5} onChange={(value) => onUpdate({params: {...selectedModule.params, fanThrust: value}} as Partial<TModule>)} />
              <NumberField label="Ramp W" value={selectedModule.params.ramp.w} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, ramp: {...selectedModule.params.ramp, w: value}}} as Partial<TModule>)} />
            </>
          ) : null}

          {selectedModule.type === 'corridor' ? (
            <>
              <NumberField label="Length" value={selectedModule.params.length} step={0.5} onChange={(value) => onUpdate({params: {...selectedModule.params, length: value}} as Partial<TModule>)} />
              <NumberField label="Width" value={selectedModule.params.width} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, width: value}} as Partial<TModule>)} />
              <NumberField label="Height" value={selectedModule.params.height} step={0.1} onChange={(value) => onUpdate({params: {...selectedModule.params, height: value}} as Partial<TModule>)} />
              <NumberField label="Rooms" value={selectedModule.params.roomCount} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, roomCount: Math.round(value)}} as Partial<TModule>)} />
              <NumberField label="Stair Δp" value={selectedModule.params.stairDp ?? 50} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, stairDp: value}} as Partial<TModule>)} />
              <NumberField label="Corridor Δp" value={selectedModule.params.dp} step={1} onChange={(value) => onUpdate({params: {...selectedModule.params, dp: value}} as Partial<TModule>)} />
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-card border border-bdr bg-sur p-4 shadow-card">
        <button
          type="button"
          onClick={onOpenInSimulator}
          className="inline-flex w-full items-center justify-center rounded-[6px] bg-blue px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-2"
        >
          გახსენი სიმულატორში
        </button>
      </div>
    </div>
  );
}

export function ComposerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dxfInputRef = useRef<HTMLInputElement>(null);
  const building = useComposerStore((state) => state.building);
  const selectedId = useComposerStore((state) => state.selectedId);
  const pendingType = useComposerStore((state) => state.pendingType);
  const lastSavedAt = useComposerStore((state) => state.lastSavedAt);
  const hoverPoint = useComposerStore((state) => state.hoverPoint);
  const gizmoMode = useComposerStore((state) => state.gizmoMode);
  const hydrated = useComposerStore((state) => state.hydrated);
  const hydrate = useComposerStore((state) => state.hydrate);
  const setBuildingName = useComposerStore((state) => state.setBuildingName);
  const setSelectedId = useComposerStore((state) => state.setSelectedId);
  const setPendingType = useComposerStore((state) => state.setPendingType);
  const setHoverPoint = useComposerStore((state) => state.setHoverPoint);
  const setGizmoMode = useComposerStore((state) => state.setGizmoMode);
  const addModule = useComposerStore((state) => state.addModule);
  const replaceBuilding = useComposerStore((state) => state.replaceBuilding);
  const updateModule = useComposerStore((state) => state.updateModule);
  const removeModule = useComposerStore((state) => state.removeModule);
  const autosave = useComposerStore((state) => state.autosave);
  const save = useComposerStore((state) => state.save);
  const load = useComposerStore((state) => state.load);
  const [dxfSourceModel, setDxfSourceModel] = useState<DxfLoaded | null>(null);
  const [dxfStatus, setDxfStatus] = useState<'idle' | 'reading' | 'parsing' | 'ready' | 'error'>('idle');
  const [dxfError, setDxfError] = useState<string | null>(null);
  const [dxfShowText, setDxfShowText] = useState(false);
  const [dxfVisibleLayers, setDxfVisibleLayers] = useState<Record<string, boolean>>({});
  const [dxfOverrides, setDxfOverrides] = useState<Record<string, DxfClassification>>({});
  const [dxfSelectedEntityId, setDxfSelectedEntityId] = useState<string | null>(null);
  const [dxfClassificationFilter, setDxfClassificationFilter] =
    useState<DxfClassificationFilter>('all');

  const selectedModule = useMemo(
    () => building.modules.find((module) => module.id === selectedId) ?? null,
    [building.modules, selectedId]
  );
  const dxfClassificationResult = useMemo(
    () => (dxfSourceModel ? classifyEntities(dxfSourceModel, dxfOverrides) : null),
    [dxfOverrides, dxfSourceModel]
  );
  const dxfModel = useMemo(
    () =>
      dxfSourceModel && dxfClassificationResult
        ? applyClassificationResult(dxfSourceModel, dxfClassificationResult)
        : null,
    [dxfClassificationResult, dxfSourceModel]
  );
  const selectedDxfEntity = useMemo(
    () => dxfModel?.entities.find((entity) => entity.id === dxfSelectedEntityId) ?? null,
    [dxfModel, dxfSelectedEntityId]
  );

  const applySelectedPatch = (patch: Partial<TModule>) => {
    if (!selectedModule) return;

    let nextBuilding = updateBuildingModule(building, selectedModule.id, patch);
    const nextSelected = nextBuilding.modules.find((item) => item.id === selectedModule.id);

    if (
      nextSelected &&
      (nextSelected.type === 'stair' || nextSelected.type === 'elevator') &&
      patch.params &&
      'floorH' in patch.params
    ) {
      const connectedCorridors = findConnected(nextBuilding, nextSelected.id).filter(
        (item): item is Extract<TModule, {type: 'corridor'}> => item.type === 'corridor'
      );

      if (connectedCorridors.length) {
        const shouldSync = window.confirm(
          `სინქრონიზაცია? ${connectedCorridors.length} დაკავშირებული corridor მოდული განახლდეს?`
        );

        if (shouldSync) {
          connectedCorridors.forEach((corridor) => {
            nextBuilding = updateBuildingModule(
              nextBuilding,
              corridor.id,
              createCorridorSyncPatch(corridor, nextSelected)
            );
          });
        } else {
          connectedCorridors.forEach((corridor) => {
            nextBuilding = disconnectModules(nextBuilding, nextSelected.id, corridor.id);
          });
        }
      }
    }

    replaceBuilding(nextBuilding);
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => autosave(), 2000);
    return () => window.clearTimeout(timer);
  }, [autosave, building, hydrated]);

  useEffect(() => {
    if (!dxfSourceModel || !dxfClassificationResult) return;
    writeDxfClassificationCache(dxfSourceModel.hash, dxfClassificationResult.cache);
  }, [dxfClassificationResult, dxfSourceModel]);

  useEffect(() => {
    if (!dxfModel || !dxfSelectedEntityId) return;
    const exists = dxfModel.entities.some((entity) => entity.id === dxfSelectedEntityId);
    if (!exists) {
      setDxfSelectedEntityId(null);
    }
  }, [dxfModel, dxfSelectedEntityId]);

  const statusLine = selectedModule
    ? `${selectedModule.type} · x ${selectedModule.transform.x.toFixed(1)} · z ${selectedModule.transform.z.toFixed(1)}`
    : 'არაფერი არჩეული';
  const visibleDxfLayers = useMemo(
    () =>
      Object.entries(dxfVisibleLayers)
        .filter(([, visible]) => visible)
        .map(([name]) => name),
    [dxfVisibleLayers]
  );
  const dxfFilteredLayerCounts = useMemo(() => {
    if (!dxfModel) return {};

    return dxfModel.entities.reduce<Record<string, number>>((acc, entity) => {
      if (!matchesClassificationFilter(entity, dxfClassificationFilter)) {
        return acc;
      }
      acc[entity.layer] = (acc[entity.layer] ?? 0) + 1;
      return acc;
    }, {});
  }, [dxfClassificationFilter, dxfModel]);

  const handleDxfUpload = async (file: File) => {
    setDxfError(null);
    setDxfStatus('reading');

    try {
      const text = await file.text();
      setDxfStatus('parsing');
      const parsed = await parseDxfText(text, file.name);
      const cachedOverrides = parsed.entities.reduce<Record<string, DxfClassification>>((acc, entity) => {
        if (entity.classification !== undefined) {
          acc[entity.handle] = entity.classification ?? null;
        }
        return acc;
      }, {});
      setDxfSourceModel({
        ...parsed,
        entities: parsed.entities.map((entity) => ({
          ...entity,
          classification: null
        }))
      });
      setDxfOverrides(cachedOverrides);
      setDxfVisibleLayers(
        parsed.layers.reduce<Record<string, boolean>>((acc, layer) => {
          acc[layer.name] = layer.visible;
          return acc;
        }, {})
      );
      setDxfSelectedEntityId(null);
      setDxfClassificationFilter('all');
      setDxfStatus('ready');
    } catch (error) {
      setDxfSourceModel(null);
      setDxfOverrides({});
      setDxfVisibleLayers({});
      setDxfStatus('error');
      setDxfError(error instanceof Error ? error.message : 'DXF ვერ ჩაიტვირთა.');
    }
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col bg-bg">
      <header className="border-b border-bdr bg-sur px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              Building name
            </label>
            <input
              type="text"
              value={building.name}
              onChange={(event) => setBuildingName(event.target.value)}
              className="w-full rounded-[6px] border-[1.5px] border-bdr bg-sur px-3 py-2 text-[14px] font-semibold text-navy outline-none focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-blue px-3.5 text-xs font-semibold text-white transition-colors hover:bg-navy-2"
            >
              <Save size={14} />
              Save JSON
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
            >
              <Upload size={14} />
              Load
            </button>
            <button
              type="button"
              onClick={() => dxfInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
            >
              <ScanSearch size={14} />
              DXF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
            >
              <FolderOpen size={14} />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 gap-3 p-3 md:grid-cols-[250px_minmax(0,1fr)_320px] md:p-4">
        <aside className="min-h-0 overflow-y-auto rounded-card border border-bdr bg-sur p-3 shadow-card">
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
            Library
          </div>
          <div className="grid gap-2">
            {([
              {type: 'stair', title: 'Stair', desc: 'vertical egress core'},
              {type: 'elevator', title: 'Elevator', desc: 'lift shaft + cabin'},
              {type: 'parking', title: 'Parking', desc: 'jet fan / extract zone'},
              {type: 'corridor', title: 'Corridor', desc: 'refuge / lobby pressure'}
            ] as const).map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setPendingType(pendingType === item.type ? null : item.type)}
                className={`rounded-card border p-3 text-left transition-colors ${
                  pendingType === item.type
                    ? 'border-blue bg-blue-lt'
                    : 'border-bdr bg-sur-2 hover:border-blue-bd hover:bg-blue-lt'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Box size={14} className="text-blue" />
                  <span className="text-[13px] font-bold text-navy">{item.title}</span>
                </div>
                <div className="text-[11px] text-text-2">{item.desc}</div>
                <div className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  {pendingType === item.type ? 'click grid to place' : 'click to add'}
                </div>
              </button>
            ))}
          </div>

          <div className="my-4 border-t border-bdr" />

          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
            Presets
          </div>
          <div className="grid gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => replaceBuilding(preset.build())}
                className="rounded-card border border-bdr bg-sur-2 p-3 text-left transition-colors hover:border-blue-bd hover:bg-blue-lt"
              >
                <div className="text-[13px] font-bold text-navy">{preset.name}</div>
                <div className="text-[11px] text-text-2">{preset.meta}</div>
              </button>
            ))}
          </div>

          <DxfPanel
            model={dxfModel}
            status={dxfStatus}
            error={dxfError}
            showText={dxfShowText}
            visibleLayers={dxfVisibleLayers}
            filteredLayerCounts={dxfFilteredLayerCounts}
            classificationResult={dxfClassificationResult}
            classificationFilter={dxfClassificationFilter}
            selectedEntity={selectedDxfEntity}
            onUpload={() => dxfInputRef.current?.click()}
            onClear={() => {
              setDxfSourceModel(null);
              setDxfOverrides({});
              setDxfSelectedEntityId(null);
              setDxfClassificationFilter('all');
              setDxfVisibleLayers({});
              setDxfError(null);
              setDxfStatus('idle');
            }}
            onShowText={setDxfShowText}
            onClassificationFilter={setDxfClassificationFilter}
            onClassificationChange={(value) => {
              if (!selectedDxfEntity) return;
              setDxfOverrides((prev) => ({
                ...prev,
                [selectedDxfEntity.handle]: value
              }));
            }}
            onSelectEntity={setDxfSelectedEntityId}
            onToggleLayer={(name) =>
              setDxfVisibleLayers((prev) => ({
                ...prev,
                [name]: !prev[name]
              }))
            }
            onToggleAll={(visible) => {
              if (!dxfModel) return;
              setDxfVisibleLayers(
                dxfModel.layers.reduce<Record<string, boolean>>((acc, layer) => {
                  acc[layer.name] = visible;
                  return acc;
                }, {})
              );
            }}
          />
        </aside>

        <section className="min-h-0 rounded-card border border-bdr bg-sur p-3 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[15px] font-bold text-navy">3D Composer Scene</div>
              <div className="text-[11px] text-text-2">
                50×50მ grid · click card then click grid to place · selected module gets gizmo
              </div>
            </div>
            {pendingType ? (
              <div className="rounded-pill border border-blue-bd bg-blue-lt px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-blue">
                pending: {pendingType}
              </div>
            ) : null}
          </div>

          <div className="h-[420px] md:h-[calc(100%-28px)] min-h-[420px]">
            <ComposerScene
              building={building}
              dxfModel={dxfModel}
              dxfVisibleLayers={visibleDxfLayers}
              dxfShowText={dxfShowText}
              dxfClassificationFilter={dxfClassificationFilter}
              dxfSelectedEntityId={dxfSelectedEntityId}
              selectedId={selectedId}
              pendingType={pendingType}
              gizmoMode={gizmoMode}
              onSelect={setSelectedId}
              onSelectDxfEntity={setDxfSelectedEntityId}
              onHoverPoint={setHoverPoint}
              onPlacePending={(transform) => {
                if (!pendingType) return;
                addModule(pendingType, transform);
              }}
              onTransformChange={(id, transform) => updateModule(id, {transform} as Partial<TModule>)}
              onConnectModules={(sourceId, targetId, transform) => {
                let nextBuilding = updateBuildingModule(building, sourceId, {
                  transform
                } as Partial<TModule>);
                nextBuilding = connectModules(nextBuilding, sourceId, targetId);
                nextBuilding = syncConnectionPair(nextBuilding, sourceId, targetId);
                replaceBuilding(nextBuilding);
              }}
              onDisconnectModule={(id) => {
                const target = building.modules.find((item) => item.id === id);
                if (!target || !target.connections.length) return;
                if (!window.confirm(`მოვხსნათ ${target.connections.length} კავშირი ამ მოდულიდან?`)) {
                  return;
                }
                replaceBuilding(disconnectModules(building, id));
              }}
            />
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto">
          <EditorPanel
            selectedModule={selectedModule}
            onUpdate={applySelectedPatch}
            onRemove={() => {
              if (!selectedModule) return;
              removeModule(selectedModule.id);
            }}
            gizmoMode={gizmoMode}
            onGizmoMode={setGizmoMode}
            onOpenInSimulator={() => {
              if (!selectedModule) return;
              const launch = buildSimulatorLaunch(selectedModule);
              const encoded = btoa(JSON.stringify(launch.payload));
              window.open(`${launch.href}?state=${encodeURIComponent(encoded)}`, '_blank', 'noopener,noreferrer');
            }}
          />
        </aside>
      </div>

      <div className="border-t border-bdr bg-sur px-4 py-2 md:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-2">
          <span>{building.modules.length} modules</span>
          <span>selected: {statusLine}</span>
          <span>autosave: {formatStamp(lastSavedAt)}</span>
          <span>
            hover: {hoverPoint ? `${hoverPoint.x.toFixed(1)}, ${hoverPoint.z.toFixed(1)}` : '—'}
          </span>
          <span>
            dxf:{' '}
            {dxfModel
              ? `${visibleDxfLayers.length}/${dxfModel.layers.length} layers · ${dxfModel.entities.length} entity · ${dxfModel.unit}`
              : '—'}
          </span>
          <span>
            classes:{' '}
            {dxfClassificationResult
              ? `${dxfClassificationResult.stats.wall} wall · ${dxfClassificationResult.stats.door} door · ${dxfClassificationResult.stats.window} window · ${dxfClassificationResult.stats.annotation} annotation · ${dxfClassificationResult.stats.ambiguous} ambiguous`
              : '—'}
          </span>
          <span className="text-text-3">
            <Link href="/calc/docs/physics" className="font-semibold text-blue hover:underline">
              physics docs
            </Link>
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.item(0);
          if (!file) return;
          try {
            await load(file);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'JSON ვერ ჩაიტვირთა.';
            window.alert(message);
          } finally {
            input.value = '';
          }
        }}
      />
      <input
        ref={dxfInputRef}
        type="file"
        accept=".dxf,.DXF,text/plain,application/dxf"
        hidden
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.item(0);
          if (!file) return;
          try {
            await handleDxfUpload(file);
          } finally {
            input.value = '';
          }
        }}
      />
    </div>
  );
}
