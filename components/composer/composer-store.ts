'use client';

import {create} from 'zustand';
import {
  addModule as addModuleToBuilding,
  createEmptyBuilding,
  createModule,
  normalizeBuilding,
  removeModule as removeModuleFromBuilding,
  updateModule as updateModuleInBuilding,
  validateBuilding
} from '@/lib/building/module-utils';
import type {TBuilding, TModule, TModuleType, TTransform} from '@/lib/building/module-schema';

const AUTOSAVE_KEY = 'eng_building_composer_v1';

type HoverPoint = {x: number; z: number} | null;
type GizmoMode = 'translate' | 'rotate';

type ComposerState = {
  building: TBuilding;
  selectedId: string | null;
  pendingType: TModuleType | null;
  lastSavedAt: string | null;
  hoverPoint: HoverPoint;
  gizmoMode: GizmoMode;
  hydrated: boolean;
  setBuildingName: (name: string) => void;
  setSelectedId: (id: string | null) => void;
  setPendingType: (type: TModuleType | null) => void;
  setHoverPoint: (point: HoverPoint) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  addModule: (type: TModuleType, transform?: Partial<TTransform>) => TModule;
  replaceBuilding: (building: TBuilding) => void;
  updateModule: (id: string, patch: Partial<TModule>) => void;
  removeModule: (id: string) => void;
  hydrate: () => void;
  autosave: () => void;
  save: () => void;
  load: (file: File) => Promise<void>;
};

function nextPlacement(index: number): TTransform {
  return {
    x: ((index % 4) - 1.5) * 4.5,
    y: 0,
    z: Math.floor(index / 4) * 4.5 - 4.5,
    rotY: 0
  };
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  building: createEmptyBuilding('ახალი building'),
  selectedId: null,
  pendingType: null,
  lastSavedAt: null,
  hoverPoint: null,
  gizmoMode: 'translate',
  hydrated: false,

  setBuildingName: (name) =>
    set((state) => ({
      building: validateBuilding({
        ...state.building,
        name: name || 'Untitled Building'
      })
    })),

  setSelectedId: (id) => set({selectedId: id}),
  setPendingType: (type) => set({pendingType: type}),
  setHoverPoint: (point) => set({hoverPoint: point}),
  setGizmoMode: (mode) => set({gizmoMode: mode}),

  addModule: (type, transform = {}) => {
    const state = get();
    const nextModule = createModule(type, {
      transform: {
        ...nextPlacement(state.building.modules.length),
        ...transform
      }
    });
    const building = addModuleToBuilding(state.building, nextModule);
    set({building, selectedId: nextModule.id, pendingType: null});
    return nextModule;
  },

  replaceBuilding: (building) =>
    set({
      building: normalizeBuilding(validateBuilding(building)),
      selectedId: building.modules[0]?.id ?? null,
      pendingType: null
    }),

  updateModule: (id, patch) =>
    set((state) => ({
      building: updateModuleInBuilding(state.building, id, patch)
    })),

  removeModule: (id) =>
    set((state) => {
      const building = removeModuleFromBuilding(state.building, id);
      return {
        building,
        selectedId: state.selectedId === id ? building.modules[0]?.id ?? null : state.selectedId
      };
    }),

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        set({hydrated: true});
        return;
      }
      const building = normalizeBuilding(validateBuilding(JSON.parse(raw)));
      set({
        building,
        selectedId: building.modules[0]?.id ?? null,
        hydrated: true
      });
    } catch {
      set({hydrated: true});
    }
  },

  autosave: () => {
    if (typeof window === 'undefined') return;
    const {building} = get();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(building));
    set({lastSavedAt: new Date().toISOString()});
  },

  save: () => {
    const {building} = get();
    const stamp = new Date().toISOString().replaceAll(':', '-').slice(0, 19);
    downloadJson(`building-composer-${stamp}.json`, building);
    set({lastSavedAt: new Date().toISOString()});
  },

  load: async (file) => {
    const text = await file.text();
    const building = normalizeBuilding(validateBuilding(JSON.parse(text)));
    set({
      building,
      selectedId: building.modules[0]?.id ?? null,
      lastSavedAt: new Date().toISOString()
    });
  }
}));
