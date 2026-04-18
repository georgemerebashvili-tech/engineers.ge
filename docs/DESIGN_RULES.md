# engineers.ge Design System — საბოლოო წესები

**სტატუსი:** binding
**ბოლოს განახლდა:** 2026-04-18
**წყარო-ნიმუში:** `public/heat-loss-calculator.html` (HVAC EN 12831)

ეს ფაილი არის **ერთადერთი წყარო** ნებისმიერი UI გადაწყვეტილებისთვის. `DESIGN.md` + `STYLE.md` დეტალებია — ეს ფაილი **წესებია**. ნებისმიერი ცვლილება ჯერ აქ დაფიქსირდება, მერე კოდში.

## სავალდებულო cross-reference

UI ცვლილების წინ წაიკითხე ყველა:
[AGENTS.md](../AGENTS.md) · [CLAUDE.md](../CLAUDE.md) · [PRD.md](./PRD.md) · [DESIGN.md](./DESIGN.md) · [STYLE.md](./STYLE.md) · [DECISIONS.md](./DECISIONS.md) · [ROADMAP.md](./ROADMAP.md)

კონფლიქტის პრიორიტეტი: `AGENTS.md > DESIGN_RULES.md > DESIGN.md > STYLE.md`.

---

## 0. ფილოსოფია (უცვლელი)

1. **Technical tool, არა marketing site.** საინჟინრო ინსტრუმენტი — იყურება როგორც CAD/engineering app, არა landing page.
2. **Data-dense.** Tight spacing, მცირე ფონტი, მრავალი ინფორმაცია ერთ ხედვაში.
3. **Narrow & focused.** Content max **1120px**; ვიწრო უმჯობესია, ვიდრე ფართო.
4. **Subtle depth.** Thin borders + micro shadow. არავითარი gradient/glow.
5. **Mono = data.** ციფრები ყოველთვის IBM Plex Mono. Sans — UI და ტექსტი.
6. **Navy = პრიმატი.** `#1a3a6b` brand-ფერია. Red/orange სემანტიკაა, **არა** აქცენტი.

---

## 1. ფერების პალიტრა (binding tokens)

### Surfaces
| ტოკენი | Hex | გამოყენება |
|--------|-----|-----------|
| `--bg` | `#f2f5fa` | page ფონი (soft blue-gray) |
| `--sur` | `#ffffff` | cards, panels, inputs |
| `--sur-2` | `#f7f9fd` | alt surface, stripe rows, table header, footer section |
| `--bdr` | `#dde6f2` | default border / divider |
| `--bdr-2` | `#c4d4e8` | emphasis border |

### Brand
| ტოკენი | Hex | გამოყენება |
|--------|-----|-----------|
| `--navy` | `#1a3a6b` | logo, h1, headings, nav bg, section eyebrow |
| `--navy-2` | `#0f2550` | navy hover / darker |

### Interactive
| ტოკენი | Hex | გამოყენება |
|--------|-----|-----------|
| `--blue` | `#1f6fd4` | links, focus, primary button, active tab |
| `--blue-lt` | `#e8f1fd` | interactive fill bg, active tab bg |
| `--blue-bd` | `#b8d0f0` | blue border |

### Semantic
| ტოკენი | Hex | Light | Border | გამოყენება |
|--------|-----|-------|--------|-----------|
| `--ora` | `#c05010` | `#fff5ea` | `#e8c080` | heating, warn-high |
| `--grn` | `#0f6e3a` | `#edfbf3` | `#9ddcba` | success, validation pass |
| `--red` | `#c0201a` | `#fff0ef` | — | error, delete |

### Text
| ტოკენი | Hex | გამოყენება |
|--------|-----|-----------|
| `--text` | `#1a2840` | primary |
| `--text-2` | `#3d5470` | secondary, meta |
| `--text-3` | `#7a96b8` | muted, labels, placeholder |

