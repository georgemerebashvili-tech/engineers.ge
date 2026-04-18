# PLAN — ვენტილაციის სიმულაციების Suite + Building Composer

**სტატუსი:** draft · 2026-04-18
**Lead:** Claude · **Implementer:** Codex (+ Claude visuals)
**Current entry:** [`/calc/stair-pressurization`](../public/calc/stair-pressurization.html) — visual shell done

---

## 🎯 ვიზია

engineers.ge-ს ვენტილაციის სიმულატორების suite:
1. **ფიზიკით ძლიერი** — real engineering formulas (არა CFD, მაგრამ EN/NFPA/СП procedures)
2. **გამჭვირვალე** — ფორმულა + ახსნა ყოველი გამოთვლის გვერდით
3. **შემდგომ აწყობადი** — ცალკე simulator-ები სექმნიან building-composer-ის "modules"-ს
4. **DXF-from-plan** — user ატვირთავს CAD plan-ს, AI ცნობს კედლებს, 3D იწყობა coohom-ის სტილში

---

## 📅 Phases და dependencies

```
Phase 1 ─── Phase 2 ─── Phase 3
 Sims        Composer     DXF + AI
 (4 sims +   (module lib + (upload +
  engine +   stacking +    wall detect +
  rules)     save/load)    extrude)
```

**Phase 2 დაიწყება მხოლოდ Phase 1-ის სრული დასრულების შემდეგ.**
**Phase 3 დაიწყება Phase 2 stable-ის შემდეგ.**

---

## 🟦 Phase 1 — Standalone Simulations

### სამიზნე

4 independent calculator HTML file, თითო ერთ ფიზიკურ scenarial-ს ფარავს. გაზიარებული physics engine. Rules page აერთებს.

### Task list

| # | Title | Owner | Dep | Slug |
|---|-------|-------|-----|------|
| **007** | Physics engine (shared library) | Codex | — | `public/calc/_physics-engine.js` |
| **008** | Stairwell pressurization · physics + formulas | Codex | 007 | (extend existing) `/calc/stair-pressurization` |
| **009** | Elevator shaft pressurization | Codex + Claude | 007 | `/calc/elevator-shaft-press` |
| **010** | Parking ventilation (CO + smoke) | Codex + Claude | 007 | `/calc/parking-ventilation` |
| **011** | Corridor / lobby pressurization | Codex + Claude | 007 | `/calc/floor-pressurization` |
| **012** | Rules & Formulas reference page | Claude | 008-011 | `/calc/docs/physics` |
| **006** | Interactive simulations (stair) | Codex | — | existing, see prev task |

### Shared contract

ყოველი სიმულატორი expose-ს ერთ და იმავე state shape-ს:

```js
{
  simulator: 'stair-pressurization' | 'elevator-shaft-press' | 'parking-ventilation' | 'floor-pressurization',
  version: 1,
  standard: { id: 'EN' | 'NFPA' | 'SP', class: string },
  units: 'metric' | 'imperial',
  params: { /* simulator-specific */ },
  results: { /* computed outputs */ },
  meta: { savedAt: ISO8601 }
}
```

**Export / Save:**
- Download JSON button (client-side blob)
- Download PDF (print-to-pdf, simple reportable format)
- Upload JSON button to restore state
- **არა server-side** Phase 1-ში

### Physics engine scope (Task 007)

File: `public/calc/_physics-engine.js` · ES module, loadable from any calc HTML

