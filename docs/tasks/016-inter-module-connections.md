# Task 016 — Inter-Module Connections (Snap, Align, Share)

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2
**Depends on:** 013, 014, 015

## მიზანი

მოდულები ერთმანეთს "იცნობენ". Corridor-ის კარი stair-ის კარს ემთხვევა. Floor heights იდენტურია. Shared parameter propagation.

## სცენარი

User ცდილობს corridor module-ის მიდება stair-ის გვერდზე:
1. **Snap on drag** — stair-ის wall-ს რომ ახლოვდება (< 0.5m), კორიდორი მიიხუტება + ხაზი ცისფრად იკითხება (alignment guide)
2. **On drop** — ავტომ კონფიგურდება:
   - Corridor floor height = stair floor height
   - Corridor height / pressure refs sync core module-ზე
   - `module.connections` array-ში ორივე მოდულს ერთმანეთი ემატება

## Connection types

```ts
type ConnectionType = 'adjacent' | 'shared-wall' | 'stacked';
type Connection = {
  from: string;  // module id
  to: string;
  type: ConnectionType;
  shared?: { params: string[] };  // which params sync (e.g. ['floorH'])
};
```

## Snap logic

- On drag: for each other module, compute nearest-wall distance in XZ plane
- Threshold: 0.5m → highlight target wall blue
- Threshold: 0.1m → snap (set X/Z exactly aligned, rotate if needed)
- Release → create connection entry

## Shared parameter propagation

- When user changes `stair.floorH` and stair connects to corridors:
  - Dialog: "სინქრონიზაცია? 3 connected module განახლდეს?" [✓ / ✗]
  - If yes → update all connected modules' floorH
  - If no → break connection

## Acceptance

- [x] Drag module → snap guides visible
- [x] Dropped modules that snap → `connections` array populated
- [x] Connection lines shown in 3D (thin blue dashed between linked modules)
- [x] Shared param change → confirmation dialog → propagates
- [x] Remove connection button (right-click module → "disconnect")
- [x] Save/Load round-trips connections

## Technical

- Bounding-box math for snap detection
- Throttle snap check to 60fps during drag
- Connection render: line between module centers, alpha 0.5

---

**Status:** done (2026-04-18)