**წესი:** არასდროს hardcoded hex კოდი კომპონენტში — მხოლოდ CSS ცვლადები (ან Tailwind alias). ახალი ფერი საჭიროა? → ემატება აქ + `DECISIONS.md`-ში.

---

## 2. Typography

### ფონტები
- **Sans:** `Plus Jakarta Sans` (300/400/500/600/700)
- **Mono:** `IBM Plex Mono` (400/500/600)
- **Georgian fallback:** `system-ui` → `Noto Sans Georgian` (როცა დავამატებთ)

### Base
- `html { font-size: 13px; }` — **არ შეცვალო 16-ზე**. მთელი სისტემა 13px base-ს ემყარება.
- `body { line-height: 1.5; color: var(--text); }`

### Scale
| გამოყენება | px | weight | font |
|-----------|----|--------|------|
| Micro uppercase label | 9 | 700 | sans tracking `.04-.06em` |
| Meta / unit | 10 | 400-600 | sans ან mono |
| Body small, table, input | 11 | 400-500 | sans ან mono |
| Body / button / nav link | 12-13 | 500-600 | sans |
| Section label (strong) | 13 | 700 | sans |
| Section title | 15 | 700 | sans navy |
| Big stat / hero sub | 18 | 600-700 | **mono** |
| Hero headline | 24-32 | 700 | sans navy |

**წესები:**
- Display > 32px **არ გამოიყენება.** Landing-ს დიდი hero არ სჭირდება.
- Body font-weight < 400 **აკრძალულია.**
- სათაურებს არ ემატება პუნქტი (`:`).
- ქართული არ იწერება uppercase-ით (გამონაკლისი: 9-10px micro labels ინგლისურ კონტექსტში).
- Mono = **რიცხვები / data / input**. Sans = **ტექსტი / UI**.

---

## 3. Spacing

4px-grid (Tailwind default):

| Token | px | როდის |
|-------|----|-------|
| `0.5` | 2 | icon-to-text chip-ში |
| `1` | 4 | input inner padding vertical |
| `1.5` | 6 | button padding vertical |
| `2` | 8 | card-to-card gap, inner row gap |
| `2.5` | 10 | card padding default |
| `3` | 12 | section-inner gap |
| `3.5` | 14 | card padding generous |
| `5` | 20 | section horizontal padding |
| `6` | 24 | between cards (large) |
| `10` | 40 | section vertical (narrow content) |
| `14` | 56 | section vertical (hero / featured) |

**წესი:** სექციის vertical padding **max `py-14` (56px)**. არა `py-20/28` — ძალიან ჰაეროვანი landing-სტილია.

---

## 4. Sizing / Radius

| ტოკენი | მნიშვნელობა |
|--------|--------------|
| Input radius | 4-5px |
| Button / chip radius | 5-6px |
| Card / panel radius | `--radius` = 10px |
| Pill / toggle | 20px (full-round) |
| Avatar | 50% |
| Nav bar height | 52px |
| Container max-width | **1120px** |

**აკრძალული:** `rounded-2xl` (16px+), `rounded-3xl` (24px+). Radius > 12px = reject (გარდა pill).

---

## 5. Shadows

```css
--shadow-card:   0 1px 3px rgba(0,0,0,.07), 0 4px 14px rgba(0,0,0,.05);
--shadow-sticky: 0 1px 4px rgba(0,0,0,.08);
--shadow-modal:  0 20px 60px rgba(0,0,0,.2);
```

**წესი:** Soft/colored shadow **არა**. Glow **არა**. Hover **არ** ცვლის shadow-ს — ცვლის border color-ს.

---

## 6. Layout — Site Shell (3 ფენა)

ეს **არის public site**, არა app shell. არცერთი sidebar / app-bar. სტრუქტურა:

```
┌────────────────────────────────────────────────────────────┐
│  Zone 1 — NavBar (52px, sticky, z:100, white + border)     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Zone 2 — Main content (container mx-auto max-w-[1120px]) │
│    · Hero (homepage only, min-h 360, max 440)              │
│    · Sections (py-10 md:py-14, max py-14)                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Zone 3 — Footer (white sur, sur-2 bottom bar)             │
└────────────────────────────────────────────────────────────┘
```

