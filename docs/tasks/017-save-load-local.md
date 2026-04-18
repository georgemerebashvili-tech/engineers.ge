# Task 017 — Save/Load (Local, Phase 2)

**Delegated to:** Codex
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 2
**Depends on:** 013

## მიზანი

Phase 2-ის client-only persistence: JSON download, file upload, localStorage autosave.
**არა** server side.

## Save (export)

- Button "💾 Save" → downloads `building-{name}-{date}.json`
- Content: `Building` schema JSON (validated before write)
- Filename sanitized (strip special chars)

## Load (import)

- Button "📂 Load" → file picker → read file
- Parse with Zod; on error, show inline error with field path
- Replace current building (confirm if unsaved changes)

## Autosave (localStorage)

- Debounced 2s after any state change
- Key: `eng_composer_autosave_{buildingId}`
- Show toast "✓ Autosaved" briefly (2s fade)
- On page load: check for autosave; if exists and newer than last manual save → prompt "Restore autosave from {time}?"

## PDF export

- Button "📄 PDF" → `window.print()` with print CSS
- Print layout:
  - Page 1: building summary (name, module count, total area, modules table)
  - Page 2: 3D screenshot (canvas.toDataURL)
  - Page 3+: per-module summary (params, standard, key results)

## Acceptance

- [ ] Save: download triggers, filename correct, JSON valid
- [ ] Load: round-trip (save → load → identical state)
- [ ] Invalid JSON → friendly error, doesn't crash
- [ ] Autosave: localStorage key present, restored on reload
- [ ] Unsaved changes warning: confirm dialog when loading/navigating away
- [ ] PDF: 3D screenshot included

## Technical notes

- `new Blob([JSON.stringify(b, null, 2)], {type:'application/json'})` + `URL.createObjectURL` + anchor click
- Zod: `Building.safeParse(raw)` → on fail, walk `.error.issues` for user messages
- Print CSS: `@page { size: A4; margin: 15mm; }` + hide interactive UI

---

**Status:** pending
