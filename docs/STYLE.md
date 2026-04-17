# STYLE.md — ტექნიკური tokens

> სრული ვიზუალური წესები `DESIGN.md`-ში. აქ — CSS tokens, Tailwind mapping, utility patterns.
> წყარო-ნიმუში: `public/heat-loss-calculator.html`.

## ბრენდი

- **სახელი**: engineers.ge
- **ტაგლაინი**: „საინჟინრო ხელსაწყოები და ცოდნა"
- **ტონი**: technical, compact, data-dense — არცერთი marketing ტონი.

---

## CSS tokens (binding)

```css
:root {
  /* Surfaces */
  --bg:        #f2f5fa;
  --sur:       #ffffff;
  --sur-2:     #f7f9fd;
  --bdr:       #dde6f2;
  --bdr-2:     #c4d4e8;

  /* Brand */
  --navy:      #1a3a6b;
  --navy-2:    #0f2550;

  /* Interactive */
  --blue:      #1f6fd4;
  --blue-lt:   #e8f1fd;
  --blue-bd:   #b8d0f0;

  /* Semantic */
  --ora:       #c05010;
  --ora-lt:    #fff5ea;
  --ora-bd:    #e8c080;
  --grn:       #0f6e3a;
  --grn-lt:    #edfbf3;
  --grn-bd:    #9ddcba;
  --red:       #c0201a;
  --red-lt:    #fff0ef;

  /* Text */
  --text:      #1a2840;
  --text-2:    #3d5470;
  --text-3:    #7a96b8;

  /* System */
  --radius:    10px;
  --shadow-card: 0 1px 3px rgba(0,0,0,.07), 0 4px 14px rgba(0,0,0,.05);
  --shadow-sticky: 0 1px 4px rgba(0,0,0,.08);
  --shadow-modal: 0 20px 60px rgba(0,0,0,.2);
}

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

## Typography

- **Sans**: `Plus Jakarta Sans` — 300/400/500/600/700.
- **Mono**: `IBM Plex Mono` — 400/500/600.
- **Georgian fallback**: `system-ui` → „Noto Sans Georgian" (როცა დავამატებთ).
- **Base**: `html { font-size: 13px }`. **არ შეცვალო.**
- **Body**: `line-height: 1.5`, color `--text`.

### ზომები (px) — Tailwind-თან mapping

| px | Tailwind arbitrary | Class სემანტიკა                      |
|----|--------------------|--------------------------------------|
| 9  | `text-[9px]`       | micro uppercase labels               |
| 10 | `text-[10px]`      | meta, units, unit suffix             |
| 11 | `text-[11px]`      | table cells, inputs, tight body      |
| 12 | `text-xs` (12)     | button, nav link, card body          |
| 13 | `text-[13px]`      | default body, card title             |
| 14 | `text-sm` (14)     | modal head, strong label             |
| 15 | `text-[15px]`      | section title                        |
| 18 | `text-lg` (18)     | big stat value (mono)                |
| 24 | `text-2xl` (24)    | hero headline mobile                 |
| 32 | `text-[32px]`      | hero headline desktop (max)          |

> ⚠️ `text-3xl`+ **არ გამოიყენება** body-ში.

---

## Tailwind config mapping

`tailwind.config.ts`-ში ახალი `theme.extend.colors`:

```ts
colors: {
  bg:     'var(--bg)',
  sur:    'var(--sur)',
  'sur-2':'var(--sur-2)',
  bdr:    'var(--bdr)',
  'bdr-2':'var(--bdr-2)',
  navy:   'var(--navy)',
  'navy-2':'var(--navy-2)',
  blue:   'var(--blue)',
  'blue-lt':'var(--blue-lt)',
  'blue-bd':'var(--blue-bd)',
  ora:    'var(--ora)',
  'ora-lt':'var(--ora-lt)',
  grn:    'var(--grn)',
  'grn-lt':'var(--grn-lt)',
  red:    'var(--red)',
  'red-lt':'var(--red-lt)',
  text:   'var(--text)',
  'text-2':'var(--text-2)',
  'text-3':'var(--text-3)'
},
boxShadow: {
  card: 'var(--shadow-card)',
  sticky: 'var(--shadow-sticky)',
  modal: 'var(--shadow-modal)'
},
borderRadius: {
  DEFAULT: '6px',
  card: '10px',
  pill: '20px'
},
fontFamily: {
  sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-plex-mono)', 'monospace']
},
maxWidth: {
  site: '1120px'
}
```

> Tailwind v4 CSS-first-ში იგივე via `@theme inline` globals.css-ში. იხ. `app/globals.css`.

---

## Spacing / Layout

- Container: `mx-auto w-full max-w-site px-4 md:px-5`.
- Section vertical: `py-10 md:py-14`. max `py-14` (56 px).
- Card padding default: `p-3.5` (14 px).
- Card inner row gap: `gap-2` (8 px).
- Grid card-to-card: `gap-2 md:gap-3` (მოცულობისთვის).

## Radii

| კომპონენტი       | Tailwind            |
|------------------|---------------------|
| Input            | `rounded-[4px]` ან `rounded-[5px]` |
| Button           | `rounded-[6px]`     |
| Card / panel     | `rounded-card` (10) |
| Pill / badge     | `rounded-pill` (20) |
| Icon square      | `rounded-[5px]`     |

## Shadows

- Card: `shadow-card`.
- Sticky top: `shadow-sticky`.
- Modal: `shadow-modal`.
- Hover **არ** ემატება shadow; ემატება border color.

---

## ფორმები (forms) — utility patterns

### ქართული-ნუმერული input (მაგ. კალკულატორის cell)

```tsx
<input
  type="number"
  className="w-14 rounded-[4px] border-[1.5px] border-bdr bg-white
             px-1.5 py-0.5 text-right font-mono text-[11px] font-medium
             text-text outline-none transition-colors
             focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
