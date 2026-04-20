# Staging environment — engineers.ge

**მიზანი:** ნამდვილ user data-ს არ შევეხო სანამ ცვლილება არ გადამოწმდა. Staging = „production-ის აჩრდილი". ყოველი migration / major change ჯერ staging-ზე → verify → prod.

## სქემა

```
                     ┌────────────────┐
   git push          │  GitHub        │
   ──────────────►   │  main branch   │
                     └────────┬───────┘
                              │
                              │ (Vercel auto-deploy)
                              ▼
              ┌───────────────────────────────┐
              │  Vercel — Production env      │
              │  engineers.ge                  │
              │  → Supabase engineers-prod    │
              │  → ANTHROPIC prod key         │
              │  → RESEND prod key            │
              │  → ADMIN_EMAIL = giorgi@…     │
              └───────────────────────────────┘

   git push feature/* ─────►  Vercel auto-deploy (Preview)
                              ┌───────────────────────────────┐
                              │  Vercel — Preview env         │
                              │  engineers-<branch>.vercel.app│
                              │  → Supabase engineers-staging │
                              │  → ANTHROPIC dev key          │
                              │  → RESEND test domain         │
                              │  → ADMIN_EMAIL = test@…       │
                              └───────────────────────────────┘
```

## Setup (one-time)

### 1. Second Supabase project — `engineers-staging`

1. Supabase Dashboard → New project → name: `engineers-staging`
2. Region: იგივე რაც prod (Frankfurt/Stockholm)
3. Password: სხვა, ვიდრე prod-ის
4. დაელოდე provisioning-ს (~2 წუთი)
5. Settings → API → ჩამოწერე:
   - `NEXT_PUBLIC_SUPABASE_URL` (staging)
   - `SUPABASE_SERVICE_ROLE_KEY` (staging)

### 2. Migration-ების მორგება staging-ზე

```bash
# ლოკალურად — supabase CLI
npx supabase link --project-ref <staging-ref>
npx supabase db push

# ან ხელით — SQL Editor → ყოველი 0001_*.sql → 0017_*.sql ფაილი თანმიმდევრობით Run
```

**მნიშვნელოვანი:** ორივე project-ზე **ერთი და იგივე** migration-ები. staging-ი pristine prod-ის „rehearsal"-ია, არა dev-sandbox.

### 3. Vercel env split

Vercel → Project Settings → Environment Variables. დაამატე ორმხრივად:

| Variable | Production | Preview |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | staging URL |
| `SUPABASE_SERVICE_ROLE_KEY` | prod key | staging key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon | staging anon |
| `AUTH_SECRET` | რეალური | ცალკე test secret |
| `ADMIN_USER` | giorgi | test-admin |
| `ADMIN_PASS_HASH` | რეალური hash | test hash (იოლი პაროლი staging-ზე) |
| `ANTHROPIC_API_KEY` | Production API key | Development key (უფრო იაფი/rate-limited) |
| `RESEND_API_KEY` | engineers.ge verified | Resend test domain |
| `ADMIN_EMAIL` | giorgi@engineers.ge | test-receive@giorgi… |
| `MAIL_FROM` | `engineers.ge <no-reply@…>` | `staging.engineers.ge <…>` |
| `NEXT_PUBLIC_SITE_URL` | `https://engineers.ge` | `$VERCEL_BRANCH_URL` (built-in) |
| `CRON_SECRET` | prod secret | staging secret |

**Preview env automation:** Vercel-ს აქვს `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL` ჩაშენებული ცვლადები. Code-ში შეგიძლია პირობა:

```ts
const isStaging = process.env.VERCEL_ENV === 'preview';
```

### 4. Vercel deploy branches

Project Settings → Git:
- **Production Branch:** `main`
- **Preview deployments:** All branches (default).

ყოველი git push → branch → Vercel ავტომატურად ქმნის preview URL-ს (`engineers-<branch>-<team>.vercel.app`). ამ URL-ი იყენებს staging env-ებს.

## Workflow

### Migration-ების ცვლილება

1. ლოკალურად — დაწერე ახალი migration `supabase/migrations/00NN_change.sql`
2. `git checkout -b db/change-name && git add ... && git commit && git push`
3. Vercel Preview deploy → **staging Supabase-ზე** გაუშვი migration:
   ```bash
   # Supabase Dashboard (staging) → SQL Editor → paste → Run
   ```
4. Preview URL-ზე ხელით ტესტი: გვერდი იტვირთება? admin UI მუშაობს? smoke?
5. თუ ოკ → PR `main`-ში → merge → prod deploy
6. **prod-ზე გაუშვი იგივე migration** Supabase (prod) → SQL Editor-ში

### გადაუდებელი rollback

- **Vercel:** Deployments → find last green → "Promote to Production"
- **Supabase migration:** წინასწარ ჩაწერე `drop table …` / `alter table drop column …` — reverse SQL staging-ზე ჯერ.

### Data seed (staging)

Staging-ი ცარიელია ახალ Supabase project-ში. თუ გინდა რომ admin UI „ცოცხალი" გამოიყურებოდეს:

1. Login admin → [`/admin/tiles`](../app/admin/(authed)/tiles/page.tsx) — შეავსე 8 slot-ი sample-ით
2. `/admin/features` → ზოგიერთი fearture `test` mode-ში — ბანერი და bug-report flow-ის ტესტი
3. `/admin/users` — ჩაწერე 2-3 test user-ი (manual SQL ან რეგისტრაცია preview URL-ზე)

## რისკები

- **Preview URL-ი public-ია (Vercel default).** არ ჩასვათ რეალური data staging-ში. Password protect შეგიძლია Vercel → Settings → Deployment Protection → Vercel Authentication.
- **ერთი Resend account-ი.** სტრიქონი `MAIL_FROM=staging.engineers.ge <…>` გაიცდება „Domain not verified" error-ით. გამოსავალი: ცალკე subdomain `stg.engineers.ge` verify Resend-ზე.
- **Cron-ები preview-ზე.** Vercel cron-ები მხოლოდ Production-ზე მუშაობენ. Preview-ი cron-ს ვერ სცადავ. ეს OK-ია — prod-ის testing feature branch-ზე არ უნდა ხდებოდეს.

## Quick verify checklist (ყოველი merge-ის წინ)

- [ ] Preview URL-ი ხსნის `/` → 200, ძირითადი hero grid ჩანს
- [ ] `/admin/health` → readiness 5/5 მწვანე
- [ ] `npm run smoke SMOKE_URL=<preview-url>` → 25/25
- [ ] თუ migration ჩართო → staging Supabase-ზე applied
- [ ] თუ ახალი env → Vercel Preview + Production ორივეზე დამატდა

## რატომ არა „იდენტური ჩანაცვლება"

ზოგი team-ი production Supabase-ს ათვალიერებს preview env-ადაც. **ნუ გააკეთო ეს** engineers.ge-ზე:
- Preview branch-ზე შემთხვევით ცდა შეცვლის რეალურ user-ის data-ს
- Migration test-ი prod-ზე პირდაპირ gamble-ია
- Email verification link-ი preview-ზე → user გაიხსნის → account actual-production-ში verify-დება (confusion)

Staging project-ის ფასი: $0 ($25 pro plan-ის გარეშე Supabase free tier საკმარისია MVP-სთვის).
