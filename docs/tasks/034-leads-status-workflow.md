# Task 034 — Leads: 3-status workflow + free-form labels

**Delegated to:** Codex
**Created:** 2026-05-04
**Parent:** /dmt CRM workflow refactor
**Scope:** Backend (1 migration + API changes) + frontend (lead row + status component + label component)
**Depends on:** Task 032 (shared-state) ✅ merged. Task 033 (contacts) — independent, can proceed in parallel.

## კონტექსტი

ამჟამად `dmt_leads`-ს აქვს `stage` ველი მრავალი ვარიანტით (`new`, `qualified`, `negotiating`, `won`, `lost` etc.). User-ს უნდა **2 დონის** model:

1. **სტატუსი (status)** — მკაცრი 3 ვარიანტი, რომელიც **workflow-ს მიუთითებს**:
   - `offer_in_progress` — ოფერი იქმნება (შიგნით sub-steps: ინვენტარი + ინვოისი)
   - `offer_accepted` — ოფერი მიღებულია (won)
   - `offer_rejected` — ოფერი უარყოფილია (lost)

2. **იარლიკი (labels)** — თავისუფალი tag-ები, ბევრი მნიშვნელობა, ვიზუალური ორგანიზებისთვის:
   - ახალი, დაინტერესებული, მიმდინარე, მოლოდინში, ცხელი, gold-client, follow-up, ...
   - User-ი თვითონ ქმნის (autocomplete-ი არსებულიდან)

**მთავარი ცვლილება ლოგიკაში:** არსებული `stage` სვეტი იცვლება ახალი workflow-ით. ეს გავლენას ახდენს ფილტრზე, dashboard-ზე, audit-ზე.

## ბიზნეს ლოგიკა (workflow)

```
ლიდი იქმნება
   ↓
status = "offer_in_progress"
   ↓
   ┌─────────────────────────────────────┐
   │ Sub-step 1: ინვენტარიზაცია           │
   │   - User checks: მარაგში არის?       │
   │   - Manual checkbox + ლინკი → /dmt/inventory │
   │   - sets `inventory_checked = true`  │
   ├─────────────────────────────────────┤
   │ Sub-step 2: ინვოისი                  │
   │   - "ინვოისის გენერაცია" button      │
   │   - ღია /dmt/invoices/new?lead=L-NNN │
   │   - ინვოისი იქმნება → `invoice_id` სავსეა │
   │   - sets `invoice_issued = true`     │
   └─────────────────────────────────────┘
   ↓
   User იღებს გადაწყვეტილებას:
   ↓
   ┌─────────────────────┬────────────────────┐
   ↓                     ↓
status = "offer_accepted"  status = "offer_rejected"
(terminal — won)           (terminal — lost)
```

## What to build

### A. Migration `0063_leads_status_workflow.sql`

```sql
-- Add new columns to dmt_leads (existing stage column stays for backward read, dropped after migration verified)
alter table public.dmt_leads
  add column if not exists labels text[] not null default '{}',
  add column if not exists offer_status text not null default 'offer_in_progress'
    check (offer_status in ('offer_in_progress', 'offer_accepted', 'offer_rejected')),
  add column if not exists inventory_checked boolean not null default false,
  add column if not exists inventory_checked_at timestamptz,
  add column if not exists inventory_checked_by text,
  add column if not exists invoice_id text,
  add column if not exists invoice_issued_at timestamptz,
  add column if not exists offer_decided_at timestamptz,
  add column if not exists offer_decided_by text;

-- Backfill from old stage values
update public.dmt_leads
   set offer_status = case
     when stage = 'won'  then 'offer_accepted'
     when stage = 'lost' then 'offer_rejected'
     else 'offer_in_progress'
   end,
       labels = case
     when stage = 'new'         then '{ახალი}'
     when stage = 'qualified'   then '{დაინტერესებული}'
     when stage = 'negotiating' then '{მიმდინარე}'
     else labels
   end
  where offer_status = 'offer_in_progress'  -- only update untouched rows
    and labels = '{}';

create index if not exists dmt_leads_offer_status_idx on public.dmt_leads (offer_status);
create index if not exists dmt_leads_labels_gin_idx   on public.dmt_leads using gin (labels);

-- Optional: separate table for label suggestions / autocomplete (lightweight, just text dictionary)
create table if not exists public.dmt_lead_label_suggestions (
  label       text primary key,
  use_count   int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.dmt_lead_label_suggestions disable row level security;

-- Seed common labels
insert into public.dmt_lead_label_suggestions (label, use_count) values
  ('ახალი', 0),
  ('დაინტერესებული', 0),
  ('მიმდინარე', 0),
  ('მოლოდინში', 0),
  ('ცხელი', 0),
  ('follow-up', 0)
on conflict (label) do nothing;

-- DO NOT drop dmt_leads.stage yet — keep for backward read, drop in a future migration after frontend fully migrated
```