/>
```

### ტექსტური input (form field)

```tsx
<input
  type="text"
  className="w-full rounded-[5px] border-[1.5px] border-bdr bg-white
             px-2.5 py-1.5 font-sans text-[13px] text-text outline-none
             focus:border-blue focus:shadow-[0_0_0_2px_rgba(31,111,212,0.1)]"
/>
```

### Primary button

```tsx
<button className="rounded-[6px] bg-blue px-3.5 py-1.5 font-sans text-xs
                   font-semibold text-white transition-colors hover:bg-navy-2">
  შენახვა
</button>
```

### Secondary button

```tsx
<button className="rounded-[6px] border border-bdr-2 bg-sur-2 px-3.5 py-1.5
                   font-sans text-xs font-semibold text-text-2 transition-colors
                   hover:border-blue hover:text-blue">
  გაუქმება
</button>
```

### Tab (active/inactive)

```tsx
<button data-active={active} className="
  h-[42px] px-5 font-sans text-xs font-semibold
  border-b-2 border-transparent text-text-3
  data-[active=true]:bg-blue-lt
  data-[active=true]:text-blue
  data-[active=true]:border-blue
  transition-colors hover:text-blue
">კალკულატორები</button>
```

---

## ხელმისაწვდომობა

- კონტრასტი ≥ WCAG AA (4.5:1 body).
- `:focus-visible` ring: `outline: 2px solid var(--blue); outline-offset: 2px`.
- `alt` ყოველ სურათზე, i18n-ით.
- Keyboard tab order ლოგიკური.

---

## ოპერაციული წესები

1. **Ad-hoc color არსად** — მხოლოდ tokens-დან.
2. **Font size scale-დან** — არა `text-[17px]`.
3. **Container ≤ `max-w-site`** (1120 px).
4. **Container-ი ყოველთვის პირდაპირ შვილი `<Container>` კომპონენტის**.
5. **Mono for numbers / data. Sans for labels / UI.**
6. **Radius: 4-5 input, 6 button, 10 card**. სხვა რადიუსი PR-ში ავტომატური reject.
7. **Hover = border/bg color change. არა transform/scale.**
8. **Section padding ≤ `py-14`**.
9. **Image: `next/image`, alt, width/height ან fill+sizes.**
10. **Link: `next/link` შიდაზე, `rel="noopener noreferrer"` external-ზე.**
