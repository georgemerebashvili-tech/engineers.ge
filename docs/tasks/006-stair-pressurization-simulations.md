# Task 006 — სადარბაზოს დაწნეხვის ინტერაქტიული სიმულაციები

**Delegated to:** Codex
**Lead (visual done by):** Claude
**Created:** 2026-04-18

## კონტექსტი

ფაილი: [`public/calc/stair-pressurization.html`](../../public/calc/stair-pressurization.html)
URL: `/calc/stair-pressurization`

**რაც უკვე გაკეთდა (Claude · ვიზუალი):**
- 3-tab shell (Section SVG · Plan SVG · 3D Three.js)
- Standards selector — EN 12101-6 / NFPA 92 / СП 7.13130 (data-driven in `STANDARDS` object)
- 6 template preset-ი (`TEMPLATES` object)
- Parameters UI (floors, heights, door, shaft, supply, Δp)
- Airflow particles (rising/falling spheres)
- Fans (spinning blades, bottom/top/per-floor)
- Doors rendered as Three.js meshes + SVG rects
- std-info overlay per view
- Light/dark theme sync (3D scene re-themes on `html.dark` mutation)
- Drag-resizable sidebar

**რაც აკლია:** ინტერაქცია და dynamic სცენარი. ახლა სიმულატორი **static** არის — პარამეტრს ცვლი → ნახავი ხელახლა იხატება, მაგრამ "ცოცხალი სიმულაცია" არ არის.

## მიზანი

4 ინტერაქტიული სცენარი, **ყველა ვიზუალური მხოლოდ — მათემატიკა არ არის მოთხოვნა** (user-ის ცხადი მითითება: "გამიკეთე 3დ სმულაცია ... 3დ გენერატორი და უბრალოდ ვიზუალი და არა მათემატიკური ანგარიში").

### Priority 1 — ღია-კარის scenario

- **ინტერაქცია:** 3D tower-ზე click-ი ნებისმიერ კარზე → ის სართული "იღებს" კარს (leaf rotates ~75°), ხოლო მთლიანი 3D scene ვიზუალურად რეაგირებს:
  - ღია კარიდან airflow particles "გადიან" გარეთ (spawn arrow / particle stream სიჩქარით v_min კონკრეტული სტანდარტიდან)
  - ღია კარის ზევით/ქვევით particles უფრო მჭიდროდ (pressure drop visual)
  - სტატუს badge overlay-ში: "3 ღია კარი · Δp წვეთი ~15 Pa" (static label, არა რეალური calc)
- **SVG Section view**-ში იგივე: კარის მართკუთხედი ცრიფრდება ცისფრად, out-flow ისარი სქელდება
- **SVG Plan view**-ში: active floor indicator (pill) "Floor 3 · ღია"
- Click იქვე ან new click → closes

### Priority 2 — Door-force indicator

- 3D-ში ყოველი კარის გვერდით პატარა vertical bar (0–max N)
- ფერი gradient: გრძნ (0) → ყვ. (50%) → წით. (>90% of class.force limit)
- "Force" value derivation: **proportional visual** — `force ≈ Δp × doorArea × k`, სადაც k კოეფიციენტი რომ visually make sense (არა რეალური მექანიკა). default `k = 0.0015`
- სტანდარტის `force` limit-ს compares to this value
- Standards-ის გადართვისას bar-ები re-color (EN 100 N, СП 150 N, NFPA 133 N)

### Priority 3 — Fan failure toggle

- სიდებარში ახალი field: "⚠ ავარიული რეჟიმი" toggle (ერთი checkbox / seg button)
- ON-ზე: ვენტილატორები ჩერდებიან (rotation.y frozen), particles შედარდეს (vy *= 0.1), fan housing pulse-ებს წით. ფერში
- badge "System offline" show-დება std-info-ზე ქვემოთ (წითელი)
- OFF-ზე: ყველა აბრუნდება normal-ში

### Priority 4 — Smoke ingress visualization (bonus)

- Toggle: "კვამლი" seg button (off / slow / fast)
- On-ზე spawn "smoke" particles (grey/black semi-transparent spheres) გარედან, მიმართული შიგნით
- Pressurization on → smoke repelled (max radius shrinks), off → smoke fills shaft
- ვიზუალური მხოლოდ

## Acceptance Criteria

### P1 — Open door

- [ ] 3D-ში click any door mesh (Raycaster) → ის leaf ~75° rotates + stays open
- [ ] მეორე click იქვე → closes
- [ ] ერთდროულად რამდენიმე კარი შეიძლება იყოს ღია
- [ ] `state.openDoors: Set<floorIdx>` ცხოვრობს state-ში
- [ ] Section SVG `drawSection()` უშვებს ღია კარებს განსხვავებული სტილით (thicker blue outline + "OPEN" label)
- [ ] Plan SVG (active floor selector-ი ან ყველა ღია კარი რიგში) — minimal: badge list
- [ ] Particle flow adapts: ღია კარიდან ცალკე arrow ვიზუალი
- [ ] std-info overlay-ს აქვს rolling line: "ღია: 1, 3, 5 · Δp ~-10 Pa"

### P2 — Force indicator

