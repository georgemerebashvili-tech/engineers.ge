# Task 011 — Corridor / Lobby Pressurization Simulator

**Delegated to:** Codex + Claude (visuals)
**Created:** 2026-04-18
**Parent:** [`docs/PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 1
**Depends on:** 007 (engine), 008 (pattern)
**New file:** `public/calc/floor-pressurization.html`
**Slug:** `/calc/floor-pressurization`

## მიზანი

1 სართულის კორიდორი/ვესტიბიული/ანტეკამერა — smoke-safe refuge mode. EN 12101-6 Class B/C/D focus.

## Parameters

- **გეომეტრია**
  - Corridor: length × width × height
  - Adjacent rooms count + door count
  - Adjacent stair door (presumed pressurized)
  - Adjacent lift door
- **Leakage model**
  - Door crack area (closed door): 0.01 m² per door typical
  - Wall crack: 0.001 m²/m² wall area
- **Scenario**
  - All rooms sealed
  - N doors opened to rooms
  - Interface with stair + lift shafts
- **Standard + class**

## Physics

- Total leakage = Σ room_doors + wall leakage
- Cross-shaft interaction: if stair Δp = 50, corridor Δp < stair Δp, flow balance
- Door force per room door
- Required supply = leakage + open door flow + safety

## Views

- **გეგმა (Plan)** — primary: corridor with N rooms, each with door; stair + lift symbols at ends; direction arrows
- **ჭრილი (Section)** — single-floor slice, supply grille, exhaust opposite
- **3D** — single floor tower, transparent walls, flow visualization

## Acceptance

- [x] Live at `/calc/floor-pressurization`
- [x] Templates: residential (4 rooms), office (12 rooms), hotel corridor (20 rooms)
- [x] Per-room door state (open/closed) — click toggles (visual sim pattern from Task 006)
- [x] Cross-shaft overlay: stair + lift Δp inputs as "context" (read-only display from neighboring simulators)
- [x] Formulas tab
- [x] Export JSON
- [x] Same shell + tokens

## Open Questions

- [ ] Should this simulator "import" from stair/lift results?
  → **Claude rec:** not in Phase 1, but leave JSON field for Phase 2 composer sync

---

**Status:** implemented by Codex (2026-04-18)

**Verification:** extracted inline module passes `node --check`; `git diff --check` is clean for the new simulator file. Route wiring was added to calculator registry + dashboard navigation; live HTTP spot-check from this shell is still pending because local `localhost:3010` requests are not responding inside this sandbox.
