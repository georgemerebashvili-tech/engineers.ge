# Task 018 — DXF Parser Integration

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 014 (composer)
**Blocks:** 019, 020, 021

## მიზანი

User ატვირთავს DXF → parse → render entities in 3D scene → ready for wall detection (Task 019).

## Dependencies

```bash
npm i dxf-parser
# optional rendering library (we'll render custom via Three.js):
# npm i dxf (has built-in SVG, but we want Three.js meshes)
```

## Flow

1. User clicks "📐 DXF ატვირთე" button on composer
2. File picker → `.dxf` only
3. FileReader → text content
4. `dxf-parser` → parsed object
5. Convert entities to Three.js geometry (LINE → Line, LWPOLYLINE → Line with vertices, etc.)
6. Add to scene as "DXF layer" group (toggleable visibility)
7. Auto-fit camera to DXF bounds

## Entity types to handle

| DXF Entity | Three.js representation |
|------------|-------------------------|
| LINE       | Line (2 vertices)       |
| LWPOLYLINE | Line (N vertices, closed or open) |
| POLYLINE   | Line (similar)          |
| CIRCLE     | LineSegments (tessellated circle) |
| ARC        | LineSegments (tessellated arc) |
| TEXT/MTEXT | Sprite with text texture (render only if `showText` toggle on) |
| INSERT     | Recursive block insertion (dereference `BLOCK`) |
| DIMENSION  | Ignore by default (or render greyed) |
| HATCH      | Ignore by default (too complex, Phase 3 later) |

## Data structure

```ts
interface DxfLoaded {
  hash: string;  // SHA-256 of file content
  filename: string;
  bounds: { min: Vec3, max: Vec3 };
  entities: DxfEntity[];
  layers: string[];
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';  // from $INSUNITS
}

interface DxfEntity {
  id: string;          // generated
  type: 'LINE' | 'LWPOLYLINE' | 'CIRCLE' | 'ARC' | 'TEXT' | 'INSERT';
  layer: string;
  handle: string;      // DXF native ID
  geometry: any;       // type-specific
  classification?: 'wall' | 'door' | 'window' | 'furniture' | 'annotation' | null;  // filled by 019/020
  meshRef?: THREE.Object3D;
}
```

## Acceptance

- [x] Upload `.dxf` → renders in < 3s for typical plan (<5000 entities)
- [x] Unit detection correct (scales from mm to scene meters)
- [x] Layers panel: toggle visibility per layer
- [x] Camera auto-fits to drawing bounds
- [x] Entity count displayed in status bar
- [x] Handle unsupported entities gracefully (skip with console warn)
- [x] Drawing re-upload with same hash → reuse cached classifications (Task 020-ready local cache helpers)

## UX

- Progress indicator during parse
- Error toast: "არასწორი DXF ფაილი" + details (`err.message`)
- Layers sidebar: list with checkbox per layer + color indicator (from DXF `aci`)

## Performance

- Parse in main thread is OK for <10k entities; if slow, move to `Worker`
- Merge LineSegments into single BufferGeometry for same-layer entities
- Use `LineBasicMaterial` (not `LineMaterial` which needs post-processing)

## File location

- `lib/dxf/parse.ts` — parse + normalize
- `lib/dxf/to-three.ts` — entity → Three.js mesh
- `components/composer/dxf-panel.tsx` — UI

## Delivered

- DXF upload is wired into `/calc/building-composer` header + left sidebar panel.
- Supported entities normalize into scene-meter coordinates and render as Three.js layer groups.
- Layer toggles, text toggle, bounds/unit/entity count and warning summary are visible in the composer UI.
- Camera auto-fit runs on DXF load, while DXF meshes stay click-through so module editing still works.
- Classification cache read/write helpers are prepared for Task 020 reuse by DXF hash.

---

**Status:** done (2026-04-19)
