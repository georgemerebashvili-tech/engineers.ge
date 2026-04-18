import {z} from 'zod';
import {
  BuildingSchema,
  ModuleSchema,
  SCHEMA_VERSION,
  type TBuilding,
  type TModule,
  type TModuleType,
  type TStandardRef,
  type TTransform
} from './module-schema';

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isoNow() {
  return new Date().toISOString();
}

function translateIssue(issue: z.ZodIssue) {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return `ველოდი ${issue.expected}, მაგრამ მივიღე ${issue.received}`;
    case z.ZodIssueCode.invalid_literal:
      return `მნიშვნელობა უნდა იყოს ზუსტად ${String(issue.expected)}`;
    case z.ZodIssueCode.invalid_enum_value:
      return `მნიშვნელობა უნდა იყოს ერთ-ერთი: ${issue.options.join(', ')}`;
    case z.ZodIssueCode.too_small:
      return `მნიშვნელობა ძალიან პატარაა; მინიმუმი არის ${issue.minimum}`;
    case z.ZodIssueCode.too_big:
      return `მნიშვნელობა ძალიან დიდია; მაქსიმუმი არის ${issue.maximum}`;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'uuid') return 'UUID ფორმატი არასწორია';
      if (issue.validation === 'datetime') return 'თარიღის ISO datetime ფორმატი არასწორია';
      return 'სტრიქონის ფორმატი არასწორია';
    case z.ZodIssueCode.unrecognized_keys:
      return `უცნობი ველები: ${issue.keys.join(', ')}`;
    case z.ZodIssueCode.invalid_union_discriminator:
      return `დისკრიმინატორი უნდა იყოს ერთ-ერთი: ${issue.options.join(', ')}`;
    default:
      return 'ვალიდაცია ვერ გავიდა';
  }
}

export function formatZodError(error: z.ZodError) {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'root';
    return `- ${path}: ${translateIssue(issue)} / ${issue.message}`;
  });
  return ['Validation failed / ვალიდაცია ვერ გავიდა:', ...lines].join('\n');
}

