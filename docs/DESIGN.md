# DESIGN.md — engineers.ge ვიზუალური ენა

> **წყარო**: `public/heat-loss-calculator.html` — HVAC კალკულატორი EN 12831.
> მისი დიზაინი არის **binding** მთელი საიტისთვის. ყველა ახალი გვერდი/კომპონენტი უნდა
> ემყარებოდეს აქ აღწერილ სისტემას, რათა საიტი იყოს ერთიანი კალკულატორთან.

---

## 1. ფილოსოფია

1. **Technical, არა marketing.** საიტი არის საინჟინრო ინსტრუმენტი. იყურება როგორც CAD/engineering tool, არა landing page.
2. **Data-dense.** Tight spacing, მცირე ფონტი, მრავალი ინფორმაცია ერთ ხედვაში.
3. **Narrow & focused.** Content max 1120 px; ვიწრო უმჯობესია, ვიდრე ფართო/გაშლილი.
4. **Subtle depth.** Thin borders (`#dde6f2`) + micro shadow. Gradient/shadow-heavy ყოფა აკრძალულია.
5. **Mono = data.** ციფრები/რიცხვები/input ყოველთვის IBM Plex Mono. Sans — UI და ტექსტი.
6. **Navy = პრიმატი.** Navy `#1a3a6b` brand-ფერია (logo, headings, buttons, tab active). Red/orange = სპეციფიკური სემანტიკა, არა აქცენტი.

---

## 2. ფერის სისტემა (binding)

```css
/* Surfaces */
--bg:        #f2f5fa;   /* page bg (soft blue-gray) */
--sur:       #ffffff;   /* card bg */
--sur2:      #f7f9fd;   /* alt surface, stripe rows */
--bdr:       #dde6f2;   /* default border */
--bdr2:      #c4d4e8;   /* emphasis border */

/* Brand */
--navy:      #1a3a6b;   /* PRIMARY — logo, headings, tab active, nav bg */
--navy-2:    #0f2550;   /* navy hover/darker */

/* Accent / Interactive */
--blue:      #1f6fd4;   /* links, focus, primary button, active tab fill */
--blue-lt:   #e8f1fd;   /* interactive fill bg */
--blue-bd:   #b8d0f0;   /* blue border */

/* Semantic */
--ora:       #c05010;   /* heating / warn-high */
--ora-lt:    #fff5ea;
--ora-bd:    #e8c080;
--grn:       #0f6e3a;   /* ok / success */
--grn-lt:    #edfbf3;
--grn-bd:    #9ddcba;
--red:       #c0201a;   /* error / delete */
--red-lt:    #fff0ef;

/* Text */
--text:      #1a2840;   /* primary */
--text-2:    #3d5470;   /* secondary */
--text-3:    #7a96b8;   /* muted / labels */
```

**წესი:** ad-hoc hex არასდროს. მხოლოდ ზემოხსენებული ცვლადები. ახალი ფერი საჭიროა? დაამატე აქ + DECISIONS.md-ში.

### ფერის როლები სემანტიკურად

| როლი               | ფერი      | სად |
|--------------------|-----------|-----|
| Page bg            | `--bg`    | body |
| Card bg            | `--sur`   | ყველა კონტენტ-ბლოკი |
| Alt fill           | `--sur2`  | table header, footer section, readonly input |
| Logo/brand title   | `--navy`  | h1, logo, section eyebrow |
| Interactive/link   | `--blue`  | `<a>`, focused input border, primary button |
| Heating metric     | `--ora`   | heat loss numbers, heating badge |
| Cooling metric     | `--blue`  | cooling numbers, cooling badge |
| Success/OK         | `--grn`   | validation pass, saved indicator |
| Error/Delete       | `--red`   | destructive, error state |

---

## 3. ტიპოგრაფია

### ფონტები (Google Fonts)

- **Sans**: `Plus Jakarta Sans` (300, 400, 500, 600, 700).
- **Mono**: `IBM Plex Mono` (400, 500, 600).
- ქართული — Plus Jakarta Sans-ს ქართული არ აქვს, fallback `system-ui`. თუ ქართული UI ხდება dominant, დავამატებთ `Noto Sans Georgian`. ახლა: ქართული ტექსტი system/Noto-ზე რენდერდება, Latin — Jakarta-ზე.

### Base

- `html { font-size: 13px; }` — **არ შეცვალო 16-ზე**. მთელი სისტემა 13px base-ს ემყარება.
- `body { line-height: 1.5 }`.

### Scale (სცნოფი)

| გამოყენება           | px   | weight | font    |
|----------------------|------|--------|---------|
| Micro label          | 9    | 700    | sans uppercase tracking .5 |
| Meta / unit          | 10   | 400-600| sans ან mono |
| Body small           | 11   | 400-500| sans ან mono |
| Body                 | 12-13| 500-600| sans |
| Section label        | 13   | 700    | sans |
| Section title        | 15   | 700    | sans navy |
| Big stat / hero sub  | 18   | 600-700| mono |
| Hero headline        | 24-32| 700    | sans navy |