### Zone 1 — NavBar
- Height **52px**.
- bg `var(--sur)` + `border-bottom: 1px solid var(--bdr)` + `shadow-sticky` on scroll.
- მარცხნივ: logo `engineers.ge` navy 13px bold + mono subtitle 9px muted (`ENG TOOLS · KA`).
- ცენტრში: nav links (12px, text-2, gap-5, hover blue).
- მარჯვნივ: icon-buttons (theme, lang switcher). Icon-square style.
- **Sticky** top:0, z:100.
- **არა:** hamburger-transforming, mega-menu, fullscreen overlay.

### Zone 2 — Main
- Container: `mx-auto w-full max-w-[1120px] px-4 md:px-5`.
- **არცერთი element არ გადალახავს 1120px**.
- Sections stack vertically, **max `py-14`** vertical padding.

### Zone 3 — Footer
- bg `var(--sur)` (**არა** navy).
- Top: 3-4 columns of links, 11px.
- Bottom bar: `var(--sur-2)` fill, border-top, 10px mono muted copyright.

---

## 7. Responsiveness

| Breakpoint | Width | ქცევა |
|------------|-------|-------|
| mobile | < 640px | single column, nav collapses to logo+icons, hero stacks |
| tablet | 640-960 | 2-col grids, full nav |
| desktop | 960-1280 | ნორმალური layout |
| wide | > 1280 | container centers at 1120px (**არ იწელება**) |

**წესი:** layout flex/grid-ზე. **არცერთი element ultrawide-ზე არ იწელება** 1120px-ზე მეტად.

---

## 8. i18n (6 ენა: ka · en · ru · tr · az · hy)

რუსული/ინგლისური ქართულზე შეიძლება გრძელი იყოს; თურქული და სომხური კიდევ უფრო. ასე რომ:

1. **ყველა text container: `min-width`, არა `width`.** ტექსტი იღებს სივრცეს.
2. **Button / chip / nav link:** padding ემყარება ტექსტს, **არცერთი fixed width**.
3. **Nav link:** 1 line, ellipsis + `title=""` tooltip თუ ვერ ეტევა.
4. **Card title:** max 2 lines, ellipsis.
5. **Hero headline:** `max-w-[28rem]` — wrap ბუნებრივად.
6. **Form label:** 1 line ellipsis, helper-ტექსტი ქვემოთ.

**წესი-თავი:** **არ გვაქვს მაგიური რიცხვები ტექსტისთვის.** თუ რამე ვერ ეტევა — padding/min-width გავზარდოთ, ან translation-ში შევცვალოთ (**არასდროს** კოდში hardcoded "მოკლე ვერსიით").

---

## 9. Components — standard ვარიანტები

### 9.1 Buttons

| ტიპი | bg | color | border | padding | font |
|------|----|----|-------|---------|------|
| **Primary** | `--blue` | `#fff` | none | `6px 14px` | 12px 600 sans |
| **Secondary** | `--sur-2` | `--text-2` | `1px solid --bdr-2` | `6px 14px` | 12px 600 sans |
| **Danger** | `--red-lt` | `--red` | `1px solid #f8a0a0` | `3px 8px` | 11px 600 sans |
| **Ghost add** | transparent | `--text-2` | `1.5px dashed --bdr-2` | `3-5px 10px` | 10-11px 600 sans |
| **Icon-square** | `--sur-2` | `--text-3` | `1px solid --bdr-2` | `w/h 22 ან 26` | 12-14px |

**წესები:**
- Radius **5-6px**.
- Uppercase body-ში — **არა** (გამონაკლისი: section eyebrow).
- Gradient button — **არა**. Shadow button — **არა**.
- Hover: bg darken (primary → `--navy-2`), ან border color change. **არა** transform/scale.

### 9.2 Input / Select