### B. API changes

#### B1. `lib/dmt/shared-state-server.ts` — extend `leadFromDb` / `leadToDb`

```typescript
// In leadFromDb:
return {
  // ...existing fields (id, name, company, ...)
  // Drop or keep `stage` — KEEP for now (legacy read), but new fields override
  stage: String(row.stage ?? 'new'),  // legacy
  offerStatus: String(row.offer_status ?? 'offer_in_progress'),
  labels: Array.isArray(row.labels) ? row.labels.map(String) : [],
  inventoryChecked: Boolean(row.inventory_checked),
  inventoryCheckedAt: row.inventory_checked_at ? String(row.inventory_checked_at) : null,
  inventoryCheckedBy: row.inventory_checked_by ? String(row.inventory_checked_by) : null,
  invoiceId: row.invoice_id ? String(row.invoice_id) : null,
  invoiceIssuedAt: row.invoice_issued_at ? String(row.invoice_issued_at) : null,
  offerDecidedAt: row.offer_decided_at ? String(row.offer_decided_at) : null,
  offerDecidedBy: row.offer_decided_by ? String(row.offer_decided_by) : null,
};

// In leadToDb (ToDb mapping for write):
return {
  // ...existing
  stage: String(row.stage ?? 'new'),  // keep legacy, don't break
  offer_status: String(row.offerStatus ?? row.offer_status ?? 'offer_in_progress'),
  labels: Array.isArray(row.labels) ? row.labels.map(String) : [],
  inventory_checked: Boolean(row.inventoryChecked ?? row.inventory_checked),
  inventory_checked_at: toIsoOrNullable(row.inventoryCheckedAt ?? row.inventory_checked_at),
  inventory_checked_by: row.inventoryCheckedBy ? String(row.inventoryCheckedBy) : null,
  invoice_id: row.invoiceId ? String(row.invoiceId) : null,
  invoice_issued_at: toIsoOrNullable(row.invoiceIssuedAt ?? row.invoice_issued_at),
  offer_decided_at: toIsoOrNullable(row.offerDecidedAt ?? row.offer_decided_at),
  offer_decided_by: row.offerDecidedBy ? String(row.offerDecidedBy) : null,
};
```

`toIsoOrNullable` helper — same as `toIsoOrNow` but returns `null` for empty (not now()).

#### B2. `app/api/dmt/leads/[id]/inventory-check/route.ts` — POST

Marks `inventory_checked = true` for a lead. Body optional. Records audit entry.

```typescript
POST → {
  // sets inventory_checked=true, inventory_checked_at=now, inventory_checked_by=actor
  // audit: action='inventory_check' (NEW action — extend audit check constraint OR use 'update' with column_key='inventory_checked')
}
```

⚠️ Audit `action` check constraint is `('create','update','delete')`. To avoid migration, use `action='update'` with `column_key='inventory_checked'`.

Response: `{lead: Lead, auditEntry: AuditEntry}`.

#### B3. `app/api/dmt/leads/[id]/decide/route.ts` — POST