**წესი:** display-ი > 32 px **არ გამოიყენება**. Landing-ს დიდი hero არ სჭირდება — საინჟინრო ტონი compact-ია.

### Tracking / ტრანსფორმი

- Micro labels (9-10 px, uppercase) — `letter-spacing: .04em – .06em`.
- ჩვეულებრივი body — default tracking.
- Hero / section title — `letter-spacing: .02em`, არა negative.

---

## 4. Layout & სივრცე

### Container

- **Max width**: `1120 px`. `mx-auto`, `px-4 md:px-5`.
- მობაილზე — მთელი სიგანე ± 14 px padding.
- დიდი ქარდები (Markets, Calculators) ჯდება ამავე container-ში.

### Spacing scale (Tailwind default, 4px base)

| Token | px | როდის |
|-------|----|-------|
| 0.5   | 2  | icon-to-text inside small chip |
| 1     | 4  | input inner padding vertical |
| 1.5   | 6  | button padding vertical |
| 2     | 8  | card-to-card gap, inner row gap |
| 2.5   | 10 | card padding default |
| 3     | 12 | section-inner gap |
| 3.5   | 14 | card padding generous |
| 4     | 16 | — |
| 5     | 20 | section horizontal padding |
| 6     | 24 | between cards (large) |
| 10    | 40 | section vertical (narrow-content) |
| 14    | 56 | section vertical (hero / featured) |

**წესი:** სექციის vertical padding max `py-14` (56 px). არა `py-20/28` — ძალიან ჰაეროვანი landing-სტილია.

### Radius

- **Cards, modal, section blocks**: `10 px` (`rounded-[10px]` ან custom).
- **Buttons, chips, badges**: `5-6 px`.
- **Inputs**: `4-5 px`.
- **Pill / toggle**: `20 px` (full-round).
- **Avatar, circle icons**: `50%`.
- `rounded-2xl` (16) / `rounded-3xl` (24) **არ გამოიყენება**.

### Shadows

- **Card default**: `0 1px 3px rgba(0,0,0,.07), 0 4px 14px rgba(0,0,0,.05)`.
  → Tailwind: custom `shadow-card` (იხ. STYLE.md).
- **Modal**: `0 20px 60px rgba(0,0,0,.2)`.
- **Sticky top**: `0 1px 4px rgba(0,0,0,.08)`.
- Soft / colored shadow **არა**. glow **არა**.

### Borders

- ყველა divider / card outline: `1px solid var(--bdr)`.
- Emphasis (card head bottom, table row separator): `1px solid var(--bdr-2)`.
- Active/focus: `1.5px solid var(--blue)` + `box-shadow: 0 0 0 2px rgba(31,111,212,.1)`.

---

## 5. ფორმები (inputs / selects / buttons)

### Input (text/number)

```css
font-family: mono;
font-size: 11-12px;
background: #fff;
border: 1.5px solid var(--bdr);
color: var(--text);
padding: 3px 5px;   /* compact table cells */
padding: 4px 6px;   /* sidebar fields */
padding: 7px 10px;  /* primary form fields */
border-radius: 4-5px;
outline: none;
text-align: right;  /* numeric */
text-align: left;   /* text */
```

Focus:
```css
border-color: var(--blue);
box-shadow: 0 0 0 2px rgba(31,111,212,.1);
```

**წესი:** რიცხვითი input — ყოველთვის mono + right-aligned. ტექსტური — sans + left-aligned.

### Select

- იგივე როგორც input. `min-width: 90-110 px` table cell-ში, full-width form-ში.

### Buttons

| ტიპი        | bg            | color    | border              | padding    | font |
|-------------|---------------|----------|---------------------|------------|------|
| Primary     | `--blue`      | #fff     | none                | 6px 14px   | 12px 600 sans |
| Secondary   | `--sur2`      | `--text-2` | `1px solid --bdr-2` | 6px 14px | 12px 600 sans |
| Danger      | `--red-lt`    | `--red`  | `1px solid #f8a0a0` | 3px 8px  | 11px 600 sans |
| Ghost add   | transparent   | `--text-2` | `1.5px dashed --bdr-2` | 3-5px 10px | 10-11px 600 sans |
| Icon-square | `--sur2`      | `--text-3` | `1px solid --bdr-2` | `w-22 h-22` or `w-26 h-26` | 12-14px |

- **Radius**: 5-6 px.
- **Uppercase buttons არ გამოიყენება body-ში** (გამონაკლისი: გრაფიკული section eyebrow).
- **Gradient button არა**. **Shadow button არა**.

### Chips / Badges

- Pill: `padding: 2-3px 7-10px; border-radius: 10-20px; font-size: 9-10px; font-weight: 700; font-family: mono`.
- ფერი — სემანტიკური (ora/blue/grn/red) light fill + matching text + light border.