```js
export const PHYS = {
  // Leakage flow through an opening (orifice eq)
  // Q [m³/s] = Cd × A × √(2 Δp / ρ)
  // simplified: Q = 0.827 × A × √Δp  (Cd=0.65, ρ=1.2, EN 12101-6 eq 1)
  leakageFlow(area_m2, dp_pa, cd = 0.65) { /* ... */ },

  // Door opening force — F [N] = Fdc + (W × A × Δp × d) / (2 × (W - d))
  doorOpeningForce(width, height, dp, doorcloserForce = 30, handleDist = 0.07) { /* ... */ },

  // Air change rate — ACH = Q × 3600 / V
  airChangeRate(flow_m3_s, volume_m3) { /* ... */ },

  // CO accumulation in parking (first-order)
  coConcentration(Q_gen_m3h, V, Q_vent_m3h, C0, t_seconds) { /* ... */ },

  // Smoke layer interface height (Heskestad plume, SFPE Handbook)
  smokeLayerHeight(fire_kW, room_area_m2, t_seconds) { /* ... */ },

  // Piston effect — elevator car movement
  pistonPressure(car_area_m2, shaft_area_m2, velocity_ms) { /* ... */ },

  // Fan sizing — Q_supply = Q_leak + Q_open_doors
  requiredSupplyFlow(leakageSum, openDoorFlow, safetyFactor = 1.1) { /* ... */ },

  // Unit conversions
  pa_to_inwc, inwc_to_pa, ms_to_fpm, m3s_to_cfm, /* ... */
};

// Standard metadata — Δp, velocity, force limits per class
export const STANDARDS = {
  'EN-12101-6': { /* classes A-F ... */ },
  'NFPA-92': { /* tiers ... */ },
  'SP-7.13130': { /* типы ... */ }
};

// Reference citations — formula source + equation number
export const REFS = {
  leakage_orifice: 'EN 12101-6:2005 · §A.4 · eq (A.7)',
  door_force: 'NFPA 92:2021 · §A.4.4.4',
  /* ... */
};
```

### Rules page (Task 012) · `/calc/docs/physics`

- Next.js route (not iframe) — `app/(withSidebar)/calc/docs/physics/page.tsx`
- Sections per formula:
  1. სახელი (ქართულად + EN)
  2. ფორმულა (KaTeX rendered)
  3. ცვლადების ცხრილი — symbol, meaning, unit
  4. Derivation / ახსნა 2-3 ფრაზა
  5. Worked example (რიცხვითი)
  6. Standard reference (EN/NFPA/СП-ის §)
  7. "გამოიყენება:" → link-ები რომელ simulators-ში
- **Data source:** `public/calc/_physics-engine.js`-დან exports (REFS + doctring per function)
- KaTeX: npm `katex` + CSS
- Search bar (client-side filter)

### Acceptance — Phase 1

- [ ] 4 simulators live, 200 OK, ქართული UI, light+dark work
- [ ] Each simulator has 📐 tab showing active formulas from engine
- [ ] Export JSON + Import JSON round-trip works
- [ ] PDF print layout clean (one-page summary)
- [ ] Rules page aggregates all formulas with KaTeX
- [ ] All 4 simulators use the same `_physics-engine.js` (no duplicate math)
- [ ] Unit switch (metric ↔ imperial) works across all

**Timeline estimate:** 5–7 working days (Codex-ის ფიზიკა + Claude-ის visuals per sim, parallelizable).

---

## 🟨 Phase 2 — Module Library + Building Composer

### სამიზნე

4 simulator-დან თითო ხდება "module". ერთი page-ზე (building composer) user აწყობს building-ს: კიბე + ლიფტი + კორიდორი + პარკინგი. კიბე stackable (× floor count).

### Task list

| # | Title | Owner | Dep | Note |
|---|-------|-------|-----|------|
| **013** | Module serialization format | Codex | Ph.1 | JSON contract |
| **014** | Composer page — 3D scene + panel | Claude + Codex | 013 | `/calc/building-composer` |
| **015** | Floor stacking (repeat module vertically) | Codex | 014 | stair/lift-specific |
| **016** | Inter-module connection (door/opening sync) | Codex | 014 | when corridor touches stair, door aligns |
| **017** | Save/Load (localStorage + file) | Codex | 014 | same as Phase 1 format |

### Architecture