```css
font-family: mono;          /* numeric */
font-family: sans;          /* text */
font-size: 11-12px;
background: #fff;
border: 1.5px solid var(--bdr);
color: var(--text);
padding: 3px 5px;   /* compact table cells */
padding: 4px 6px;   /* sidebar fields */
padding: 7px 10px;  /* primary form fields */
border-radius: 4-5px;
text-align: right;  /* numeric */
text-align: left;   /* text */
```

**Focus:**
```css
border-color: var(--blue);
box-shadow: 0 0 0 2px rgba(31,111,212,0.1);
```

**წესები:**
- რიცხვითი input → **mono + right-aligned**. ტექსტური → **sans + left-aligned**.
- Disabled: `#F6F7F9` ფონი, cursor not-allowed.
- Required: `*` red inline.

### 9.3 Chips / Badges / Pills

- Padding `2-3px 7-10px`, radius `10-20px`, font `9-10px 700 mono`.
- ფერი სემანტიკური (ora/blue/grn/red) light fill + matching text + light border.

### 9.4 Tabs / Segmented

- Active: `bg var(--blue-lt); color var(--blue); border-bottom: 2px solid var(--blue)`.
- Inactive: `color var(--text-3); background transparent`.
- Height **32-42px**. Padding `px-5`.

### 9.5 Calculator card (grid item)

- `p-3.5` (14px), bg `--sur`, border `1px solid --bdr`, radius 10.
- **Head row:** navy mono badge (`#01`) + sans 13px bold title + status pill right.
- **Body:** 2-3 meta lines 10-11px text-2.
- **Footer row:** `--sur-2` fill, border-top bdr, 2 actions (primary + secondary small).
- **Hover:** border → `--blue`. **არა** translate/scale.

### 9.6 Hero (homepage only)

