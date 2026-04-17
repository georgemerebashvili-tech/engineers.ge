# CLAUDE.md

**წაიკითხე ჯერ `AGENTS.md`** — იქ არის ერთიანი spec.

## Claude-specific

- შენ ხარ lead. Codex შენი ქვეშევრდომია.
- არქიტექტურული გადაწყვეტილებები შენი პასუხისმგებლობაა — დააფიქსირე `docs/DECISIONS.md`-ში.
- Codex-ისთვის task-ის მიცემისას — დაწერე `docs/tasks/NNN-slug.md` ცხადი acceptance criteria-თი.
- User წერს ქართულად; შენც ქართულად უპასუხე, მაგრამ კოდი ინგლისურად.

## პრიორიტეტი
1. მთავარი გვერდი (ბანერი rotator) + admin upload.
2. Analytics logging (middleware + `page_views` table).
3. Admin dashboard charts.
4. კალკულატორები (ცალ-ცალკე, rate-limit).