export function validateBuilding(raw: unknown): TBuilding {
  const parsed = BuildingSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export function validateModule(raw: unknown): TModule {
  const parsed = ModuleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export function safeValidateBuilding(raw: unknown) {
  return BuildingSchema.safeParse(raw);
}

const DEFAULT_STANDARD_BY_TYPE: Record<TModuleType, TStandardRef> = {
  stair: {id: 'EN-12101-6', classOrType: 'A'},
  elevator: {id: 'NFPA-92', classOrType: 'elevator'},
  parking: {id: 'ASHRAE-62.1', classOrType: 'normal'},
  corridor: {id: 'EN-12101-6', classOrType: 'B'}
};

const DEFAULT_TRANSFORM: TTransform = {x: 0, y: 0, z: 0, rotY: 0};

const DEFAULT_MODULE_TEMPLATES: Record<TModuleType, Omit<TModule, 'id'>> = {
  stair: {
    type: 'stair',
    name: 'Stair Module',
    standard: DEFAULT_STANDARD_BY_TYPE.stair,
    units: 'metric',
    transform: DEFAULT_TRANSFORM,
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
    type: 'elevator',
    name: 'Elevator Module',
    standard: DEFAULT_STANDARD_BY_TYPE.elevator,
    units: 'metric',
    transform: DEFAULT_TRANSFORM,
    connections: [],
    params: {
      floors: 12,
      floorH: 3,
      shaftW: 2.4,
      shaftD: 2.8,
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
    type: 'parking',
    name: 'Parking Module',
    standard: DEFAULT_STANDARD_BY_TYPE.parking,
    units: 'metric',
    transform: DEFAULT_TRANSFORM,
    connections: [],
    params: {
      area: 1500,
      ceilingH: 3.1,
      spots: 60,
      ramp: {w: 3.8, l: 14},
      fanCount: 6,
      fanThrust: 100,
      scenario: 'peak'
    }
  },
  corridor: {
    type: 'corridor',
    name: 'Corridor Module',
    standard: DEFAULT_STANDARD_BY_TYPE.corridor,
    units: 'metric',
    transform: DEFAULT_TRANSFORM,
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

function stableStringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function syncAutoRepeats(module: TModule): TModule {
  if (module.type !== 'stair' && module.type !== 'elevator') {
    return module;
  }

  const count = Math.max(1, Math.min(40, Math.round(module.repeats?.count ?? module.params.floors)));

  return {
    ...module,
    repeats: {
      axis: 'Y',
      count,
      step: module.params.floorH
    }
  };
}

export function createModule(type: TModuleType, override: Partial<TModule> = {}): TModule {
  const base = DEFAULT_MODULE_TEMPLATES[type];
  const merged = {
    ...base,
    ...override,
    standard: {...base.standard, ...(override.standard ?? {})},
    transform: {...base.transform, ...(override.transform ?? {})},
    repeats: override.repeats ?? base.repeats,
    connections: override.connections ?? base.connections,
    params: {
      ...base.params,
      ...(override as Partial<TModule>).params
    },
    id: override.id ?? createUuid(),
    type
  };

  return validateModule(syncAutoRepeats(validateModule(merged)));
}

export function createEmptyBuilding(name: string): TBuilding {
  const timestamp = isoNow();
  return validateBuilding({
    schemaVersion: SCHEMA_VERSION,
    id: createUuid(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    modules: [],
    meta: {}
  });
}

export function normalizeBuilding(building: TBuilding): TBuilding {
  return validateBuilding({
    ...building,
    modules: building.modules.map((item) => syncAutoRepeats(item))
  });
}

function touchBuilding(building: TBuilding) {
  return {
    ...building,
    updatedAt: isoNow()
  };
}

function mergeModulePatch(module: TModule, patch: Partial<TModule>): TModule {
  const candidate = {
    ...module,
    ...patch,
    standard: patch.standard ? {...module.standard, ...patch.standard} : module.standard,
    transform: patch.transform ? {...module.transform, ...patch.transform} : module.transform,
    repeats: patch.repeats === undefined ? module.repeats : patch.repeats,
    connections: patch.connections ?? module.connections,
    params: patch.params ? {...module.params, ...patch.params} : module.params
  };

  return validateModule(syncAutoRepeats(validateModule(candidate)));
}

export function addModule(building: TBuilding, module: TModule): TBuilding {
  if (building.modules.some((item) => item.id === module.id)) {
    throw new Error(`Module with id "${module.id}" already exists / იგივე id უკვე არსებობს`);
  }

  return validateBuilding(
    touchBuilding({
      ...building,
      modules: [...building.modules, module]
    })
  );
}

export function removeModule(building: TBuilding, id: string): TBuilding {
  const modules = building.modules.filter((module) => module.id !== id);
  const cleaned = modules.map((module) =>
    module.connections.includes(id)
      ? {
          ...module,
          connections: module.connections.filter((connectionId) => connectionId !== id)
        }
      : module
  );

  return validateBuilding(
    touchBuilding({
      ...building,
      modules: cleaned
    })
  );
}

export function updateModule(building: TBuilding, id: string, patch: Partial<TModule>): TBuilding {
  const modules = building.modules.map((module) =>
    module.id === id ? mergeModulePatch(module, patch) : module
  );

  return validateBuilding(
    touchBuilding({
      ...building,
      modules
    })
  );
}

export function connectModules(building: TBuilding, fromId: string, toId: string): TBuilding {
  if (fromId === toId) return building;

  const modules = building.modules.map((item) => {
    if (item.id === fromId) {
      return {
        ...item,
        connections: Array.from(new Set([...item.connections, toId]))
      };
    }
    if (item.id === toId) {
      return {
        ...item,
        connections: Array.from(new Set([...item.connections, fromId]))
      };
    }
    return item;
  });

  return validateBuilding(
    touchBuilding({
      ...building,
      modules
    })
  );
}

export function disconnectModules(building: TBuilding, fromId: string, toId?: string): TBuilding {
  const modules = building.modules.map((item) => {
    if (item.id === fromId) {
      return {
        ...item,
        connections: toId ? item.connections.filter((id) => id !== toId) : []
      };
    }
    if (toId && item.id === toId) {
      return {
        ...item,
        connections: item.connections.filter((id) => id !== fromId)
      };
    }
    if (!toId && item.connections.includes(fromId)) {
      return {
        ...item,
        connections: item.connections.filter((id) => id !== fromId)
      };
    }
    return item;
  });

  return validateBuilding(
    touchBuilding({
      ...building,
      modules
    })
  );
}

export function findConnected(building: TBuilding, id: string): TModule[] {
  const target = building.modules.find((module) => module.id === id);
  if (!target) return [];
  const linked = new Set(target.connections);
  return building.modules.filter(
    (module) => module.id !== id && (linked.has(module.id) || module.connections.includes(id))
  );
}

export function diffModules(previous: TBuilding, next: TBuilding) {
  const prevMap = new Map(previous.modules.map((module) => [module.id, module]));
  const nextMap = new Map(next.modules.map((module) => [module.id, module]));

  const added = next.modules.filter((module) => !prevMap.has(module.id));
  const removed = previous.modules.filter((module) => !nextMap.has(module.id));
  const updated = next.modules.filter((module) => {
    const prev = prevMap.get(module.id);
    return prev && stableStringify(prev) !== stableStringify(module);
  });
  const unchanged = next.modules.filter((module) => {
    const prev = prevMap.get(module.id);
    return prev && stableStringify(prev) === stableStringify(module);
  });

  return {added, removed, updated, unchanged};
}

export function roundTripBuilding(raw: unknown): TBuilding {
  const parsed = validateBuilding(raw);
  return validateBuilding(JSON.parse(JSON.stringify(parsed)));
}

export const MODULE_FIXTURES = {
  stair: createModule('stair', {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Fixture Stair',
    repeats: {axis: 'Y', count: 5, step: 3},
    connections: ['22222222-2222-4222-8222-222222222222']
  }),
  elevator: createModule('elevator', {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Fixture Elevator',
    connections: ['11111111-1111-4111-8111-111111111111']
  }),
  parking: createModule('parking', {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Fixture Parking'
  }),
  corridor: createModule('corridor', {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Fixture Corridor',
    connections: ['11111111-1111-4111-8111-111111111111']
  })
} as const;

export const BUILDING_FIXTURE: TBuilding = validateBuilding({
  schemaVersion: SCHEMA_VERSION,
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Fixture Building',
  createdAt: '2026-04-18T10:00:00.000Z',
  updatedAt: '2026-04-18T10:30:00.000Z',
  modules: Object.values(MODULE_FIXTURES),
  meta: {
    author: 'engineers.ge',
    description: 'Round-trip validation fixture',
    dxfSource: 'fixture.dxf'
  }
});

export function validateFixtures() {
  const parsed = validateBuilding(BUILDING_FIXTURE);
  const roundTrip = roundTripBuilding(parsed);
  const diff = diffModules(parsed, roundTrip);

  return {
    parsed,
    roundTrip,
    diff,
    stable: stableStringify(parsed) === stableStringify(roundTrip)
  };
}
