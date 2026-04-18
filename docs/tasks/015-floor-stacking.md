# Task 015 — Floor Stacking for Stair/Elevator Modules

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2
**Depends on:** 013 (schema), 014 (composer)

## მიზანი

Stair + Elevator მოდულებს აქვთ `repeats: { axis: 'Y', count: N, step: floorH }`. მხოლოდ ერთი definition, 3D-ში ავტომატურად ვერტიკალურად განმეორდება × N.

## ქცევა

- **Composer UI**: selected stair/lift → extra control "× სართული: [ 5 ]" stepper
- ცვლის `module.repeats.count`
- `module.repeats.step` = `params.floorH` (auto-synced)
- 3D-ში ერთი mesh-group × N, `InstancedMesh` დიდი count-ისთვის (>10)
- Connected corridors/parking auto-align გადავა Task 016-ზე, სადაც connections UI დაემატება

## ტექნიკური

```ts
function renderStackedModule(module: TModule, scene: THREE.Scene) {
  if (!module.repeats) { /* render once */ return; }
  const { count, step } = module.repeats;
  for (let i = 0; i < count; i++) {
    const group = buildModuleMesh(module);
    group.position.y = i * step;
    scene.add(group);
  }
}
```

**For performance (N > 20):**
```ts
const dummy = new THREE.Object3D();
const geom = buildModuleGeometry(module);
const mesh = new THREE.InstancedMesh(geom, mat, count);
for (let i = 0; i < count; i++) {
  dummy.position.y = i * step;
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
```

## Acceptance

- [x] Stair/Elevator modules render × N in composer 3D
- [x] Stepper in selected-module panel updates count live
- [x] Memory: N=40 smooth (InstancedMesh used above N>10)
- [x] Save/Load preserves repeats config
- [x] Parking module — cannot stack (disabled stepper, greyed)
- [x] Corridor module — can have `repeats` but different semantics: repeated horizontally? Phase 1 = single floor only, no stack for corridor

## Edge Cases

- Count = 1 → behaves like single
- Count changes → full rebuild of that module's meshes (don't crash)
- Removing module → cleanup InstancedMesh geometry/material

---

**Status:** done (2026-04-18)
