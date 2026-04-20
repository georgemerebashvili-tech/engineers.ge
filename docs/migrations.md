# Database migrations — engineers.ge

**ავტომატური migration runner.** უკვე აღარ გჭირდება Supabase Dashboard → SQL Editor-ში ხელით copy-paste 23-ჯერ.

## Setup (one-time)

### 1. Get the database connection string

Supabase Dashboard → Settings → Database → **Connection string** → **URI**.

ორი ვარიანტია:
- **Direct** (port 5432) — server-side migrations, recommended
- **Session pooler** (port 6543) — ერთადრი-connection pooling

დააკოპირე URI და ჩაწერე `.env.local`-ში:

```bash
# .env.local
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**⚠ ნუ committ-ავ ამ ფაილს Git-ში** (უკვე `.gitignore`-ში).

### 2. Run the migrations

```bash
# სტატუსის ნახვა — რომელი applied, რომელი pending
npm run db:status

# გაუშვე ყველა pending migration
npm run db:migrate

# ცარიელი — მოდი ვნახო რა მოხდებოდა
npm run db:migrate -- --dry-run
```

## როგორ მუშაობს

- **Tracking table:** `_schema_migrations` (file + applied_at + checksum) ავტომატურად იქმნება პირველ გაშვებაზე.
- **Idempotent:** re-run-ზე მხოლოდ pending-ები გადის. Already-applied = skip.
- **Transactional:** ყოველი migration საკუთარ BEGIN/COMMIT-ში ტრიალდება. Failure = ROLLBACK, `_schema_migrations`-ში ჩანაწერი არ რჩება, შემდგომი retry უსაფრთხოა.
- **Checksum drift:** `db:status` გაფრთხილებს, თუ `.sql` ფაილი applied-ის მერე შეიცვალა (⚠ DRIFT).
- **Order:** ფაილები ანბანურად sorted (`0001_*.sql`, `0002_*.sql` … `0023_*.sql`). ახალი migration-ი ყოველთვის ახლი number-ით.

## ახალი migration-ის დამატება

1. `supabase/migrations/00NN_descriptive_name.sql` — შექმენი ახალი ფაილი
2. ჩაწერე SQL (CREATE TABLE, ALTER, მხოლოდ forward-ი — არა DROP)
3. `npm run db:migrate -- --dry-run` — ნახე რომ ფაილი pending-ში ჩანს
4. `npm run db:migrate` — რეალურად გაუშვი
5. Commit & push

## ცვლილებების წესი

- **არასდროს შეცვალო უკვე applied migration.** ეს გამოიწვევს DRIFT warning-ს და სხვა environment-ებზე inconsistency-ს.
- თუ მართლა საჭიროა revert — დაწერე ახალი migration რომელიც უკან აბრუნებს (drop column, recreate table).
- DRY_RUN ფლაგი production-ზე რეალურ გადადებამდე — ყოველთვის გამოიყენე.

## Production workflow

```
Local dev →  DATABASE_URL=<staging>  npm run db:migrate
            # verify via /admin/health Readiness scorecard

Staging   →  git push origin feature-branch
            # Vercel Preview builds; staging Supabase already migrated

Prod      →  DATABASE_URL=<production> npm run db:migrate -- --dry-run
            # review list → then drop --dry-run
            # or merge PR → Vercel Production build; prod Supabase migrated separately
```

## CI integration (optional)

Vercel-ის build hook-ში შეგიძლია გააშვა:

```json
// package.json
"build": "npm run db:migrate && next build"
```

მაგრამ **არ გირჩევ**: prod build-ზე migration-ის ჩავარდნა blocks deploy. სჯობს ცალკე workflow-ად: migrate → verify → deploy.

## ხშირი შეცდომები

- **"DATABASE_URL is required"** — env var არ არის დაყენებული. გადაამოწმე `.env.local` ან `export DATABASE_URL=...` shell-ში.
- **"connection refused"** — Supabase project paused? გადადი Supabase dashboard → resume.
- **"pg is not installed"** — `npm install` თავიდან.
- **"migration failed: relation already exists"** — ვიღაცამ (ან წინა შენი გაშვებამ) უკვე ხელით გადაიღო table-ი Dashboard-დან. ორი გზა:
  - Manually `insert into _schema_migrations (file) values ('00NN_*.sql');` + checksum
  - Drop the table + re-run migrate (ცხადია, data loss თუ ცხრილში ინფოა).

## `/admin/health`-თან კავშირი

Migration probe-ები [`lib/system-health.ts`](../lib/system-health.ts)-ში ამოწმებენ თუ table-ი + columns არსებობს. სხვათაშორის independent: runner-ი `_schema_migrations`-ით აკვირდება, health probe-ი რეალური table-ების არსებობას ამოწმებს. ორივე green-ი = up-to-date.