```
Composer scene
├── floor 1
│   ├── Parking module (1× per basement)
│   ├── Stair module (shared vertical)
│   ├── Elevator module (shared vertical)
│   └── Corridor module (per floor)
├── floor 2
│   ├── Stair × Elevator shared refs
│   └── Corridor instance (different params possible)
└── ...
```

**Module contract:**
```ts
interface Module {
  id: string;            // uuid
  type: 'stair' | 'elevator' | 'parking' | 'corridor';
  instanceOf: string;    // slug of source simulator
  params: Record<string, any>;
  transform: { x, y, z, rotY };
  repeats?: { axis: 'Y', count: number, step: number };  // for stair/lift stacking
  connections?: string[];  // other module ids it aligns with
}
```

### UX

- Left panel: "📦 Modules library" — drag-drop cards
- Stage: 3D scene with grid floor, drop modules on it
- Right panel: selected module params (loads from simulator's own UI in a pop-over)
- Top: "⬇ JSON" / "⬆ import" / "📄 PDF report"
- Stair-module-ზე "× floors" stepper → ვერტიკალურად მრავლდება

### Acceptance — Phase 2

- [ ] Composer page live at `/calc/building-composer`
- [ ] Can drop stair, lift, corridor, parking modules on scene
- [ ] Stair stackable — one definition × N floors
- [ ] Each module retains per-simulator params
- [ ] Export composed building as single JSON
- [ ] Re-import restores exact state
- [ ] Individual module double-click → opens that simulator with params pre-loaded

**Timeline:** 4–6 days.

---

## 🟥 Phase 3 — DXF Upload + AI Wall Detection

### სამიზნე

User ატვირთავს DXF plan. System ცნობს კედლებს (layer + geometry heuristic + Claude API for ambiguous). Auto-extrude 3D. User რედაქტირებს (add/remove walls, place modules). Save last state to server.

### Task list

| # | Title | Owner | Dep | Note |
|---|-------|-------|-----|------|
| **018** | DXF parser integration | Codex | Ph.2 | `dxf-parser` npm |
| **019** | Wall heuristic (layer + geometry) | Codex | 018 | first-pass auto-detect |
| **020** | Claude API wall disambiguation | Claude + Codex | 019 | `/api/detect-walls` |
| **021** | 3D extrude + edit | Claude | 020 | Three.js CSG for openings |
| **022** | Supabase `building_projects` table + RLS | Codex | Ph.1 auth | store last version only |
| **023** | Autosave + manual save | Codex | 022 | debounced |

### Wall detection strategy

**1st pass — deterministic:**
- DXF entities: LINE, LWPOLYLINE, POLYLINE → candidate walls
- Layer name match: `/WALL|КЕДЕ|СТЕН|WALL-/i`
- Geometry filter: parallel pairs within 100–400mm = wall (two sides)
- Closed polylines = rooms

**2nd pass — Claude API (ambiguous only):**
- Entities not classified → send batch to Claude Haiku-4.5
- Input: entity geometry + layer + nearby context
- Output: `{entityId, class: 'wall'|'door'|'window'|'furniture'|'annotation'}`
- Cache result by DXF hash (avoid re-analysis)

**API endpoint:** `POST /api/detect-walls`
- Input: `{ entities: Array<DxfEntity>, context: { drawing_bounds, unit } }`
- Uses: `@anthropic-ai/sdk`, model `claude-haiku-4-5`, with prompt caching
- Returns: classification map

### 3D extrude

- Walls: extrude vertically to `floorH`
- Openings: CSG subtract (three-bvh-csg or manual geometry)
- User can click wall → edit height / delete / split
- Modules (from Phase 2) drop into identified rooms

### Storage

**Supabase table:**
```sql
create table building_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  slug text generated always as (slugify(name)) stored,
  dxf_hash text,            -- to recognize re-uploads
  state jsonb not null,     -- full scene + modules
  thumbnail text,           -- base64 or URL
  updated_at timestamptz default now()
);

alter table building_projects enable row level security;
create policy "own projects" on building_projects
  using (auth.uid() = user_id);
```

- **არ ვინახავთ** version history — მხოლოდ `state` (overwrite on save)
- Thumbnail generated client-side from canvas

### Acceptance — Phase 3

- [ ] User ატვირთავს DXF → walls highlight 3D-ში 10 წამში
- [ ] Claude API იძახებს მხოლოდ ambiguous entities-ისთვის (<20% typically)
- [ ] User-ს შეუძლია wall-ის ხელით correction
- [ ] Modules (stair/lift/corridor) drop-ებადია გამოცნობილ rooms-ში
- [ ] Save → Supabase, Load → restores full state
- [ ] Per-user projects list at `/dashboard/projects`

**Timeline:** 7–10 days.

---

## 🗂 Task numbering

Continuing from existing tasks (last: 006 stair simulations).

- 007 — Physics engine (shared)
- 008 — Stair · physics upgrade
- 009 — Elevator shaft press
- 010 — Parking ventilation
- 011 — Corridor pressurization
- 012 — Rules & formulas page
- 013 — Module serialization format
- 014 — Building composer page
- 015 — Floor stacking
- 016 — Inter-module connections
- 017 — Save/Load (local)
- 018 — DXF parser
- 019 — Wall heuristic
- 020 — Claude API wall detection
- 021 — 3D extrude + edit
- 022 — Supabase projects table
- 023 — Autosave

---

## 👥 Labor split

**Claude (lead, visuals + architecture):**
- ყველა UI shell + design tokens + animations
- 3D scene composition (Three.js scenes, materials, lighting)
- Composer page UX
- DXF 3D extrude + edit interactions
- Task-file drafting (ამ ფაილში ყოფნილი ყოველი task-ი)
- Decisions.md entries

**Codex (implementer):**
- Physics engine math + tests
- Per-simulator wiring (event handlers, state sync)
- DXF parser integration
- API endpoints (Next.js route handlers)
- Supabase schema + RLS + server actions
- Interactive simulation logic (Task 006 etc)

**User actions required:**
- Supabase project provision (blocker for Phase 3 save)
- Anthropic API key for Claude wall-detection (blocker for Task 020)
- Approve each phase completion before next starts

---

## 🟢 Next immediate step

**Claude writes:**
1. `docs/tasks/007-physics-engine.md` — full contract + function signatures + refs
2. `docs/tasks/008-stair-physics-upgrade.md`
3. `docs/tasks/009-elevator-shaft-press.md`
4. `docs/tasks/010-parking-ventilation.md`
5. `docs/tasks/011-corridor-pressurization.md`
6. `docs/tasks/012-rules-formulas-page.md`

**After Codex finishes Phase 1:**
7. Claude drafts Phase 2 tasks (013–017)
8. Claude drafts Phase 3 tasks (018–023) when Phase 2 stable

**TODO.md ჩაწერა** — ყოველი phase-ის პროგრესი tracked.

---

## Decisions taken

- **Client-only Phase 1-2** — server only Phase 3-ში და მხოლოდ "final state" save (არა version history)
- **Claude API wall detection** — მხოლოდ ambiguous entities (cost control)
- **KaTeX** ფორმულის rendering-ისთვის (არა MathJax)
- **DXF-only** ატვირთვა Phase 3-ში (PDF/IFC later)
- **Module-first architecture** — simulator = module, composer = assembler
- **არცერთი version history** — user-ი ვინც აღადგენს, ბოლო state-ს იტვირთავს

---

## Success metrics (overall)

- [ ] 4 simulators + composer + DXF import → ერთ კოჰერენტულ suite-ად
- [ ] ფიზიკა გამჭვირვალეა: formula + reference ხელთ
- [ ] User იწყებს plan upload-იდან, ბოლოში აქვს 3D ventilated building + exportable report
- [ ] Code quality: shared engine, zero duplicated math, consistent tokens

---

**Plan version:** 1 · ავტომატურად update-ებული ყოველი phase-ის end-ზე.
