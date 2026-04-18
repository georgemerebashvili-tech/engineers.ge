# Task 021 — 3D Wall Extrude + Edit

**Delegated to:** Claude (UX + 3D) + Codex (CSG math)
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 019, 020

## მიზანი

Classified walls → 3D extrude (vertical prisms). Door/window entities → CSG openings. User-ს შეუძლია edit: height change, delete, split, add opening.

## Workflow

1. Walls identified (019 + 020)
2. User clicks "🧱 Extrude walls" button
3. Each wall entity → `ExtrudeGeometry` or `BoxGeometry` (vertical prism)
4. For each door/window in wall → CSG subtract opening
5. Rooms auto-detected from closed polylines
6. Result: 3D building shell

## Extrusion params

```ts
interface ExtrudeParams {
  height: number;      // default: 3.0m
  thickness: number;   // default from DXF pair distance, fallback 200mm
  material: THREE.Material;
  addCap: boolean;     // top face yes/no
}
```

User panel:
- Global height slider (applies to all)
- Per-wall override (select wall → "height: [__] m")
- Material preview: concrete / drywall / brick (visual variation)

## Wall meshes

Each wall = single `Mesh` with:
- `userData.entityId` (original DXF id)
- `userData.type = 'wall'`
- `userData.height`
- `userData.thickness`

## Openings (CSG)

Use `three-bvh-csg` (fast CSG library):
```bash
npm i three-bvh-csg
```

```ts
import { Evaluator, Brush } from 'three-bvh-csg';
const evaluator = new Evaluator();
const wallBrush = new Brush(wallGeom);
const openingBrush = new Brush(openingGeom);
const result = evaluator.evaluate(wallBrush, openingBrush, SUBTRACTION);
```

Door opening default: 900 × 2100mm, aligned to door entity position.
Window opening: from window entity geometry.

## Edit actions

- **Select wall:** click → highlight outline
- **Change height:** slider in side panel, live update
- **Delete:** Delete key / button
- **Split:** click on wall at point → splits in two (for adding mid-opening)
- **Add opening:** right-click wall → "add door" or "add window" → drag size

## Acceptance

- [ ] Extrude button creates 3D walls from classified entities in < 5s
- [ ] Door/window openings visible in walls (not blocked)
- [ ] Per-wall edit panel works (select → edit → applies)
- [ ] Room floors generated (from closed polylines as plane meshes)
- [ ] Shadows cast correctly
- [ ] Light/dark theme (same 3D tokens as stair sim)
- [ ] Camera orbit works (OrbitControls)
- [ ] Save state includes extruded walls in Building schema (new `dxfSource.walls` field)

## Extension of Module schema

```ts
// lib/building/module-schema.ts additions
export const ExtractedWall = z.object({
  id: z.string(),
  entityId: z.string(),   // from DXF
  startPoint: z.tuple([z.number(), z.number()]),  // XZ
  endPoint: z.tuple([z.number(), z.number()]),
  height: z.number().positive(),
  thickness: z.number().positive(),
  openings: z.array(z.object({
    type: z.enum(['door', 'window']),
    position: z.number(),   // distance along wall
    width: z.number().positive(),
    height: z.number().positive(),
    sillHeight: z.number().default(0),
  })).default([]),
});

export const Building = Building.extend({
  dxfSource: z.object({
    filename: z.string(),
    hash: z.string(),
    walls: z.array(ExtractedWall),
    units: z.string(),
    bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }).optional(),
});
```

## Open Questions

- [ ] Multi-floor extrusion? (walls repeat vertically × N floors)
  → **Rec:** yes — single DXF plan × N floors default
- [ ] Roof generation?
  → **Rec:** Phase 4 (out of scope)

---

**Status:** pending
