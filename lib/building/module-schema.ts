import {z} from 'zod';

export const SCHEMA_VERSION = 1 as const;

export const ModuleTypeSchema = z.enum(['stair', 'elevator', 'parking', 'corridor']);
export const UnitsSchema = z.enum(['metric', 'imperial']);
export const RepeatAxisSchema = z.enum(['Y']);
export const StandardIdSchema = z.enum(['EN-12101-6', 'NFPA-92', 'SP-7.13130', 'ASHRAE-62.1']);

export const TransformSchema = z
  .object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
    rotY: z.number().default(0)
  })
  .strict();

export const RepeatSchema = z
  .object({
    axis: RepeatAxisSchema.default('Y'),
    count: z.number().int().min(1).max(40),
    step: z.number().positive()
  })
  .strict();

export const StandardRefSchema = z
  .object({
    id: StandardIdSchema,
    classOrType: z.string().min(1).max(64)
  })
  .strict();

export const BaseModuleSchema = z
  .object({
    id: z.string().uuid(),
    type: ModuleTypeSchema,
    name: z.string().min(1).max(200).optional(),
    standard: StandardRefSchema,
    units: UnitsSchema.default('metric'),
    transform: TransformSchema.default({x: 0, y: 0, z: 0, rotY: 0}),
    repeats: RepeatSchema.optional(),
    connections: z.array(z.string().uuid()).default([])
  })
  .strict();

export const StairParamsSchema = z
  .object({
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
    dp: z.number().positive()
  })
  .strict();

export const ElevatorParamsSchema = z
  .object({
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
    includeMachineRoom: z.boolean().default(false)
  })
  .strict();

export const ParkingParamsSchema = z
  .object({
    area: z.number().positive(),
    ceilingH: z.number().positive(),
    spots: z.number().int().min(1),
    ramp: z
      .object({
        w: z.number().positive(),
        l: z.number().positive()
      })
      .strict(),
    fanCount: z.number().int().min(0),
    fanThrust: z.number().min(0),
    scenario: z.enum(['normal', 'peak', 'fire'])
  })
  .strict();

export const CorridorParamsSchema = z
  .object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    roomCount: z.number().int().min(0),
    stairDp: z.number().min(0).optional(),
    liftDp: z.number().min(0).optional(),
    openDoors: z.array(z.number().int().nonnegative()).default([]),
    dp: z.number().positive()
  })
  .strict();

export const StairModuleSchema = BaseModuleSchema.extend({
  type: z.literal('stair'),
  params: StairParamsSchema
}).strict();

export const ElevatorModuleSchema = BaseModuleSchema.extend({
  type: z.literal('elevator'),
  params: ElevatorParamsSchema
}).strict();

export const ParkingModuleSchema = BaseModuleSchema.extend({
  type: z.literal('parking'),
  params: ParkingParamsSchema
}).strict();

export const CorridorModuleSchema = BaseModuleSchema.extend({
  type: z.literal('corridor'),
  params: CorridorParamsSchema
}).strict();

export const ModuleSchema = z.discriminatedUnion('type', [
  StairModuleSchema,
  ElevatorModuleSchema,
  ParkingModuleSchema,
  CorridorModuleSchema
]);

export const BuildingMetaSchema = z
  .object({
    author: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    dxfSource: z.string().min(1).max(300).optional()
  })
  .strict();

export const BuildingSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    modules: z.array(ModuleSchema),
    meta: BuildingMetaSchema.default({})
  })
  .strict();

export type TModuleType = z.infer<typeof ModuleTypeSchema>;
export type TUnits = z.infer<typeof UnitsSchema>;
export type TStandardId = z.infer<typeof StandardIdSchema>;
export type TTransform = z.infer<typeof TransformSchema>;
export type TRepeat = z.infer<typeof RepeatSchema>;
export type TStandardRef = z.infer<typeof StandardRefSchema>;
export type TStairParams = z.infer<typeof StairParamsSchema>;
export type TElevatorParams = z.infer<typeof ElevatorParamsSchema>;
export type TParkingParams = z.infer<typeof ParkingParamsSchema>;
export type TCorridorParams = z.infer<typeof CorridorParamsSchema>;
export type TStairModule = z.infer<typeof StairModuleSchema>;
export type TElevatorModule = z.infer<typeof ElevatorModuleSchema>;
export type TParkingModule = z.infer<typeof ParkingModuleSchema>;
export type TCorridorModule = z.infer<typeof CorridorModuleSchema>;
export type TModule = z.infer<typeof ModuleSchema>;
export type TBuildingMeta = z.infer<typeof BuildingMetaSchema>;
export type TBuilding = z.infer<typeof BuildingSchema>;
