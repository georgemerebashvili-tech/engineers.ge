# Supabase Setup — User Action Checklist

Tasks 022 + 023 (server-side project persistence + 3-layer autosave) are **unblocked** once a Supabase project is provisioned and env vars land in Vercel. The code + migration are ready in this repo. This doc is the step-by-step user action.

## Scope

- Provisions DB for: user accounts (Supabase Auth), banners, analytics, `building_projects` (Task 022), TBC inventory, and everything else gated on `NEXT_PUBLIC_SUPABASE_URL`.
- No user-written SQL required — migrations live in `supabase/migrations/*.sql` and run via `npm run db:migrate`.

## Step 1 — Provision Supabase project

Option A: **Vercel Marketplace → Supabase** (recommended, auto-wires envs)
1. https://vercel.com/dashboard → pick `engineers-ge` project
2. "Storage" tab → "Create Database" → Supabase
3. Region: `eu-central-1` (Frankfurt — closest to Georgia)
4. After create: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL` auto-appear in all 3 Vercel envs (dev/preview/prod).

Option B: **Direct supabase.com**
1. https://supabase.com/dashboard → "New project"
2. Region: Frankfurt. Plan: Free tier is enough to start.
3. Wait ~2 min for provision.
4. Project Settings → API:
   - Copy `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
5. Project Settings → Database → Connection string → **Session pooler** URI. Password was shown at project create — keep it. Result: `postgres://postgres:PASS@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`. Save as `DATABASE_URL`.

## Step 2 — Add envs to Vercel

If you used Option A, skip this. Otherwise:

```
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
vercel env add SUPABASE_SERVICE_ROLE_KEY production preview development
vercel env add DATABASE_URL production preview development
```

(The CLI will prompt for each value interactively.)

Copy the same 4 vars into local `.env.local` so dev server can read them:

```
NEXT_PUBLIC_SUPABASE_URL=https://<id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi…
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi…
DATABASE_URL=postgres://postgres:<pass>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

## Step 3 — Run migrations

```bash
npm run db:migrate
```

Expected output: 25 migrations applied. Includes everything from `0001_page_views.sql` through `0025_building_projects.sql`.

Idempotent — re-running is safe.

If a migration fails, `scripts/db-migrate.mjs` stops at the failing file. Fix the SQL, re-run — already-applied migrations are skipped via the `_schema_migrations` tracking table.

## Step 4 — Verify

```bash
npm run db:status
```

Should print applied migration list matching `supabase/migrations/*.sql`.

Browser verification:
- https://engineers.ge/admin → login with `ADMIN_USER` / `ADMIN_PASS` (env). Admin dashboard should load stats, audit-log, etc.
- https://engineers.ge/tbc → TBC login. Branches list should appear for `admin_givi` / `admin_temo`.
- https://engineers.ge/calc/wall-editor with a logged-in user → "Cloud save" button enabled; save → reload → project restored from `building_projects`.

## Step 5 — Turn on Supabase Auth (for end users)

Supabase Dashboard → Authentication → Providers:
- Email — enabled by default. Set "Confirm email" to off if you want no verification for MVP.
- Google / GitHub — optional. Add OAuth client IDs + secrets if you want social login.

Site URL: `https://engineers.ge`. Redirect URLs: `https://engineers.ge/auth/callback`.

## Bucket for project thumbnails

Supabase → Storage → Create bucket `project-thumbs` (public read).

The repo already expects this bucket via Task 022; no code change required.

## Tasks unblocked by this setup

| Task | Before | After |
|------|--------|-------|
| 022 — `building_projects` table + RLS | migration pending | **runs in `db:migrate`** |
| 023 — 3-layer autosave | memory/localStorage only | **+ Supabase cloud** |
| Banners · Hero ads | localStorage preview only | **DB-backed** |
| Analytics · page_views | local only | **aggregated** |
| User registrations · referrals | blocked | **live** |
| TBC inventory · 240 branches | can't seed | **operational** |
| Email verification, password reset | blocked | **functional** |

## Rollback

If something goes sideways and you want a clean slate:

```bash
# In Supabase SQL editor
drop schema public cascade;
create schema public;
grant all on schema public to postgres, anon, authenticated, service_role;
```

Then `npm run db:migrate` again.

**⚠ This wipes ALL data.** Only for early setup while nothing lives in prod.

---

**Status tracking:** keep this checklist in sync with `docs/TODO.md` lines 75–81 (the Supabase-blocker section). Check off each step as you complete it locally; the repo does not persist checkbox state across sessions.