Body: `{outcome: 'accepted' | 'rejected'}`. Sets `offer_status='offer_accepted'` or `offer_rejected`, `offer_decided_at=now`, `offer_decided_by=actor`.

If user tries decide on lead where `inventory_checked=false` OR `invoice_id IS NULL` → return 400 `{error: 'workflow_incomplete', missing: ['inventory'|'invoice']}`. Frontend handles UX.

#### B4. `app/api/dmt/leads/[id]/labels/route.ts` — PATCH

Body: `{labels: string[]}`. Replaces lead's labels. Increments `use_count` in `dmt_lead_label_suggestions` for each new label not yet there (`upsert ON CONFLICT update use_count = use_count + 1`).

#### B5. `app/api/dmt/leads/labels/suggestions/route.ts` — GET

Returns top 50 labels by `use_count` for autocomplete.

#### B6. `app/api/dmt/leads/[id]/invoice/route.ts` — POST (placeholder)

Sets `invoice_id` to a stub value (e.g., `'INV-' + Date.now()`) and `invoice_issued_at=now`. Audit entry. **Real invoice generation out of scope ამ task-ში** — user manually clicks "ინვოისი ჩაითვალოს გენერირებულად" დროებით.

(Future task: integrate /dmt/invoices/new — POST creates real invoice → returns invoice id → patches lead.)

### C. Frontend

#### C1. `lib/dmt/leads-store.ts` — extend `Lead` type

```typescript
export type OfferStatus = 'offer_in_progress' | 'offer_accepted' | 'offer_rejected';

export type Lead = {
  // existing...
  // NEW:
  offerStatus: OfferStatus;
  labels: string[];
  inventoryChecked: boolean;
  inventoryCheckedAt: string | null;
  inventoryCheckedBy: string | null;
  invoiceId: string | null;
  invoiceIssuedAt: string | null;
  offerDecidedAt: string | null;
  offerDecidedBy: string | null;
};

export const OFFER_STATUS_META: Record<OfferStatus, {label: string; color: string; bg: string; border: string; icon: 'play'|'check'|'x'}> = {
  offer_in_progress: {label: 'ოფერის გაკეთება', color: 'var(--ora)',  bg: 'var(--ora-lt)', border: 'var(--ora-bd)', icon: 'play'},
  offer_accepted:    {label: 'მიღებულია',        color: 'var(--grn)',  bg: 'var(--grn-lt)', border: 'var(--grn-bd)', icon: 'check'},
  offer_rejected:    {label: 'უარყოფილი',        color: 'var(--red)',  bg: 'var(--red-lt)', border: '#f0b8b4',       icon: 'x'},
};

// API client functions
export async function checkLeadInventory(id: string): Promise<{lead: Lead}>;
export async function decideLeadOffer(id: string, outcome: 'accepted' | 'rejected'): Promise<{lead: Lead}>;
export async function setLeadLabels(id: string, labels: string[]): Promise<{lead: Lead}>;
export async function generateLeadInvoice(id: string): Promise<{lead: Lead}>;
export async function loadLabelSuggestions(): Promise<string[]>;
```

#### C2. `components/dmt/lead-status-cell.tsx` (new)

Replaces existing `stage` cell renderer in `app/dmt/leads/page.tsx` and `app/dmt/leads/manual/page.tsx`.

Layout:
- **Pill** showing current `offerStatus` (icon + label, colored per OFFER_STATUS_META)
- Click → opens **dropdown** with workflow controls:

If `offer_in_progress`:
```
┌──────────────────────────────────────┐
│ 🔄 ოფერის გაკეთება                   │
├──────────────────────────────────────┤
│ Workflow:                             │
│ ☑ ინვენტარიზაცია (✓ შემოწმდა)        │  ← მონიშნული თუ inventoryChecked
│ ☐ ინვოისი (გენერაცია)                 │  ← clickable, ღია modal/route
│                                       │
│ ─── გადაწყვეტილება ───                │
│ ✅ მიღებული                           │  (disabled if !inventoryChecked || !invoiceId)
│ ❌ უარყოფილი                          │  (always enabled — გაუქმება შესაძლებელია ნებისმიერ ეტაპზე)
└──────────────────────────────────────┘
```

