# CLAUDE.md

## 🚨 სავალდებულო წაკითხვა ყოველი სესიის დასაწყისში

**ახალი გვერდის / ფიჩერის / პროექტის შექმნამდე ჯერ წაიკითხე ყველა ქვემოთ ჩამოთვლილი ფაილი.** კონფლიქტში — ზედა უფრო პრიორიტეტულია.

1. [AGENTS.md](./AGENTS.md) — ერთიანი spec (Claude + Codex როლები, stack, არქ. წესები)
2. [docs/PRD.md](./docs/PRD.md) — პროდუქტის მოთხოვნები (auth, ენები, გვერდები, data model)
3. [docs/DESIGN_RULES.md](./docs/DESIGN_RULES.md) — **binding** დიზაინის წესები (ფერი, typography, layout, forbidden patterns)
4. [docs/DESIGN.md](./docs/DESIGN.md) — ვიზუალური ენა დეტალებში
5. [docs/STYLE.md](./docs/STYLE.md) — CSS tokens + Tailwind mapping
6. [docs/DECISIONS.md](./docs/DECISIONS.md) — არქიტექტურული log (ADR)
7. [docs/ROADMAP.md](./docs/ROADMAP.md) — ფაზები / task order
8. [docs/TODO.md](./docs/TODO.md) — მიმდინარე task list

**პრიორიტეტის ჰიერარქია კონფლიქტში:**
`AGENTS.md > DESIGN_RULES.md > DESIGN.md > STYLE.md`

---

## Claude-specific

- შენ ხარ **lead**. Codex შენი ქვეშევრდომია.
- არქიტექტურული გადაწყვეტილებები შენი პასუხისმგებლობაა — დააფიქსირე `docs/DECISIONS.md`-ში.
- Codex-ისთვის task-ის მიცემისას → `docs/tasks/NNN-slug.md` ცხადი acceptance criteria-თი.
- User წერს ქართულად; შენც ქართულად უპასუხე, **მაგრამ კოდი ინგლისურად**.

## 📝 Running TODO list — `docs/TODO.md`

**წესი:** user-ი რაღაცას გაკვრით თუ ახსენებს საუბრის დროს ("და ეს რომ გავაკეთოთ", "ასევე მინდა…", "ეს არ დაგვავიწყდეს") — **მაშინვე ჩავწერ** `docs/TODO.md`-ში, სანამ სხვა task-ზე გადავიდე. არ ვდებ პაუზას, არ ვკითხო დასტური.

**Format:** `- [ ] YYYY-MM-DD — აღწერა` + პრიორიტეტი (🔴 blocker / 🟡 important / 🟢 nice-to-have).

**ყოველი ახალი task-ის წინ:** ჯერ გადავხედო `docs/TODO.md`-ს, რომ არსებული context + pending items გავითვალისწინო.

**შესრულებისას:** `[ ]` → `[x]` + `(done YYYY-MM-DD)` + გადავიტანო `## Done` სექციაში.

---

## 🟢 სრული ავტომატიზაციის უფლება (persistent)

User-მა მოგცა **სრული autonomous execution** უფლება ამ პროექტზე:

- **არ ვეკითხო დასტური** routine გადაწყვეტილებებზე (კოდი, რეფაქტორი, ფაილები, dev server, npm install, cache clear, build).
- **პირდაპირ edit + fix + ship** — bug-ების დიაგნოსტიკა და მოგვარება საკუთარი initiative-ით.
- **ტესტირება და verify** დასრულების წინ (ბრაუზერში გახსნა, route-ები რეალურად მუშაობენ, არა მხოლოდ lint/type-check).
- **Confirm მხოლოდ destructive / shared actions**-ზე:
  - `git push --force`, `git reset --hard`, `rm -rf`, branch deletion
  - Production deploys, Vercel prod, DNS ცვლილებები
  - Database migrations prod-ზე, dropping tables
  - External posts (Slack, GitHub PRs, emails)
  - Process kill სხვა user-ების / shared resources-ზე (PID-ები რომელიც სხვა session-ებმა გააჩინეს)
- **Fallback:** თუ permission system მაინც block-ს იძლევა (მაგ. `kill PID`), user-ს ვუთხრა რა დამჭირდა და რატომ.

**Reason:** User explicitly granted 2026-04-18 — "სრული უფლება, ცაიწერე შენ დავალებაშიც".

---

## 🔐 Admin Sidebar Visibility Rule (persistent · 2026-04-18)

**წესი:** ყოველი ახალი ფიჩერი (user-facing) **აუცილებლად** უნდა ჩანდეს admin panel-ის მარცხენა მენიუში ([components/admin-sidebar.tsx](./components/admin-sidebar.tsx)) — არსებულ სექციაში ან ახალ ტაბში.

**რას ვაკეთებ ყოველ ახალ ფიჩერზე:**

1. **ვაშენებ admin management გვერდს** — edit / list / toggle / review (საჭიროების მიხედვით). მინიმუმ read-only preview-ს
2. **ვამატებ sidebar entry-ს** შესაბამის სექციაში:
   - `მთავარი` — overview dashboards
   - `კონტენტი` — ბანერები, Hero Ads, გაზიარება, დონაცია, static copy
   - `მომხმარებლები` — რეგისტრაციები, referrals, verification queue
   - `ანალიტიკა` — სტატისტიკა, traffic, conversion
   - `პარამეტრები` — feature flags, API keys, AI, passwords
   - `სხვა` — external links, preview გვერდები, logout
3. **თუ არსებული სექცია არ ჯდება** → ახალ სექციას ვქმნი. არ ვაგუდავ უცხო ადგილას
4. **Nested settings** (preview, stats, table, etc.) — `children` sub-items
5. **lucide-react icon** — semantic (Share2, Heart, Images, Users, Sparkles…)

**შემოწმება task-ის დასრულების წინ:** გახსენი `/admin` → დარწმუნდი რომ ახალი ფიჩერი sidebar-ში ჩანს. თუ არ ჩანს — task არ არის დასრულებული.

**Reason:** User set this rule 2026-04-18 — admin-მა უნდა დაინახოს ყველა ფიჩერი რომელიც საიტზე არსებობს; invisible features არ იდება.

---

## პრიორიტეტი (pipeline)

1. მთავარი გვერდი (ბანერი rotator) + admin upload.
2. Analytics logging (proxy + `page_views` table).
3. Admin dashboard charts.
4. კალკულატორები (ცალ-ცალკე, rate-limit).

## ლოკალური dev (გამოყენება)

```bash
npm run dev        # port 3000
```

მთავარი ლოკალური URL-ები:
- http://localhost:3000/ — home
- http://localhost:3000/dashboard — საჯარო dashboard
- http://localhost:3000/admin — admin login
- http://localhost:3000/ads — hero ads simulator
- http://localhost:3000/calc/heat-loss — HVAC calc
- http://localhost:3000/calc/hvac — HVAC generic

**შემოწმება task-ის დასრულების წინ:** გახსენი დაზიანებული გვერდი ბრაუზერში და დარწმუნდი, რომ რეალურად მუშაობს (type-check / lint ≠ feature works).
