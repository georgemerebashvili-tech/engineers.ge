# Task 025 — Projects Gate + Tabs (Standard Pattern)

**Delegated to:** Claude (UX + shell) + Codex (state + Supabase link)
**Created:** 2026-04-18
**Scope:** ALL calculators that need persistent projects
**Depends on:** 013 (module schema) recommended, can start without
**File locations:**
- `lib/projects.ts` — CRUD + storage
- `components/projects/project-gate.tsx` — landing grid
- `components/projects/project-tabs.tsx` — topbar tabs + dropdown
- `app/(withSidebar)/calc/[slug]/page.tsx` — query param handling
- `public/calc/_project-bridge.js` — iframe ↔ parent postMessage

## მიზანი

ერთიანი პროექტების management პატერნი ყველა simulator-ისთვის. User-ი calc-ზე გადადის → ხედავს **პროექტების ცენტრს** (grid + "New project"). არჩევის შემდეგ იმავე გვერდზე იხსნება calc-ი ამ პროექტის state-ით. ზედა tab-bar-ი რამდენიმე ღია პროექტს უმართავს, dropdown-ით ახლის დამატება ან სხვაზე გადართვა.

Reference visual — user-ის მიერ მოცემული screenshot (coohom-style): "Recent projects" grid, "New project" + cards with thumbnail + name + timestamp + Preview/Details buttons, "V5.0" version tag.

## Flow

```
[/calc/stair-pressurization]
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Project Gate (if no ?project=UUID in URL)       │
│                                                  │
│  Recent projects        [+] New project         │
│  ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ thumb │ │ thumb │ │ thumb │                   │
│  │       │ │       │ │       │                   │
│  │ name  │ │ name  │ │ name  │                   │
│  │ 2d ago│ │ 5d ago│ │ 1w ago│                   │
│  └─────┘ └─────┘ └─────┘                       │
│                                                  │
│  [View all →]                                    │
└──────────────────────────────────────────────────┘
       │ user picks or creates
       ▼
URL → /calc/stair-pressurization?project=<UUID>
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Topbar: Tab-1 · Tab-2 · + | Dropdown ▾           │
│         (active project underlined)              │
├──────────────────────────────────────────────────┤
│                                                  │
│        Simulator iframe (loads project state)    │
│                                                  │
└──────────────────────────────────────────────────┘
```

## URL contract

- `/calc/<slug>` → show gate
- `/calc/<slug>?project=<uuid>` → open simulator with project state
- `/calc/<slug>?project=new` → create blank, redirect to new UUID
- `/calc/<slug>?projects=<uuid1>,<uuid2>&active=<uuid1>` → multi-tab mode

## Data model

### Project schema (extends Building from Task 013)

```ts
// lib/projects.ts
export interface Project {
  id: string;              // uuid
  slug: string;            // calc slug: 'stair-pressurization', 'wall-editor', ...
  name: string;            // user-named, default "ახალი პროექტი"
  version: string;         // "v1.0" — for future schema bumps
  createdAt: string;       // ISO
  updatedAt: string;
  thumbnail?: string;      // base64 dataURL or URL
  state: unknown;          // simulator-specific state blob (opaque)
  meta?: { author?: string; tags?: string[]; description?: string };
}
```

### Storage keys (localStorage)

- `eng_projects_v1` — master array of all projects (`Project[]`)
- `eng_projects_active` — array of currently "open" project IDs per session
- `eng_projects_last` — last-accessed project ID (for quick re-open)

### Future Supabase (Task 022 integration)

Same shape persisted to `building_projects` table when user is signed in. Task 022 handles server-side sync.

## API (lib/projects.ts)

```ts
export function listProjects(slug?: string): Project[];
export function getProject(id: string): Project | null;
export function createProject(slug: string, initialState: unknown, name?: string): Project;
export function updateProject(id: string, patch: Partial<Project>): Project;
export function duplicateProject(id: string, newName?: string): Project;
export function deleteProject(id: string): void;
export function saveThumbnail(id: string, dataURL: string): void;
export function exportProject(id: string): string;       // JSON
export function importProject(json: string): Project;    // validated
```

## Components

### `<ProjectGate slug={slug} onOpen={id => ...} />`

Landing screen with:
- Header: "`{calc.title}` · პროექტები"
- "New project" card (dashed border, big +, hover blue)
- Grid of recent (up to 12), sorted by `updatedAt` desc
- Each card: thumbnail + name + "N days ago" + [Project details] [Preview] buttons
- "View all →" button if > 12
- Empty state: "ჯერ არცერთი პროექტი არ გაქვთ — დაიწყე ახლით"

Props:
- `slug: string` — filter by calc
- `onOpen: (id: string) => void` — callback to open

Design: matches DESIGN_RULES tokens. Card = sur, border, radius-card, shadow-card, hover `-translate-y-0.5`.

### `<ProjectTabs projects={[...]} activeId={...} onSwitch={...} onAdd={...} onClose={...} />`

Top horizontal bar, appears when at least 1 project open.

Layout:
```
[Tab: name × ] [Tab: name × ] [+ add] ────────── [Dropdown ▾ All projects] [⚙]
```

- Each tab: closable (×), click to activate
- "+" button: opens mini-gate or creates blank
- Dropdown: full list with search
- ⚙ settings: toggle tab-bar visibility, close all