### Toggle (active tab / segmented)

- Active: `background: var(--blue-lt); color: var(--blue); border-bottom: 2px solid var(--blue)`.
- Inactive: `color: var(--text-3); background: transparent`.
- Height: 32-42 px.

---

## 6. კომპოზიციის patterns

### 6.1 Top bar (nav)

- **Height**: 52 px (`h-[52px]`).
- **bg**: `#fff` + `border-bottom: 1px solid var(--bdr)` + sticky shadow.
- **Logo**: `engineers.ge` navy 13px bold, + mono subtitle 9px muted (`ENG TOOLS · KA`).
- **Nav links**: 12px, text-2, spacing 20 px, hover blue.
- **Right slot**: icon buttons (theme, lang) — secondary-square style.
- **არა**: hamburger-transforming, mega-menu, fullscreen overlay.

### 6.2 Hero (homepage)

- **Height**: `min-h-[360px]`, max 440 px. **არა** 70vh.
- **bg**: `--sur` (white) + subtle grid texture (thin lines #dde6f2 every 24px).
- **Layout**: 2-col მცირე screen-ზე stack. მარცხნივ — headline + subhead + 2 CTA + meta-chip. მარჯვნივ — mono code block / preview (მაგ: მცირე HVAC formula sample, live rendered).
- **Headline**: 24-32 px navy bold, `max-w-[28rem]`.
- **Subhead**: 13 px text-2, 1-2 lines.
- **CTA**: primary blue + secondary gray.
- **Chip above**: `BETA · EN 12831` mono 9-10 px.
- არც ერთი ფოტო / dramatic overlay. ტონი — „ინსტრუმენტი", არა „sales".

### 6.3 Section header

```
┌ CALCULATORS ─────────────────────────────  [ ALL · 12 ] ┐
  ხელსაწყოები ხელსაწყოები
└────────────────────────────────────────────────────────┘
```

- Eyebrow: 9 px uppercase mono navy.
- Title: 15-18 px sans navy 700.
- Right action: small counter chip ან link.
- Bottom border: `1px solid var(--bdr-2)`.

### 6.4 Calculator card (grid item)

- **Size**: `p-3.5` card, aspect `auto`.
- **bg**: `--sur`, border `1px solid var(--bdr)`, radius 10.
- **Head row**: navy mono badge (`#01`) + sans 13 px bold title + status pill right.
- **Body**: 2-3 meta lines 10-11 px text-2.
- **Footer row**: `--sur2` fill, border-top bdr, 2 actions (primary+secondary small).
- **Hover**: border → `--blue`, no translate/scale.

### 6.5 Footer

- **bg**: `--sur` (not navy).
- **Top**: 3-4 column links, 11 px.
- **Bottom bar**: `--sur2` fill, border-top, 10 px mono muted copyright.

---

## 7. Motion

- Transitions: `.12s` micro (hover fill), `.15-.2s` default, `.3s` მაქსიმუმ.
- Easing: `ease` default.
- ანიმაცია არის **functional** (show/hide, height collapse, focus ring). **არა** decorative bounce/spring.
- `prefers-reduced-motion` → disable transitions.

---

## 8. Iconography

- Library: `lucide-react` 16/18/20 px only (არა 24).
- Stroke 1.5 default. Color: `currentColor` (inherits from parent text).
- Inline icon+text pattern: `gap-1` (4 px) ან `gap-1.5` (6 px).

---

## 9. რისი გაკეთება **არ** შეიძლება

1. ❌ Hero > 440 px, ან decorative photo hero.
2. ❌ Gradient surface / gradient text.
3. ❌ Radius > 12 px (გარდა pill).
4. ❌ Font size > 32 px ან < 9 px.
5. ❌ Body font weight < 400.
6. ❌ Accent ფერი red/orange button-ად (ორივე სემანტიკურია).
7. ❌ Container > 1120 px.
8. ❌ Shadow გადიდებული / ფერადი.
9. ❌ Inline `style={{}}` (მხოლოდ Tailwind + CSS vars).
10. ❌ Ad-hoc `text-[17px]`, `p-[13px]` — ყოველთვის scale-დან.

---

## 10. Acceptance checklist (PR-ზე)

- [ ] მხოლოდ `STYLE.md` tokens; ad-hoc hex არსად.
- [ ] Container ≤ 1120 px.
- [ ] Base 13 px, scale-იდან ფონტი.
- [ ] Input/button pattern §5-დან.
- [ ] Section padding ≤ `py-14`.
- [ ] Hover = border ან bg-fill ცვლილება, არა transform.
- [ ] Focus-ring: blue border + blue-a10 ring 2px.
- [ ] Reduced-motion respected.
- [ ] კალკულატორთან ერთად გახსნისას vibe თანხვედრილი.
