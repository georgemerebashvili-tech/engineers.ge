# 002 · საიტის საერთო სტილი — MUI Dashboard Template

**Status:** direction-setting
**Owner:** Codex (implementation), Claude (review)
**Reference:** https://mui.com/material-ui/getting-started/templates/dashboard/

## მიზანი

engineers.ge-ის ყველა ქვეგვერდი (admin dashboard, კალკულატორები, preview,
analytics charts) უნდა შესრულდეს MUI Dashboard template-ის სტილში —
cards, sidebars, charts, tables, toolbars.

## რეფერენსი

MUI-ის ოფიციალური dashboard template:
https://mui.com/material-ui/getting-started/templates/dashboard/

ამოსაღები ვიზუალური პრინციპები:
- ქარდები მცირე radius-ით (`8–12px`), subtle shadow, უფერო სუფი
- Grid-ზე დაფუძნებული ლეიაუტი (12-col)
- Side navigation ხიბლი drawer-ით
- Charts — line/bar/area, minimal axes, no gridline noise
- Toolbars — sticky, icon-first
- Typography — Inter ან Jakarta, 14px base, clear hierarchy

## პრიორიტეტები

1. **Admin dashboard** (`/admin/*`) — drawer, KPI cards, recent activity table
2. **Calc ქვეგვერდები** (`/calc/[slug]`) — input sidebar + result card layout
3. **Analytics charts** — recharts, MUI-style card wrappers
4. **Preview** (`/preview`) — style token showcase, align to MUI pattern

## ტექნიკური წესები

- Brand tokens (`--navy`, `--blue`, `--ora`) რჩება — MUI Slider/Button-ი ამ
  ფერებს ირგებს `sx` prop-ით, არა MUI default ფერებს.
- Tailwind v4 + MUI co-exist: layout-ს Tailwind-ით, რთულ კომპონენტებს
  (Slider, DataGrid, Drawer, Autocomplete) — MUI-ით.
- Dark mode — `data-theme` ან `class="dark"` via next-themes (მიმდინარე),
  MUI `ThemeProvider` ამ ცვლადებს იყენებს `cssVariables` რეჟიმით.
- Emotion cache — Next.js App Router-თან საჭიროებს `AppRouterCacheProvider`-ს
  (`@mui/material-nextjs/v15-appRouter`), იმატოთ დამოკიდებულება როცა admin
  routes დაიწყება.

## Acceptance criteria

- [ ] Admin `/admin` გვერდი შეესაბამება MUI Dashboard template-ს (drawer + cards + chart)
- [ ] Calc ქვეგვერდებს აქვთ MUI-სტილის sidebar input layout
- [ ] ყველა chart ვიზუალურად MUI-ისებრი (no heavy grid, subtle tick color)
- [ ] Brand ფერები შენარჩუნებულია — ლურჯი ღილაკი არის `--blue`, არა MUI blue
- [ ] Typography hierarchy თანმიმდევრულია (h1/h2/h3/body/caption)

## Out of scope

- მთავარი გვერდის hero-ს სრული გადახედვა — hero უკვე ცალკე სპეცით არის
  ლამაზად გათამაშებული (treemap + slogan)
- Supabase/Auth layer
- i18n (უკვე შედეგია `next-intl`-ით)
