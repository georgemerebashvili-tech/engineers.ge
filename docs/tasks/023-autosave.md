# Task 023 — Autosave (Client + Server)

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 017 (local save), 022 (Supabase)

## მიზანი

3-layer autosave:
1. **Memory (always)** — zustand state is the source of truth
2. **localStorage (2s debounce)** — survives browser reload, offline-friendly
3. **Supabase (15s debounce, if signed in)** — survives device switches, only last state

User ვერც ერთი action-ს ვერ დაკარგავს 15 წამზე მეტს.

## State flow

```
composer state (zustand)
    ↓ on change
localStorage autosave (debounced 2s)  ← always on
    ↓ if authenticated
Supabase upsert (debounced 15s)       ← only if signed in
```

## Implementation

```ts
// stores/composer.ts
import { debounce } from '@/lib/util';
import { saveProject } from '@/lib/building/projects.server';

const debouncedLocalSave = debounce((state: TBuilding) => {
  try {
    localStorage.setItem(`eng_composer_${state.id}`, JSON.stringify(state));
    toast.success('✓ Local saved', { duration: 1500 });
  } catch (e) {
    // localStorage quota — show warning but don't crash
    toast.error('localStorage full, disable older projects');
  }
}, 2000);

const debouncedCloudSave = debounce(async (state: TBuilding, id?: string) => {
  try {
    await saveProject(state, id);
    toast.success('☁ Cloud saved');
  } catch (e) {
    toast.error('Cloud save failed, local is safe');
  }
}, 15000);

export const useComposer = create<ComposerState>((set, get) => ({
  building: initial,
  // ... other actions
  updateModule: (id, patch) => {
    set(s => ({ building: applyPatch(s.building, id, patch) }));
    debouncedLocalSave(get().building);
    if (isAuthed()) debouncedCloudSave(get().building, get().building.id);
  },
  // ...
}));
```

## UI indicators

Top-right status pill:
- Grey · "ცვლილებები"  (dirty, not yet saved)
- Yellow · "Saving..."
- Green · "✓ Saved locally"  (local complete, cloud pending)
- Blue · "☁ Synced"          (cloud complete)
- Red · "⚠ Sync failed"       (clickable → retry)

## Conflict handling

- On page load: check if Supabase `updated_at` > localStorage timestamp
  - If yes: "Cloud version is newer, load it?" confirmation
  - If no: use localStorage

## Offline

- If fetch fails (network): queue for retry, show "Offline, saved locally"
- On `online` event: flush queue

## Acceptance

- [ ] Local autosave every 2s debounce — verified in DevTools
- [ ] Cloud autosave every 15s debounce (authenticated users only)
- [ ] Status pill updates correctly
- [ ] Reload page → state restored from localStorage instantly
- [ ] Sign in → triggers one-time cloud sync
- [ ] Offline: local works, shows offline badge
- [ ] Back online: queued changes sync
- [ ] Quota full: graceful degrade (kick out oldest projects)

---

**Status:** pending
