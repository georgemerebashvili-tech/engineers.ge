# Task 032 — DMT shared state: localStorage → Postgres (multi-user data sync)

**Delegated to:** Codex
**Created:** 2026-05-04
**Parent:** /dmt multi-tenant correctness
**Scope:** Backend (3 migrations + 3 API route trees) + frontend (3 pages refactor)
**Priority:** 🔴 BLOCKER — currently each user sees their own private data, broken multi-user assumption

## პრობლემა

`/dmt`-ის სამი ცენტრალური გვერდი მონაცემს `localStorage`-ში ინახავს, არა Postgres-ში. შედეგი:

- User A კომპიუტერ A-ზე ქმნის ლიდს → ინახება მის browser-ში
- User B კომპიუტერ B-ზე login-დება → მისთვის ეს ლიდი არ არსებობს
- მონაცემი არ syncდება, audit log-ი არასანდოა, browser cache-ის წაშლის შემდეგ ყველაფერი იკარგება

UI-ს ინლაინ ჰინტიც პირდაპირ აღიარებს ([app/dmt/leads/manual/page.tsx:974](../../app/dmt/leads/manual/page.tsx#L974)):
> "Grid-ის მონაცემები ისევ localStorage-შია"

## სამი დაზარალებული გვერდი

| გვერდი | localStorage keys | DB ცხრილი (გვინდა) |
|---|---|---|
| `/dmt/leads` | `dmt_leads_v1`, `dmt_leads_audit_v1` | `dmt_leads`, `dmt_leads_audit` |
| `/dmt/leads/manual` | `dmt_manual_leads_v2`, `dmt_manual_extra_cols_v1`, `dmt_manual_extra_vals_v1` | `dmt_manual_leads`, `dmt_manual_extra_cols`, `dmt_manual_extra_vals` |
| `/dmt/variables` | `dmt_variable_sets_v1`, `dmt_page_scopes_v1` | `dmt_variable_sets`, `dmt_page_scopes` |

**არ მიგრირდება:** UI პერსონალური settings (col widths, col order, filters, "me" name) — ეს tab-color-ის ანალოგიურად DMT user settings-ში გადავა (out of scope ამ task-ისთვის, რჩება localStorage-ში).

## What to build

### 1. Migration `0061_dmt_shared_state.sql`

`supabase/migrations/0061_dmt_shared_state.sql`-ში დაამატე ყველა ცხრილი ქვემოთ. RLS — disabled (ყველა access service_role-დან, ისე როგორც `dmt_users`-სთან).

```sql
-- ─── /dmt/leads ────────────────────────────────────────────────
create table if not exists public.dmt_leads (
  id          text primary key,             -- 'L-1001' format, generated client-side
  name        text not null default '',
  company     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  source      text not null default 'website',
  stage       text not null default 'new',
  owner       text not null default '',
  value       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  created_by  text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text not null
);

create index if not exists dmt_leads_stage_idx     on public.dmt_leads (stage);
create index if not exists dmt_leads_updated_idx   on public.dmt_leads (updated_at desc);

create table if not exists public.dmt_leads_audit (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  by            text not null,
  action        text not null check (action in ('create','update','delete')),
  lead_id       text not null,
  lead_label    text not null default '',
  column_key    text,
  column_label  text,
  before_val    text,
  after_val     text
);

create index if not exists dmt_leads_audit_lead_idx on public.dmt_leads_audit (lead_id);
create index if not exists dmt_leads_audit_at_idx   on public.dmt_leads_audit (at desc);

-- ─── /dmt/leads/manual ─────────────────────────────────────────
create table if not exists public.dmt_manual_leads (
  id          text primary key,
  company     text not null default '',
  contact     text not null default '',
  phone       text not null default '',
  contract    numeric(12,2),
  status      text not null default 'ახალი',
  role        text not null default '',
  owner       text not null default '',
  period      text not null default '',
  edited_by   text not null default '',
  edited_at   timestamptz not null default now(),
  created_by  text not null
);

create index if not exists dmt_manual_leads_status_idx on public.dmt_manual_leads (status);
create index if not exists dmt_manual_leads_edited_idx on public.dmt_manual_leads (edited_at desc);

create table if not exists public.dmt_manual_extra_cols (
  id          text primary key,             -- 'col_xyz' format from client
  label       text not null,
  kind        text not null check (kind in ('text','number','select')),
  options     jsonb not null default '[]'::jsonb,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.dmt_manual_extra_vals (
  lead_id     text not null references public.dmt_manual_leads(id) on delete cascade,
  col_id      text not null references public.dmt_manual_extra_cols(id) on delete cascade,
  value       text,
  primary key (lead_id, col_id)
);

-- ─── /dmt/variables ────────────────────────────────────────────
create table if not exists public.dmt_variable_sets (
  id          text primary key,             -- 'set_xyz' from client
  name        text not null,
  type        text not null default 'single' check (type in ('single','multi')),
  options     jsonb not null default '[]'::jsonb,
  position    int  not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.dmt_page_scopes (
  id          text primary key,             -- 'pg_xyz' from client
  label       text not null,
  icon        text,
  route       text,
  tables      jsonb not null default '[]'::jsonb,  -- nested {tables: [{id, label, columns: [...]}]}
  position    int  not null default 0,
  updated_at  timestamptz not null default now()
);

-- All RLS off — service_role only access (same pattern as dmt_users)
alter table public.dmt_leads               disable row level security;
alter table public.dmt_leads_audit         disable row level security;
alter table public.dmt_manual_leads        disable row level security;
alter table public.dmt_manual_extra_cols   disable row level security;
alter table public.dmt_manual_extra_vals   disable row level security;
alter table public.dmt_variable_sets       disable row level security;
alter table public.dmt_page_scopes         disable row level security;
```

**Apply locally:** ახალი workspace-ში — `cp` migration ფაილი `C:\Users\Zaza\dmt-local-supabase\supabase\migrations\0061_dmt_shared_state.sql`-ში → `supabase db reset` (ცარიელი state ხდება, seed უნდა ხელახლა გავუშვა). ალტერნატიულად: `supabase migration up`.

### 2. API routes (3 trees)

ყველა route — `requireDmtUser()` (lib/dmt/auth.ts) authentication-ით. service_role client-ი ([lib/supabase/admin.ts](../../lib/supabase/admin.ts)) — DB access-ისთვის.

#### 2.1 `/api/dmt/leads/*`

- `app/api/dmt/leads/route.ts` — GET (all leads) + POST (create lead)
- `app/api/dmt/leads/[id]/route.ts` — PATCH (update fields) + DELETE
- `app/api/dmt/leads/audit/route.ts` — GET (audit list) + POST (append entry)

POST `leads/route.ts` body: full Lead row. PATCH `leads/[id]`: partial Row + auth-ი ვინ რედაქტირებს audit-ისთვის.

#### 2.2 `/api/dmt/manual-leads/*`

- `app/api/dmt/manual-leads/route.ts` — GET + POST
- `app/api/dmt/manual-leads/[id]/route.ts` — PATCH + DELETE
- `app/api/dmt/manual-leads/extra-cols/route.ts` — GET + POST + (PATCH list reorder via PUT)
- `app/api/dmt/manual-leads/extra-cols/[id]/route.ts` — PATCH + DELETE
- `app/api/dmt/manual-leads/extra-vals/route.ts` — GET (filter by lead_id query param) + PUT (upsert)

#### 2.3 `/api/dmt/variables/*`

- `app/api/dmt/variables/sets/route.ts` — GET + POST
- `app/api/dmt/variables/sets/[id]/route.ts` — PATCH + DELETE
- `app/api/dmt/variables/pages/route.ts` — GET + POST
- `app/api/dmt/variables/pages/[id]/route.ts` — PATCH + DELETE

### 3. Frontend refactor — 3 pages

**Pattern:** `useState` + `useEffect[load via fetch]` ცვლის `loadFromLocalStorage()` calls. Each mutation → optimistic update + API call + rollback on error.

#### 3.1 [lib/dmt/leads-store.ts](../../lib/dmt/leads-store.ts)

- წაშალე ყველა `localStorage.getItem/setItem` `K.leads` და `K.audit` keys-ისთვის
- `loadLeads()` → `async fetch('/api/dmt/leads')`
- `saveLeads(rows)` → წაშალე (now per-row PATCH, არა bulk save)
- ახალი helpers: `createLead()`, `updateLead()`, `deleteLead()`, `appendAudit()` — ყველა API call
- შეინარჩუნე `K.order/widths/filters/me` localStorage-ში (per-user UI settings — out of scope)

#### 3.2 [app/dmt/leads/page.tsx](../../app/dmt/leads/page.tsx)

- `useEffect` initial load → fetch all leads + audit, setRows + setAudit
- `addLead()`, `updateField()`, `deleteLead()`, `clearAll()` — yi await API call after optimistic state update
- შეცდომის შემთხვევაში — toast / alert + rollback state

#### 3.3 [app/dmt/leads/manual/page.tsx](../../app/dmt/leads/manual/page.tsx)

- იგივე pattern: localStorage-ის `STORE_KEY/EXTRA_COLS_KEY/EXTRA_VALS_KEY` წაშალე
- API-ით load + per-mutation save
- შეინარჩუნე `COL_WIDTHS_KEY/COL_ORDER_KEY/STATUS_ORDER_KEY` localStorage-ში (UI prefs)

#### 3.4 [lib/dmt/variables.ts](../../lib/dmt/variables.ts) + [app/dmt/variables/page.tsx](../../app/dmt/variables/page.tsx)

- `loadSets()/saveSets()/loadPageScopes()/savePageScopes()` → API calls
- `STORE_KEY` და `PAGES_KEY` წაშალე

### 4. localStorage migration helpers (one-time)

ყველა გვერდზე — initial mount-ზე:

```ts
useEffect(() => {
  const localData = localStorage.getItem(STORE_KEY);
  if (localData) {
    fetch('/api/dmt/.../bulk-import', {method: 'POST', body: localData})
      .then(() => localStorage.removeItem(STORE_KEY));
  }
}, []);
```

ეს ერთჯერადი migration-ია — user რომ პირველად შევა ახალი ვერსიის შემდეგ, თავისი localStorage მონაცემი DB-ში გადავა, მერე — ყველგან უკვე shared.

შექმენი `app/api/dmt/{leads,manual-leads,variables}/bulk-import/route.ts` — POST-ით array იღებს, INSERT...ON CONFLICT DO NOTHING.

## Acceptance criteria

✅ Migration `0061_dmt_shared_state.sql` apply-დება შეცდომის გარეშე ლოკალურ ბაზაზე
✅ ყველა ცხრილი იქმნება (verify: `\dt` psql-ში)
✅ User A login-დება, ლიდს ქმნის → log out → User B login-ს იგივე ბაზაზე → **იგივე ლიდი ხედავს** ✅
✅ User A ცვლადს ქმნის → User B-ს ბიბლიოთეკაშიც ჩანს
✅ User A-ის manual lead-ი User B-სთვის ხილვადია
✅ Audit log — ყოველი edit-ის შემდეგ DB-ში ჩაიწერება, ორივე user-ი ხედავს
✅ Browser cache clear → მონაცემი არ იკარგება (DB-ში ცხოვრობს)
✅ ძველი localStorage მონაცემი (თუ რამე იყო) — auto-migrate-ს უკეთებს ერთხელ
✅ TypeScript: `npm run typecheck` — pass
✅ ESLint: `npm run lint` — pass
✅ ბრაუზერში: ორ window-ში ორი user-ი ერთდროულად — A-ის ცვლილება B-ში visible რეფრეშის შემდეგ

## Files to create

```
supabase/migrations/0061_dmt_shared_state.sql

app/api/dmt/leads/route.ts
app/api/dmt/leads/[id]/route.ts
app/api/dmt/leads/audit/route.ts
app/api/dmt/leads/bulk-import/route.ts

app/api/dmt/manual-leads/route.ts
app/api/dmt/manual-leads/[id]/route.ts
app/api/dmt/manual-leads/extra-cols/route.ts
app/api/dmt/manual-leads/extra-cols/[id]/route.ts
app/api/dmt/manual-leads/extra-vals/route.ts
app/api/dmt/manual-leads/bulk-import/route.ts

app/api/dmt/variables/sets/route.ts
app/api/dmt/variables/sets/[id]/route.ts
app/api/dmt/variables/pages/route.ts
app/api/dmt/variables/pages/[id]/route.ts
app/api/dmt/variables/bulk-import/route.ts
```

## Files to refactor

```
lib/dmt/leads-store.ts        — localStorage → fetch
lib/dmt/variables.ts          — localStorage → fetch
app/dmt/leads/page.tsx        — async load + per-mutation save
app/dmt/leads/manual/page.tsx — async load + per-mutation save
app/dmt/variables/page.tsx    — async load + per-mutation save
```

## არ შეცვალო (out of scope)

- Per-user UI settings: column widths, column order, filters, "me" display name → **localStorage რჩება**
- Tab color settings — უკვე DB-ზეა (`dmt_users.settings.manualLeadsTabColor`)
- Facebook leads (`dmt_fb_leads`) — უკვე DB-ზეა
- Inventory (`dmt_inventory`) — უკვე DB-ზეა

## Notes

- **Audit log** — IMPORTANT: per-mutation API call უნდა იყოს, არა client-side append. ანუ `/api/dmt/leads/[id]` PATCH-ი თვითონ ჩაწერს audit entry-ს server-side-ზე (atomic).
- **Conflict resolution** — ორი user-ი ერთდროულად რომ რედაქტირებდეს, last-write-wins (PATCH-ის order-ის მიხედვით). Optimistic locking out of scope.
- **Realtime sync** — ყოველ N წამში refetch / Supabase Realtime subscription out of scope. ჯერ მხოლოდ "page reload-ზე ფრეშია" საკმარისია.
- **localStorage-ის migration** — keep `migrated_<KEY>` flag-ი localStorage-ში რომ ერთხელ მხოლოდ მოხდეს.

## Test plan

1. ახალი ვერსიის deploy-ის წინ:
   - `supabase migration up` ლოკალურად
   - `npm run dev` → http://localhost:3000/dmt/login
2. Login: `admin@engineers.ge` / `admin123` (window 1)
3. Incognito window: login `nika@engineers.ge` / `pass123` (window 2)
4. Window 1 — ლიდს ქმნის "Test Lead 1"
5. Window 2 — page refresh → "Test Lead 1" ხილვადია ✅
6. Window 2 — ცვლილება stage-ზე "won"
7. Window 1 — refresh → stage="won" ✅
8. Browser cache clear (window 1) → refresh → ლიდი ისევ ჩანს ✅
9. /dmt/variables — VarSet-ი ქმნის window 1-ში → window 2 refresh → ჩანს ✅

ყველაფერი DB-ზე ცოცხლობს, localStorage მხოლოდ UI personal preferences-ისთვის.
