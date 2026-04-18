# Task 013 — Module Serialization Format

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2
**Depends on:** Phase 1 complete (007–012)
**Blocks:** 014, 015, 016, 017

## მიზანი

ერთი TypeScript schema, რომელსაც ყველა simulator + composer იყენებს state serialization-ისთვის. Zod-based validation.

## Files

- `lib/building/module-schema.ts` — Zod schemas + TS types
- `lib/building/module-utils.ts` — helpers (validate, merge, diff)
- `docs/specs/module-format.md` — human-readable spec

## Schema (Zod)

```ts
// lib/building/module-schema.ts
import { z } from 'zod';

export const ModuleType = z.enum(['stair', 'elevator', 'parking', 'corridor']);

export const Transform = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
  rotY: z.number().default(0),
});

export const Repeat = z.object({
  axis: z.enum(['Y']).default('Y'),
  count: z.number().int().min(1).max(40),
  step: z.number().positive(),
});

export const StandardRef = z.object({
  id: z.enum(['EN-12101-6', 'NFPA-92', 'SP-7.13130', 'ASHRAE-62.1']),
  classOrType: z.string(),
});

export const BaseModule = z.object({
  id: z.string().uuid(),
  type: ModuleType,
  name: z.string().optional(),
  standard: StandardRef,
  units: z.enum(['metric', 'imperial']).default('metric'),
  transform: Transform.default({}),
  repeats: Repeat.optional(),
  connections: z.array(z.string().uuid()).default([]),
});

export const StairParams = z.object({
  floors: z.number().int().min(2).max(40),
  floorH: z.number().positive(),
  basement: z.number().int().min(0).max(3).default(0),
  shaftW: z.number().positive(),
  shaftD: z.number().positive(),
  stairType: z.enum(['switchback', 'straight', 'spiral']),
  doorW: z.number().positive(),
  doorH: z.number().positive(),
  doorPos: z.enum(['front', 'side', 'alternate']),
  supply: z.enum(['bottom', 'top', 'both', 'per-floor']),
  dp: z.number().positive(),
});

export const ElevatorParams = z.object({
  floors: z.number().int().min(2).max(40),
  floorH: z.number().positive(),
  shaftW: z.number().positive(),
  shaftD: z.number().positive(),
  cabinW: z.number().positive(),
  cabinD: z.number().positive(),
  velocity: z.number().positive(),
  doorW: z.number().positive(),
  doorH: z.number().positive(),
  dp: z.number().positive(),
  includeMachineRoom: z.boolean().default(false),
});

export const ParkingParams = z.object({
  area: z.number().positive(),
  ceilingH: z.number().positive(),
  spots: z.number().int().min(1),
  ramp: z.object({ w: z.number().positive(), l: z.number().positive() }),
  fanCount: z.number().int().min(0),
  fanThrust: z.number().min(0),
  scenario: z.enum(['normal', 'peak', 'fire']),
});

export const CorridorParams = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  roomCount: z.number().int().min(0),
  stairDp: z.number().min(0).optional(),
  liftDp: z.number().min(0).optional(),
  openDoors: z.array(z.number().int().nonnegative()).default([]),
  dp: z.number().positive(),
});

export const StairModule     = BaseModule.extend({ type: z.literal('stair'),     params: StairParams });
export const ElevatorModule  = BaseModule.extend({ type: z.literal('elevator'),  params: ElevatorParams });
export const ParkingModule   = BaseModule.extend({ type: z.literal('parking'),   params: ParkingParams });
export const CorridorModule  = BaseModule.extend({ type: z.literal('corridor'),  params: CorridorParams });

export const Module = z.discriminatedUnion('type', [StairModule, ElevatorModule, ParkingModule, CorridorModule]);

export const Building = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  modules: z.array(Module),
  meta: z.object({
    author: z.string().optional(),
    description: z.string().optional(),
    dxfSource: z.string().optional(),   // filename/hash
  }).default({}),
});

export type TBuilding = z.infer<typeof Building>;
export type TModule = z.infer<typeof Module>;
```

## Utilities

```ts
// lib/building/module-utils.ts
export function validateBuilding(raw: unknown): TBuilding { return Building.parse(raw); }
export function createEmptyBuilding(name: string): TBuilding { /* ... */ }
export function addModule(b: TBuilding, m: TModule): TBuilding { /* immutable */ }
export function removeModule(b: TBuilding, id: string): TBuilding { /* ... */ }
export function updateModule(b: TBuilding, id: string, patch: Partial<TModule>): TBuilding { /* ... */ }
export function findConnected(b: TBuilding, id: string): TModule[] { /* ... */ }
```

## Acceptance

- [x] All schemas validated with test fixtures
- [x] Round-trip: parse(stringify(parse(raw))) === parse(raw)
- [x] TS types exported for consumption in simulators
- [x] Zod errors are human-readable in Georgian + English
- [x] `docs/specs/module-format.md` created with field table + example JSON

## Example JSON

```json
{
  "schemaVersion": 1,
  "id": "b8a1e7c4-...",
  "name": "ჩემი 5-სართული საცხოვრ.",
  "createdAt": "2026-04-18T10:00:00Z",
  "updatedAt": "2026-04-18T10:30:00Z",
  "modules": [
    {
      "id": "m1-...",
      "type": "stair",
      "standard": { "id": "EN-12101-6", "classOrType": "A" },
      "units": "metric",
      "transform": { "x": 0, "y": 0, "z": 0, "rotY": 0 },
      "repeats": { "axis": "Y", "count": 5, "step": 3.0 },
      "params": { "floors": 5, "floorH": 3.0, "shaftW": 2.4, "shaftD": 5.2, ... }
    }
  ],
  "meta": {}
}
```

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** targeted `tsc` passes for [`lib/building/module-schema.ts`](../../lib/building/module-schema.ts) and [`lib/building/module-utils.ts`](../../lib/building/module-utils.ts); targeted `eslint` is clean; fixture runtime round-trip via compiled temp JS returned `stable: true` with 4 unchanged modules; `git diff --check` is clean for schema/utils/spec files.