- `min-h-[360px]`, **max 440px**. არა `70vh`.
- bg `--sur` + subtle grid texture (#dde6f2 every 24px).
- 2-col: მარცხნივ headline + subhead + 2 CTA + meta-chip. მარჯვნივ mono code block / live formula preview.
- Headline: 24-32px navy bold, `max-w-[28rem]`.
- Chip above: `BETA · EN 12831` mono 9-10px.
- **არცერთი** photo, dramatic overlay, parallax.

### 9.7 Section header

```
┌ CALCULATORS ─────────────────────────────  [ ALL · 12 ] ┐
  ხელსაწყოები
└────────────────────────────────────────────────────────┘
```

- Eyebrow: 9px uppercase mono navy.
- Title: 15-18px sans navy 700.
- Right action: small counter chip ან link.
- Bottom border: `1px solid var(--bdr-2)`.

### 9.8 Modal

- Backdrop: `rgba(15,23,42,0.4)` + blur 2px.
- Content: radius 10px, `shadow-modal`, max 95% width.
- Z-index **200**.

### 9.9 Icons

- **Library:** `lucide-react` 16/18/20 px only (**არა 24**).
- Stroke 1.5 default. Color: `currentColor`.
- Inline icon+text: `gap-1` (4px) ან `gap-1.5` (6px).

---

## 10. Z-index hierarchy

```
modal backdrop       200
tooltip              150
top loader bar       140
sticky navbar        100
sub-header / popover  90
dropdown menu         80
table sticky header   10
base                   1
```

---

## 11. Motion

- Default transition `.15s ease`.
- Micro hover (fill) `.12s`.
- Sheet/modal open `.2s` max.
- **არცერთი** animation > `.3s` user interaction-ში.
- **`prefers-reduced-motion`** → transitions disabled.
- Easing: `ease` default. **არა** bounce/spring დეკორაციისთვის.
- ანიმაცია **functional** (show/hide, focus ring). **არა** decorative.

---

## 12. Accessibility

- ყველა interactive element: focusable, `:focus-visible` → `outline: 2px solid var(--blue); outline-offset: 2px`.
- Color contrast **WCAG AA min** (4.5:1 body).
- Icon-only ღილაკი → `title` attribute + `aria-label`.
- Form input ↔ `<label for="">` მიმაგრება.
- Keyboard: Tab ქრონოლოგიური, Esc ხურავს modal-ს.
- `alt` ყოველ სურათზე, i18n-ით.

---

## 13. Dark mode

Light tokens გადატრიალდება `.dark` class-ზე:
```css
.dark {
  --bg:     #0f1724;
  --sur:    #151f2f;
  --sur-2:  #1b2638;
  --bdr:    #253349;
  --bdr-2:  #324566;
  --text:   #e6ecf5;
  --text-2: #a7b7d1;
  --text-3: #6b82a6;
  --blue-lt:#15294a;
}
```

**წესი:** ყოველი surface/text/border token დარჩენილია იგივე — კომპონენტი dark-ში **თავისით** იმუშავებს თუ მარტო tokens-ზეა დამოკიდებული. ad-hoc `dark:bg-[...]` → reject.

---

## 14. Forbidden ნიმუშები

- ❌ `width: 120px` fixed user-facing text ელემენტზე
- ❌ ad-hoc hex კოდში (`color: #1f6fd4`) — მხოლოდ `var(--blue)` ან Tailwind alias
- ❌ `text-[17px]`, `p-[13px]` — ყოველთვის scale-დან
- ❌ Container > 1120px
- ❌ Section padding > `py-14`
- ❌ Hero > 440px, ან decorative photo hero
- ❌ Gradient surface / gradient text
- ❌ Radius > 12px (გარდა pill 20px)
- ❌ Font size > 32px ან < 9px
- ❌ Body font-weight < 400
- ❌ Red/orange button-ად (ორივე სემანტიკურია)
- ❌ Shadow გადიდებული / ფერადი / glow
- ❌ Inline `style={{}}` (მხოლოდ Tailwind + CSS vars)
- ❌ Hardcoded ქართული ტექსტი — ყველაფერი `t()`-ს გავლით (next-intl)
- ❌ `position: absolute` layout-ისთვის (მხოლოდ tooltip/badge/overlay)
- ❌ Transform/scale hover-ზე — მხოლოდ border/bg color change
- ❌ Uppercase body ქართული
- ❌ Translation-ში სიტყვის "შემოკლება" layout-ის გამო

---

## 15. Checklist — ახალი გვერდის / კომპონენტის შექმნისას

- [ ] Layout site-shell სქემას მიჰყვება (NavBar / Main / Footer)
- [ ] ფერი / spacing / typography **მხოლოდ** tokens-დან
- [ ] Container ≤ 1120px
- [ ] Base 13px, scale-იდან font-size
- [ ] Input/button pattern §9-დან
- [ ] Section padding ≤ `py-14`
- [ ] ყველა text `t()`-ს გავლით (6 ენა: ka, en, ru, tr, az, hy)
- [ ] Responsive breakpoints ტესტირებული (mobile → wide)
- [ ] Empty / loading / error states არის
- [ ] Keyboard navigation მუშაობს
- [ ] Focus ring ჩანს (blue + 2px glow)
- [ ] Icon-only ღილაკზე tooltip + aria-label
- [ ] i18n long text არ ტეხავს layout-ს (გატესტე ru/en/tr)
- [ ] Dark mode მუშაობს (მხოლოდ tokens-ზე დამოკიდებული)
- [ ] Reduced-motion respected
- [ ] Hover = border/bg color, არა transform
- [ ] კალკულატორთან ერთად გახსნისას vibe თანხვედრილი

---

## 16. ცვლილების პროცესი

**ამ წესების ცვლილება = ახალი PR + approval user-გან + ჩანაწერი `DECISIONS.md`-ში.**

- წესი dry-run-ში → ცოცხალი example + reason.
- არქიტექტურული გადაწყვეტილება → `docs/DECISIONS.md`.
- Codex-ისთვის ცვლილებების delegation → `docs/tasks/NNN-slug.md` acceptance criteria-ით.
