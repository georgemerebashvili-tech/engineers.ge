# Task 001 — Design foundation (tokens + layout primitives)

**Owner:** Codex
**Depends on:** —
**Prereads:** `AGENTS.md`, `docs/DESIGN.md`, `docs/STYLE.md`

## მიზანი

აპლიკაციაში ჩასვი ვიზუალური საძირკველი: CSS tokens, Tailwind theme extension, layout primitives (NavBar, Footer, Container).
**Content-ს არ ვქმნით** ამ task-ში — მხოლოდ shell.

## Acceptance criteria

1. `app/globals.css` — `@layer base` სექციაში ყველა `--brand-ink`, `--accent`, `--surface…` token (light + `.dark` override). ზუსტად ისე, როგორც `DESIGN.md` §2.
2. `tailwind.config.ts` — `theme.extend.colors` რუკავს tokens-ს (`brand-ink`, `accent`, `surface`, `fg`, `fg-muted`, `border`).
3. `components/layout/Container.tsx` — `max-w-7xl mx-auto px-4 md:px-6 lg:px-8`.
4. `components/nav/NavBar.tsx` — sticky, `bg-brand-ink`, logo მარცხნივ (text + წითელი ▶ span), placeholder links მარჯვნივ (uppercase, `text-sm font-semibold tracking-wide`). Theme toggle + locale switch ჯერ არ არის — მხოლოდ markup hook-ები.
5. `components/layout/Footer.tsx` — `bg-brand-ink text-white/80`, 4-col grid → 1-col mobile.
6. `app/layout.tsx` იყენებს ზემოთ აღწერილ Nav + Footer-ს, `font-sans` Inter, `font-geo` placeholder.
7. **ვიზუალური smoke test** — `npm run dev`, `/` გვერდზე ჩანს navy nav, შიდა placeholder hero `min-h-[70vh] bg-surface-alt`, footer ქვემოთ. Dark mode class-ით გადართვა მუშაობს.
8. Lint + type-check გადის.

## არ გააკეთო

- ❌ hero სურათები, carousel — ცალკე task.
- ❌ Supabase, middleware, i18n — შემდეგ phase.
- ❌ `<a>`-ები external-ზე; ახლა placeholder `#` საკმარისია.
- ❌ ad-hoc ფერი ან inline style.

## Deliverable

- Branch: `feat/001-design-foundation`.
- ცვლილებები: მხოლოდ ზემოხსენებული ფაილები.
- PR description-ში screenshot nav + footer-ის.
