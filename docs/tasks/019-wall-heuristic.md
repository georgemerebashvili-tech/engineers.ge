# Task 019 — Wall Detection Heuristic (Deterministic)

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 018

## მიზანი

Deterministic first-pass: ცნოს რომელი DXF entity-ები არიან კედლები geometry + layer heuristics-ით. მხოლოდ ცხადი cases-ებს. Ambiguous → Task 020-ს გადააბარე.

## Heuristic rules

### Rule 1 — Layer name matching

```ts
const WALL_LAYER_RE = /^(A[-_]?)?(WALL|WALLS|WAL|WND|კედ|СТЕН|MUR|WAND|MUR|MURO|PAR[-_]?EXT)/i;
const DOOR_LAYER_RE = /^(A[-_]?)?(DOOR|DRS|კარ|ДВЕР|PORTE|TUR|PUERTA)/i;
const WINDOW_LAYER_RE = /^(A[-_]?)?(WIN|GLZ|ფან|ОКН|FENETRE|FENSTER|VENTANA)/i;
const FURN_LAYER_RE = /^(A[-_]?)?(FURN|EQUIP|ავ|МЕБ|MOBIL|MOBEL)/i;
const DIM_LAYER_RE = /^(A[-_]?)?(DIM|ANNO|TEXT|NOTE|ნიშ|РАЗМ)/i;
```

→ If entity layer matches one pattern → classify accordingly.

### Rule 2 — Parallel LINE pairs (wall = two parallel edges)

- For each LINE, find other LINEs that are:
  - Parallel (angle diff < 1°)
  - Within 50–500mm perpendicular distance (typical wall thickness)
  - Overlap at least 60% in length
  - Same layer (preferred)
- If pair found → both classify as `wall`

### Rule 3 — Closed LWPOLYLINE = room boundary

- Closed polyline with >= 3 vertices → room outline
- Edges of that polyline → classify as `wall` (if not already classified)

### Rule 4 — Short LINEs crossing walls = doors

- LINE (200–1500mm long) that intersects/near wall + has perpendicular orientation
- Check if gap in wall at that location (two wall segments don't touch)
- → classify crossing LINE as `door`

### Rule 5 — Arcs inside walls = door swings

- ARC with center near wall opening + radius matching door width → `door` (swing indicator)

### Unknown / Ambiguous

- Anything remaining → `null` (will be sent to Claude API in Task 020)

## Implementation

```ts
// lib/dxf/wall-heuristic.ts
export function classifyEntities(dxf: DxfLoaded): ClassificationResult {
  const byLayer = applyLayerRules(dxf.entities);
  const parallel = findParallelPairs(byLayer);
  const rooms = findClosedPolylines(byLayer);
  const doors = findDoorCandidates(byLayer, parallel);
  const ambiguous = dxf.entities.filter(e => !e.classification);
  return {
    classified: dxf.entities.filter(e => e.classification),
    ambiguous,
    stats: { /* counts per class */ }
  };
}
```

## Output

```ts
interface ClassificationResult {
  classified: DxfEntity[];     // .classification set
  ambiguous: DxfEntity[];      // need Task 020
  stats: {
    wall: number;
    door: number;
    window: number;
    furniture: number;
    annotation: number;
    ambiguous: number;
  };
}
```

## Acceptance

- [ ] On typical residential plan DXF → >70% entities auto-classified
- [ ] Stats displayed in UI: "847 entities · 520 walls · 23 doors · 10 windows · 180 annotations · 114 ambiguous"
- [ ] User can manually override any classification (click entity → dropdown)
- [ ] Layer visibility filter updates based on classification
- [ ] False positive rate < 5% (visual verification on 3 sample plans)

## Test fixtures

Codex-ს უნდა მოიტანოს 3 ნიმუში DXF ფაილი:
1. `fixtures/dxf/residential-simple.dxf` (small plan)
2. `fixtures/dxf/office-complex.dxf`
3. `fixtures/dxf/parking-basement.dxf`

User action: mollige provides these (ან Claude-ი draft-ებს public sample-ებიდან).

---

**Status:** pending
