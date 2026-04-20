# Task 029 — Toolbar Icon Labels + Show/Hide Toggle

**Delegated to:** Codex
**Created:** 2026-04-19
**Parent:** Task 024 (wall-editor)
**Depends on:** 024
**Slug:** `/calc/wall-editor`
**File:** `public/calc/wall-editor.html` (primary) + `public/calc/building-composer.html` (parity)

## მიზანი

Wall-editor-ის (და composer-ის) toolbar-ებზე ყველა ხელსაწყოს იკონა **კომპაქტურად** ეწეროს სახელი (ქართულად, 1 სიტყვა). Hover-ზე გამოჩნდეს **სრული აღწერა** (tooltip). ზევით ან ქვევით დამატებითი toggle იკონი (👁 eye) — ერთი ღილაკით ვრთავ/ვთიშავ labels-ს (default = on).

**რატომ:** ახალი user-ი იკონებით ვერ მიხვდება რომელია wall vs room vs column. ქართული label-ით მყისი recognition.

## Scope

### ფაილი 1: [public/calc/wall-editor.html](../../public/calc/wall-editor.html)

**11 ხელსაწყოს label (ქართულად):**

| `data-tool` | კომპაქტური label | სრული (hover/tooltip) |
|-------------|------------------|----------------------|
| `select` | არჩევა | არჩევა (V) · click to pick, drag to move |
| `wall` | კედელი | კედელი (W) · click vertices, Enter/Esc = დასრულება |
| `room` | ოთახი | ოთახი (R) · drag rectangle corner-to-corner |
| `column` | სვეტი | სვეტი (C) · კვადრ. ან მრგვ. load-bearing |
| `door` | კარი | კარი (D) · click on wall · 1/2 ფრთა, swing arc |
| `window` | ფანჯარა | ფანჯარა (F) · click on wall · glazing, sill, tilt |
| `jetfan` | jet fan | Jet Fan (J) · parking · rotate for thrust |
| `exhaust` | გამწოვი | გამწოვი (E) · ceiling vent, flow m³/h |
| `furniture` | ავეჯი | ავეჯი (M) · bed/sofa/table/kitchen… |
| `fire` | ხანძარი | 🔥 ხანძარი (X) · fire source · HRR, growth |
| `pan` | გადაადგილება | Pan (H) · drag canvas · wheel = zoom |
| `btn-help` (#id) | დახმარება | დახმარება · შორტკატები + ცხრილი |

### ფაილი 2: [public/calc/building-composer.html](../../public/calc/building-composer.html) — same pattern თუ toolbar-ი აქვს.

## Implementation

### HTML ცვლილება — `.we-tool` ღილაკზე ახალი span

```html
<!-- BEFORE -->
<button class="we-tool" data-tool="wall" title="Wall (W) · click vertices, Enter/Esc=finish">
  <svg>…</svg>
  <span class="we-tool-shortcut">W</span>
</button>

<!-- AFTER -->
<button class="we-tool" data-tool="wall" title="კედელი (W) · click vertices, Enter/Esc = დასრულება">
  <svg>…</svg>
  <span class="we-tool-label">კედელი</span>
  <span class="we-tool-shortcut">W</span>
</button>
```

### CSS ცვლილება

Target: [public/calc/wall-editor.html:82-114](../../public/calc/wall-editor.html#L82-L114)

```css
/* Toolbar button grows vertically to fit label */
.we-tool {
  width: 56px;          /* was 36px */
  height: 52px;         /* was 36px — enough for icon + label */
  flex-direction: column;
  gap: 2px;
  padding: 4px 2px;
}

.we-tool svg {
  width: 18px; height: 18px;
  flex-shrink: 0;
}

.we-tool-label {
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  color: var(--text-2);
  white-space: nowrap;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.02em;
}

.we-tool.active .we-tool-label { color: #fff; }
.we-tool:hover .we-tool-label { color: var(--blue); }
.we-tool.active:hover .we-tool-label { color: #fff; }

/* Toolbar width follows button width */
.we-tools { width: 64px; }   /* adjust layout grid accordingly */

/* Labels hidden mode — icons-only */
.we-tools.labels-off .we-tool { width: 36px; height: 36px; flex-direction: row; padding: 0; }
.we-tools.labels-off .we-tool-label { display: none; }
.we-tools.labels-off { width: 44px; }

/* Shortcut remains bottom-right on both modes */
.we-tool-shortcut { right: 3px; bottom: 2px; }
.we-tools.labels-off .we-tool-shortcut { right: 2px; bottom: 1px; }

/* Label-toggle button — at top of toolbar */
.we-label-toggle {
  width: 28px; height: 24px;
  border: 1px solid var(--bdr);
  border-radius: 4px;
  background: var(--sur-2);
  color: var(--text-3);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
  transition: all .15s;
}
.we-label-toggle:hover { color: var(--blue); border-color: var(--blue); }
.we-label-toggle.off { color: var(--text-3); opacity: 0.6; }
```

### Toggle ღილაკი

Toolbar-ის **თავში** (უკვე არსებული `<aside class="we-tools">`-ის პირველი child):

```html
<aside class="we-tools">
  <button class="we-label-toggle" id="btn-toggle-labels" title="ხელსაწყოების სახელების ჩვენება/დამალვა"
          aria-pressed="true">
    <!-- Eye icon — lucide-style -->
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 10 Q 5 4 10 4 Q 15 4 19 10 Q 15 16 10 16 Q 5 16 1 10 Z"/>
      <circle cx="10" cy="10" r="2.5"/>
    </svg>
  </button>
  <div class="we-tool-sep"></div>
  <!-- existing buttons... -->
</aside>
```

Eye-off (დამალული მდგომარეობა) — იგივე path + diagonal slash:

```html
<!-- Rendered dynamically via JS -->
<svg>…eye…<line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" stroke-width="1.8"/></svg>
```

### JavaScript logic

დააემატე `public/calc/wall-editor.html`-ში script block-ში (UI init-თან ახლოს):

```js
// Toolbar label visibility — persisted per-user
const LABELS_KEY = 'eng_wall_editor_toolbar_labels';

function initToolbarLabels() {
  const toolbar = document.querySelector('.we-tools');
  const toggle = document.getElementById('btn-toggle-labels');
  if (!toolbar || !toggle) return;

  const saved = localStorage.getItem(LABELS_KEY);
  const labelsOn = saved === null ? true : saved === '1';  // default = on
  applyLabelsState(labelsOn);

  toggle.addEventListener('click', () => {
    const current = !toolbar.classList.contains('labels-off');
    applyLabelsState(!current);
    localStorage.setItem(LABELS_KEY, current ? '0' : '1');
  });

  function applyLabelsState(on) {
    toolbar.classList.toggle('labels-off', !on);
    toggle.classList.toggle('off', !on);
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    // Swap eye → eye-off icon
    toggle.innerHTML = on ? EYE_SVG : EYE_OFF_SVG;
  }
}

const EYE_SVG = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 10 Q 5 4 10 4 Q 15 4 19 10 Q 15 16 10 16 Q 5 16 1 10 Z"/><circle cx="10" cy="10" r="2.5"/></svg>`;
const EYE_OFF_SVG = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 10 Q 5 4 10 4 Q 15 4 19 10 Q 15 16 10 16 Q 5 16 1 10 Z"/><line x1="3" y1="3" x2="17" y2="17"/></svg>`;

document.addEventListener('DOMContentLoaded', initToolbarLabels);
```

## Acceptance criteria

- [ ] ყველა 11 tool-ს აქვს ქართული label ხატის ქვეშ (`.we-tool-label`)
- [ ] Title (tooltip) გაფართოებულია სრული აღწერით ქართულად + (shortcut) + hint
- [ ] Keyboard shortcut-ი ჯერაც ჩანს bottom-right corner-ში (`.we-tool-shortcut`)
- [ ] Eye toggle toolbar-ის თავში — ერთი click → labels-off/on
- [ ] `labels-off` მდგომარეობა localStorage-ში იწერება key `eng_wall_editor_toolbar_labels` (`0`/`1`)
- [ ] Default = labels **ON** (ახალი user-ი მყისიერად იხილავს სახელებს)
- [ ] Active tool button-ზე label თეთრია (blue background-ზე კონტრასტი)
- [ ] Hover label ფერი — `var(--blue)`
- [ ] `.we-tools` toolbar-ის სიგანე on/off mode-ებში layout-ს არ ტეხს (stage canvas normal)
- [ ] Mobile-ზე (≤480px) კომპაქტური mode default (labels-off), toggle ხილული
- [ ] DESIGN_RULES-ს არ ეწინააღმდეგება: font 9px monospace-less, colors tokens-იდან, radius 6, motion 0.15s
- [ ] Building-composer-ზე იგივე pattern applied (თუ toolbar-ი იდენტური სტრუქტურით არსებობს)

## არ-scope

- ❌ სხვა calc-ებზე (stair/elevator/parking) toolbar labels — მათ toolbar-ი არ აქვთ ასეთი
- ❌ bottom-bar ღილაკები (`btn-zoom-in`, `btn-zoom-out`, floor selector) — ცალკე task
- ❌ top-bar action-ები (Save/Undo/Redo/DXF) — ცალკე task (026-coohom-parity)
- ❌ ცვლილება JS drawing logic-ში — მხოლოდ presentation

## შემოწმება

1. `npm run dev` → http://localhost:3000/calc/wall-editor
2. ყოველი icon-ის ქვეშ label-ი ჩანს (კედელი, ოთახი, სვეტი, ...)
3. Eye toggle click → labels იმალება → click → ჩანს; reload-ის შემდეგ state ინახება
4. Active tool-ზე label თეთრია (blue background contrast OK)
5. Hover-ზე title tooltip გამოდის სრული ტექსტით
6. Responsive: narrow viewport (≤480px) — labels-off default