If `offer_accepted` / `offer_rejected`:
```
┌──────────────────────────────────────┐
│ ✅ მიღებულია · 2026-05-04 by გიორგი მ. │
│ [ ↶ უკან გადაბრუნება ] (admin only)   │
└──────────────────────────────────────┘
```

Disabled "მიღებული" tooltip: "ჯერ მონიშნე ინვენტარიზაცია და გენერირე ინვოისი".

#### C3. `components/dmt/lead-labels-cell.tsx` (new)

Compact pill cluster + add button. Click → opens autocomplete combo:
- Type-ahead search (existing labels via `loadLabelSuggestions`)
- Press Enter on new value → creates new label, calls API, refreshes suggestions
- Selected labels shown as pills with × remove

```
[ახალი ×] [დაინტერესებული ×] [+]
                              ↓ click
                       ┌─────────────────┐
                       │ Search...       │
                       │ ─────────────── │
                       │ ▢ მოლოდინში     │
                       │ ▢ ცხელი         │
                       │ ▢ follow-up     │
                       │ ─────────────── │
                       │ + ახალი label-ი │
                       └─────────────────┘
```

#### C4. Replace `stage` column in lead grids

`app/dmt/leads/page.tsx` და `app/dmt/leads/manual/page.tsx`:

- სვეტი `stage` → ცვლის `offerStatus` (LeadStatusCell-ით render)
- ახალი სვეტი `labels` (LeadLabelsCell-ით) — default წინ stage-ის (immediately after company column)
- Filter UI: status filter — 3 ღილაკი ("ყველა · გაკეთება · მიღებული · უარყოფილი")
- Filter UI: label filter — chips (multi-select) + "ფილტრი label-ის გარეშე"
- Sort: status (in_progress first, then accepted, then rejected)

Default column order:
```
id, name, company, labels, phone, email, source, offerStatus, owner, value, createdBy, createdAt, updatedBy, updatedAt
```

Existing `stage` column REMAINS in DB (backward compat) but **HIDDEN from UI** (not in DEFAULT_COLUMN_ORDER).

#### C5. Sidebar — no new entry

ეს არსებული `/dmt/leads`-ის გავრცობაა, ცალკე გვერდი არაა. Sidebar უცვლელი.

### D. Audit log

`offer_status`-ის ცვლილების ლოგი — column_key='offer_status', before='offer_in_progress', after='offer_accepted'.
`labels`-ის ცვლილება — column_key='labels', before='[ახალი,ცხელი]', after='[ცხელი]'.
`inventory_checked` — column_key='inventory_checked', before='false', after='true'.
`invoice_issued` — column_key='invoice_issued', before='', after='INV-1234567890'.