Shortcuts:
- Ctrl+T → new tab
- Ctrl+W → close active tab
- Ctrl+Tab → next tab
- Ctrl+Shift+Tab → prev tab

### `<ProjectSettings />` (dropdown menu)

- Export all projects (JSON)
- Import from JSON
- Clear local cache (with confirm)
- Toggle "always show gate on entry"

## Integration pattern (simulator-side)

Each simulator HTML (stair-pressurization, wall-editor, etc.) must:

1. Read `?project=<UUID>` query param on load
2. If present, request project state from parent via postMessage:
   ```js
   window.parent.postMessage({ type: 'getProject', id: uuid }, '*');
   ```
3. Parent responds:
   ```js
   { type: 'projectData', state: {...} }
   ```
4. Simulator applies state
5. On state change (debounced), simulator sends:
   ```js
   window.parent.postMessage({ type: 'projectUpdate', id, state, thumbnail }, '*');
   ```
6. Parent updates localStorage

**Thumbnail generation:** simulator exports SVG → rasterize → dataURL, or uses canvas.toDataURL for 3D tabs.

## Page modification

`app/(withSidebar)/calc/[slug]/page.tsx` renders:
- If no `?project=` → `<ProjectGate />`
- If `?project=UUID` exists:
  - Server/client reads from localStorage (client-side only, useEffect)
  - Renders `<ProjectTabs />` at top + `<CalcFrame />` below
  - `CalcFrame` passes project state to iframe via postMessage

Pseudocode:
```tsx
export default function CalcPage({ params, searchParams }) {
  const projectId = searchParams.project;
  if (!projectId) return <ProjectGate slug={slug} />;
  return (
    <>
      <ProjectTabs />
      <CalcFrameWithProject src={`/calc/${slug}.html?project=${projectId}`} />
    </>
  );
}
```

## Thumbnail generation

Each simulator exposes:
```js
// called by parent via postMessage
window.exportThumbnail = () => {
  // SVG simulators: serialize + rasterize
  // 3D simulators: canvas.toDataURL('image/png', 0.7)
  return dataURL;
};
```

Parent auto-captures on tab close and on 60s interval.

## Acceptance Criteria

### Gate
- [ ] `/calc/stair-pressurization` without `?project=` shows gate
- [ ] "New project" card creates blank + redirects
- [ ] Recent projects grid sorted by updatedAt
- [ ] Thumbnails visible (or placeholder if missing)
- [ ] Click card → `?project=UUID` URL
- [ ] Empty state when no projects

### Tabs
- [ ] Topbar appears when ≥1 project open
- [ ] Click tab → switches active project (reloads iframe state)
- [ ] × button closes tab (no delete, just closes)
- [ ] "+" opens mini-gate overlay
- [ ] Dropdown lists all projects (search filter)
- [ ] Ctrl+T / Ctrl+W / Ctrl+Tab shortcuts work

### State sync
- [ ] iframe ↔ parent postMessage contract works
- [ ] Autosave every 2s debounce
- [ ] Thumbnail captured every 60s and on close
- [ ] Import/export JSON works
- [ ] Round-trip: save → reload page → open same project → exact state restored

### Cross-calculator
- [ ] Pattern works for: stair-pressurization, elevator-shaft-press, wall-editor, parking, corridor
- [ ] Each simulator can opt-in via single switch (`useProjects: true` in calc metadata)
- [ ] If opt-in: shows gate; if not: direct open (current behavior)

### Visual
- [ ] Card design matches DESIGN_RULES tokens
- [ ] Light/dark theme
- [ ] Responsive: mobile stacks cards 1 col
- [ ] Georgian UI
- [ ] Version badge on each card ("v1.0")

## Task split

### Claude (MVP visuals)
- `<ProjectGate>` component UI
- `<ProjectTabs>` component UI  
- Thumbnail placeholder design
- Empty state design
- postMessage contract + parent-side stubbed
- CalcPage modification

### Codex
- `lib/projects.ts` CRUD with Zod validation
- localStorage persistence with quota handling
- postMessage handler in CalcFrame
- Thumbnail capture (SVG + canvas rasterize)
- Per-simulator `?project=` param reader
- State apply/sync in each simulator HTML
- Supabase link (when Task 022 done)
- Import/Export workflow
- Keyboard shortcuts
- Test coverage

## Open Questions

- [ ] Multi-tab: open 2 different calc types simultaneously? → **Rec:** No, tabs within one calc only. Cross-calc = navigate away.
- [ ] Version history? → **No**, only last state (per user earlier directive).
- [ ] Thumbnail resolution? → 240×180 PNG, quality 0.7 sufficient.
- [ ] Auto-name pattern? → "ახალი-{slug}-{date}" default, user can rename.

## Calculator opt-in registry

Extend `lib/calculators.ts`:

```ts
export type CalcMeta = {
  slug: string;
  icon: string;
  title: string;
  desc: string;
  tag: string;
  standard?: string;
  useProjects?: boolean;   // NEW — enables gate + tabs
};
```

Set `useProjects: true` on:
- stair-pressurization
- elevator-shaft-press
- wall-editor
- parking-ventilation (when built)
- floor-pressurization (when built)
- heat-loss
- wall-thermal

Not on: ads-simulator, static single-calc pages.

---

**Status:** pending Claude MVP · then Codex expansion