- [ ] 3D-ში თითო კარის გვერდით (wall-ის გარე მხარე) vertical bar (height ~0.6m, width ~0.1m)
- [ ] Bar fill = `forcePct = min(1, (Δp × doorArea × 0.0015) / class.force)`
- [ ] Color: green <0.5, yellow <0.9, red ≥0.9
- [ ] Hover (OrbitControls-ს არ გაფუჭდეს) — tooltip HTML: "Floor N · ~XX N / max Y N"
- [ ] Standard-ის გადართვაზე bar-ები განახლდება

### P3 — Fan failure

- [ ] Sidebar "დაწნეხვის სცენარი" group-ში ახალი seg: "სისტემა" [ნორმა | ავარია]
- [ ] ON-"ავარია": fan rotor-ები ჩერდებიან, particles სიჩქარე × 0.1, fan housing material emissive წით.
- [ ] std-info-ში წით. badge "⚠ სისტემა გათიშულია"
- [ ] Force indicator bars → 0 (system off = no pressure)

### P4 — Smoke (bonus, if time)

- [ ] Seg: "კვამლი" [გათიშ. | ნელი | სწრაფი]
- [ ] On-ზე smoke particles spawn (grey spheres, alpha .35)
- [ ] Repelled by pressurization (when system ON); fills shaft when system OFF

## ტექნიკური მიდგომა

### State shape (extend existing)
```js
state.openDoors = new Set();      // Set<number> floorIdx (0=ground, 1=floor1, ...)
state.systemMode = 'normal';       // 'normal' | 'failure'
state.smokeMode = 'off';           // 'off' | 'slow' | 'fast'
```

### 3D door clicks (Raycaster pattern)
```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(doorLeaves, false);
  if (hits.length) toggleDoor(hits[0].object.userData.floorIdx);
});
```

**Important:** door leaf mesh-ებს უნდა მიუწერდეთ `userData.floorIdx` `build3D()`-ში.

### Door open animation (Tween-less, dt-based)
```js
doorLeaf.userData.targetRot = openDoors.has(idx) ? openAngle : 0;
// in animate3D:
doorLeaf.rotation.y = THREE.MathUtils.lerp(doorLeaf.rotation.y, doorLeaf.userData.targetRot, dt * 8);
```

### Force bars (Three.js meshes)
Reuse Mesh+BoxGeometry per door, parented to door frame. material.color განახლდება `apply3DTheme` ანალოგიურ rebuild ფუნქციაში.

### Performance
- Reuse geometries/materials — don't spawn new every frame
- Raycaster-ს თუ ცოცხლად ხშირად იძახი (hover) → throttle to 4Hz

## აუცილებელი ფაილები

- [`public/calc/stair-pressurization.html`](../../public/calc/stair-pressurization.html) — ერთადერთი file (standalone). ყველა cod შიგნით.
- მიიდე state/rendering ფუნქციები არსებული სტრუქტურის შესაბამისად: `state`, `build3D`, `drawSection`, `drawPlan`, `animate3D`, `apply3DTheme`, `redraw`.

## რა **არ** ჩაეტიოს

- ❌ რეალური CFD / CONTAM / აიროდინამიკული ფორმულები — მხოლოდ ვიზუალი
- ❌ PDF export / report generation — ეს `005-calc-auth-gate.md` scope-ში
- ❌ Server-side API — client-only
- ❌ სიმულაციის "დრო" (time-axis slider, playback) — განცალკევებული task ყოფდა
- ❌ მათემატიკური ანგარიში, certificate output, compliance check

## Open Questions

1. Force indicator bar-ი უნდა გამოჩნდეს ყოველთვის თუ მხოლოდ კარის ღიას შემთხვევაში?
   **Claude-ის recommendation:** ყოველთვის, რადგან სტანდარტის შედარება იქიდან ჩანს.

2. Smoke (P4) წყაროდ რა ჩაითვალოს? ერთი სართული შუაში, თუ ქვემოდან ზემოთ რანდომი?
   **Claude-ის recommendation:** ქვედა სართულიდან spawn, ზემოთ იწევს — standard fire scenario.

3. Open door-ის effect პასუხი დანარჩენ კარებზე ვიზუალურად როგორ გამოიყურება?
   **Claude-ის recommendation:** სხვა ღია კარების force bar-ებიც შემცირდეს (shared pressure budget ვიზუალი).

## Completion checklist

- [ ] P1 Open door implemented
- [ ] P2 Force indicator implemented
- [ ] P3 Fan failure implemented
- [ ] P4 Smoke (bonus, optional)
- [ ] No TypeScript errors (N/A — HTML file)
- [ ] Browser tested: click door, see animation, see bars color-change
- [ ] Standard switch still works — bar limits update
- [ ] Dark mode still works — particles visible, bars readable
- [ ] Mobile tested (<820px) — raycaster works on touch (touchstart event or pointerdown)

## Notes for Codex

- ყველა strings **ქართულად** UI-ში (ან გადართვადი multi-lang თუ მარტივი)
- კოდი ინგლისურად
- ახალი კოდი არ უნდა დაარღვიოს ვიზუალი რომელიც უკვე მუშაობს — ჯერ read-only გაიარე ფაილში
- წინ გადახვიდე როცა P1 სრულად მუშაობს browser-ში (visual verify, არა მხოლოდ syntax)
- Three.js რესურსების cleanup: `clearGroup(shaftGroup)` უკვე გაწმენდს geometry/material-ს, საჭიროების მიხედვით გააფართოვე

---

**Status:** completed (2026-04-19 · build verified)
**Handoff to Codex after:** Claude approves visual refinements finished