Existing audit infrastructure-ი მიჰყევი ([app/api/dmt/leads/[id]/route.ts:79-98](../../app/api/dmt/leads/[id]/route.ts#L79-L98)).

## Acceptance criteria

✅ Migration `0063_leads_status_workflow.sql` apply-დება + backfill მუშაობს (ძველი `stage='won'` rows → `offer_status='offer_accepted'`)
✅ `\d dmt_leads` — ახალი 8 სვეტი ჩანს, indexes სწორია
✅ `dmt_lead_label_suggestions` — 6 seed entry
✅ Old `stage` column **არ წაიშალა** (legacy compat)
✅ `/dmt/leads` ცხრილში `offerStatus` pill ჩანს, click — dropdown with workflow
✅ "ოფერის გაკეთება" status-ისას: ☐ ინვენტარი / ☐ ინვოისი visible, click-ი state-ს ცვლის
✅ Both sub-steps incomplete → "მიღებული" disabled + tooltip
✅ Both sub-steps complete → "მიღებული" enabled, click → status='offer_accepted', pill ცვალდება
✅ "უარყოფილი" — ნებისმიერ მომენტში click-ის შესაძლებელია (terminal)
✅ Labels column: pill cluster, click + → autocomplete, type-ahead works
✅ ახალი label შექმნისას → `dmt_lead_label_suggestions` use_count++
✅ Audit log — workflow ცვლილებები დაწერილია (`column_key='offer_status'`, etc.)
✅ Multi-user: User A ცვლის status-ს → User B refresh → ხედავს
✅ Existing leads (created before migration) — `offer_status` correctly მოლეგებულია from old stage
✅ Conversion from contact (task 033) — ახალი ლიდი `offer_status='offer_in_progress'`, `labels=['ახალი']` (default)
✅ TypeScript `npm run typecheck` — pass
✅ ESLint `npm run lint` — pass
✅ UTF-8 encoding-ი დაცული — ქართული strings არ corruptდება

## Files to create

```
supabase/migrations/0063_leads_status_workflow.sql

app/api/dmt/leads/[id]/inventory-check/route.ts
app/api/dmt/leads/[id]/decide/route.ts
app/api/dmt/leads/[id]/labels/route.ts
app/api/dmt/leads/[id]/invoice/route.ts
app/api/dmt/leads/labels/suggestions/route.ts

components/dmt/lead-status-cell.tsx
components/dmt/lead-labels-cell.tsx
```

## Files to modify

```
lib/dmt/shared-state-server.ts   — leadFromDb / leadToDb extensions
lib/dmt/leads-store.ts           — Lead type, OFFER_STATUS_META, API client
app/dmt/leads/page.tsx           — column config (offerStatus + labels), remove stage column
app/dmt/leads/manual/page.tsx    — same
```

## Out of scope

- **Real invoice generation** (B6 endpoint is stub). Future task: integrate /dmt/invoices/new
- **Inventory reservation** — current "checked" is just a boolean. Future: link to specific SKU IDs in dmt_inventory.reserve_lead_ids
- **Drop legacy `stage` column** — keep for now, future cleanup migration
- **Label management page** — `/dmt/leads/labels` for admin to rename/merge/delete labels (future)
- **Bulk update** (multi-select rows → mass-set status/labels) — future task

## Notes

- **UTF-8** — task 032-ის ბაგი არ გაიმეოროს. ქართული strings UTF-8-ში უნდა დარჩეს.
- **bigserial PK** — audit insert-ში არ გადასცე `id`.
- **Legacy stage** — Read-it-but-don't-write-it pattern. ძველი ცხრილი backward compat-ისთვის.
- **Auto-derived label** — contact → lead conversion-ის დროს (task 033), ახალ ლიდს default `labels=['ახალი']` ჩაუყენე. ეს task 033-ს უკვე ცვლის — Codex-მა ყურადღება მიაქციოს.
- **Migration backfill** — `update ... where offer_status = 'offer_in_progress' and labels = '{}'` უზრუნველყოფს რომ ხელახლა apply-ის შემთხვევაში არ გადაიწეროს ხელით ცვლილებები.

## Test plan

1. `supabase migration up` — verify 0063 applied
2. psql: `select id, stage, offer_status, labels from dmt_leads limit 5;` — backfill სწორია
3. `npm run dev`, login admin
4. /dmt/leads → არსებული ლიდები ხედავენ ახალ pill-ებს
5. შექმენი ახალი ლიდი → status="ოფერის გაკეთება", labels=[]
6. Status pill click → workflow dropdown
7. ☐ ინვენტარი click → ✓ inventory_checked=true
8. ☐ ინვოისი click → ✓ invoice_id სავსეა
9. "მიღებული" enabled → click → status="მიღებულია"
10. ჩატში labels ცარიელი → click "+" → ჩაწერე "ცხელი" → Enter → label შექმნილია, suggestions-ში გაჩნდა
11. Refresh → labels და status შენახულია
12. Second user (incognito) → იგივე ლიდი → იგივე state ხედავს
