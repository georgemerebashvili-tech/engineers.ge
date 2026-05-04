# Task 033 — DMT Contacts page + lead conversion flow

**Delegated to:** Codex
**Created:** 2026-05-04
**Parent:** /dmt CRM expansion
**Scope:** Backend (1 migration + 4 API routes) + frontend (new page + sidebar entry + lead schema field)
**Depends on:** Task 032 (shared-state persistence) — must be merged first

## კონტექსტი

ამჟამად `/dmt/leads`-ი გამოიყენება ცხელი/აქტიური ბიზნეს ლიდებისთვის. **გვინდა ცალკე "კონტაქტების" ცხრილი** — ბევრი person/company საკონტაქტო ინფო რომელთან რეგულარული მუშაობა არ მიდის, მაგრამ მონაცემი დაცული უნდა გვქონდეს. შემდეგ:

- კონტაქტი → ლიდი **გადაყვანის ღილაკი** (manual conversion)
- კომპანიის გარეშე → **გადაყვანა შეუძლებელი** (button disabled)
- გადაყვანის შემდეგ → კონტაქტს **badge** ჩაუჩნდება ("→ L-1234"), ცხადია ვინ უკვე ლიდია და ვინ უბრალო კონტაქტი

ეს გაამარტივებს: marketing list-ს კონტაქტებში, sales pipeline-ს ლიდებში — წყვეტს ბუნდოვანებას.

## What to build

### A. Migration `0062_dmt_contacts.sql`

`supabase/migrations/0062_dmt_contacts.sql`:

```sql
create table if not exists public.dmt_contacts (
  id                    text primary key,           -- 'C-1001' format, generated client-side
  name                  text not null default '',
  company               text not null default '',   -- nullable in spirit; required for lead conversion
  position              text not null default '',
  phone                 text not null default '',
  email                 text not null default '',
  source                text not null default 'manual', -- 'manual' | 'import' | 'website' | 'referral' | 'event'
  notes                 text not null default '',
  tags                  text[] not null default '{}',
  converted_to_lead_id  text references public.dmt_leads(id) on delete set null,
  converted_at          timestamptz,
  converted_by          text,
  created_at            timestamptz not null default now(),
  created_by            text not null,
  updated_at            timestamptz not null default now(),
  updated_by            text not null
);

create index if not exists dmt_contacts_company_idx   on public.dmt_contacts (company);
create index if not exists dmt_contacts_phone_idx     on public.dmt_contacts (phone);
create index if not exists dmt_contacts_email_idx     on public.dmt_contacts (email);
create index if not exists dmt_contacts_converted_idx on public.dmt_contacts (converted_to_lead_id) where converted_to_lead_id is not null;
create index if not exists dmt_contacts_updated_idx   on public.dmt_contacts (updated_at desc);

-- audit log (reuses dmt_leads_audit pattern, but separate table)
create table if not exists public.dmt_contacts_audit (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  by            text not null,
  action        text not null check (action in ('create','update','delete','convert')),
  contact_id    text not null,
  contact_label text not null default '',
  column_key    text,
  column_label  text,
  before_val    text,
  after_val     text
);

create index if not exists dmt_contacts_audit_contact_idx on public.dmt_contacts_audit (contact_id);
create index if not exists dmt_contacts_audit_at_idx      on public.dmt_contacts_audit (at desc);

-- bidirectional link: a lead created from a contact knows where it came from
alter table public.dmt_leads
  add column if not exists from_contact_id text references public.dmt_contacts(id) on delete set null;

create index if not exists dmt_leads_from_contact_idx on public.dmt_leads (from_contact_id) where from_contact_id is not null;

alter table public.dmt_contacts        disable row level security;
alter table public.dmt_contacts_audit  disable row level security;
```

**Apply locally** (per CLAUDE.md autonomous policy):
- ფაილი დაამატე `supabase/migrations/`-ში
- Codex-ს გაცილებით — `apply-migration` script-ი თუ არსებობს, გაუშვი ([scripts/db-migrate.mjs](../../scripts/db-migrate.mjs)). თუ ვერ გადის — დატოვე ფაილი, user-ი ხელით apply-ავს `supabase migration up`-ით.

### B. API routes

**B1.** `app/api/dmt/contacts/route.ts` — GET (list) + POST (create)

```typescript
GET  → {contacts: Contact[]} (sorted by updated_at desc)
POST → {contact: Contact, auditEntry: AuditEntry|null}
```

POST body: `{id?, name, company, position?, phone, email, source?, notes?, tags?}`. ID-ი client-side გენერირდება (`C-NNNN` format, similar to leads).

**B2.** `app/api/dmt/contacts/[id]/route.ts` — PATCH (update) + DELETE

```typescript
PATCH → {contact: Contact, auditEntries: AuditEntry[]}  // per-field diff audit
DELETE → {ok: true, auditEntry: AuditEntry|null}
```

**B3.** `app/api/dmt/contacts/[id]/convert/route.ts` — POST (convert to lead) ⭐ central feature

Request body: optional `{stage?, source?, value?, owner?}` — extra lead fields the user fills in conversion modal.

Logic:
1. Auth: `requireDmtUser()`
2. Fetch contact by id
3. **VALIDATION:** if `contact.company` is empty/whitespace → return 400 `{error: 'company_required'}`
4. Check if already converted (`converted_to_lead_id != null`) → return 409 `{error: 'already_converted', leadId}`
5. Generate new lead ID via `nextLeadId(allLeads)` helper (server-side query for max L-NNNN)
6. Insert into `dmt_leads`:
   - `name: contact.name`
   - `company: contact.company`
   - `phone, email` from contact
   - `source: body.source ?? contact.source ?? 'manual'`
   - `stage: body.stage ?? 'new'`
   - `value: body.value ?? 0`
   - `owner: body.owner ?? actor`
   - `from_contact_id: contact.id`
7. Update contact: `converted_to_lead_id = lead.id`, `converted_at = now()`, `converted_by = actor`
8. Insert audit entries for both contact ('convert' action) and lead ('create' action with note)
9. Return `{lead, contact}` (both updated objects)

**B4.** `app/api/dmt/contacts/audit/route.ts` — GET (audit list)
**B5.** `app/api/dmt/contacts/bulk-import/route.ts` — POST (legacy/CSV bulk import)

All routes follow the same pattern as `/api/dmt/leads/*` ([reference](../../app/api/dmt/leads/route.ts)). Use `supabaseAdmin()` from `lib/supabase/admin`, `requireDmtUser()` from `lib/dmt/auth`, helper functions in [lib/dmt/shared-state-server.ts](../../lib/dmt/shared-state-server.ts) (add `contactFromDb`, `contactToDb`, `contactsAuditFromDb` helpers there).

⚠️ **bigserial PK trap:** `dmt_contacts_audit.id` არის `bigserial`. ნუ გადასცემ `id`-ს `insert()`-ში — DB თვითონ გენერაციოს. ეს ერთხელ უკვე გატეხილია `dmt_leads_audit`-ში (იხ. [task 032](./032-dmt-shared-state-persistence.md)) — გაიმეორო შეცდომა.

### C. Frontend page

**C1.** `app/dmt/contacts/page.tsx` — main list page

Layout pattern: მიჰყევი `[app/dmt/leads/manual/page.tsx](../../app/dmt/leads/manual/page.tsx)`-ს (grid-ი სვეტებით, ფილტრით, ძიებით, drag-reorder, აუდიტის pane).

Columns (default order):
| key | label | kind | width |
|---|---|---|---|
| `id` | `ID` | id (readonly, mono) | 80 |
| `name` | `სახელი` | text | 160 |
| `company` | `კომპანია` | text | 180 |
| `position` | `თანამდებობა` | text | 140 |
| `phone` | `ტელეფონი` | phone | 150 |
| `email` | `Email` | email | 200 |
| `source` | `წყარო` | source-select | 120 |
| `tags` | `ტეგები` | tags-pill | 180 |
| `convertedTo` | `ლიდი` | converted-badge | 120 |
| `notes` | `შენიშვნა` | textarea (truncate) | 200 |
| `updatedBy` | `ბოლო რედ.` | author | 140 |
| `updatedAt` | `ბოლო დრო` | date | 150 |

**Source dropdown values:** `manual`, `import`, `website`, `referral`, `event`.

**Convert column (`convertedTo` kind):**
- If `contact.converted_to_lead_id` is set:
  - Render badge: `→ L-1234` (clickable link → `/dmt/leads?highlight=L-1234`)
  - Background: green-lt, color: green, border: green-bd
- If empty:
  - Render button: "→ ლიდად გადაყვანა"
  - Style: blue outline, small
  - **DISABLED if `contact.company.trim() === ''`**, with tooltip: "კონტაქტს კომპანია არ აქვს — ჯერ მიუთითე"
  - On click → opens **conversion modal** (C2)

**C2.** `ConvertToLeadModal` component (in same file, after main component)

Modal contents:
- Heading: `კონტაქტის გადაყვანა ლიდად`
- Read-only summary: სახელი, კომპანია, ტელეფონი (from contact)
- Editable fields:
  - `stage` select (default `new`)
  - `source` select (default from contact)
  - `value` number (₾, default 0)
  - `owner` text (default current user)
- "გაუქმება" button → close modal
- "გადაყვანა" button (primary, blue) → POST `/api/dmt/contacts/[id]/convert` with body
  - On success: close modal, update local state (contact gets badge, refresh leads), toast "კონტაქტი გადავიდა → L-1234"
  - On 409 (already converted): show error inline
  - On 400 (company_required): show error (shouldn't happen since button is disabled)

**C3.** პერსისტენტი — როგორც `/dmt/leads/manual` (col widths/order localStorage-ში, data DB-ში). უსე `apiJson` helper-ი (იგივე pattern როგორც task 032).

### D. Sidebar entry

[components/dmt/sidebar.tsx:106-120](../../components/dmt/sidebar.tsx#L106-L120) — `'ოპერაციები'` სექციაში დაამატე **`leads`-ის ზემოთ**:

```typescript
{
  key: 'contacts',
  label: '0 · კონტაქტები',
  href: '/dmt/contacts',
  icon: Contact,  // from lucide-react
},
```

Renumber existing items: `'1 · ლიდები'` → `'1 · ლიდები'` (unchanged), `'2 · ინსპექტირება'` → `'2 · ინსპექტირება'`. ანუ contacts="0" — ნაცრისფერი/optional რომ აღნიშნოს რომ ეს pre-pipeline ფაზაა.

### E. Helpers in `lib/dmt/contacts-store.ts` (new file)

Mirror [lib/dmt/leads-store.ts](../../lib/dmt/leads-store.ts) — types, API client functions, `nextContactId()`.

```typescript
export type Contact = {
  id: string;
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  source: ContactSource;
  notes: string;
  tags: string[];
  convertedToLeadId: string | null;
  convertedAt: string | null;
  convertedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type ContactSource = 'manual' | 'import' | 'website' | 'referral' | 'event';

export const SOURCE_META: Record<ContactSource, {label: string; bg: string; color: string; border: string}> = {
  // ...same pattern as leads-store
};

// API functions
export async function loadContacts(): Promise<Contact[]>;
export async function createContact(c: Contact): Promise<{contact: Contact; ...}>;
export async function updateContact(id: string, patch: Partial<Contact>): Promise<...>;
export async function deleteContact(id: string): Promise<...>;
export async function convertContactToLead(id: string, body: ConvertBody): Promise<{contact: Contact; lead: Lead}>;
```

### F. Lead detail visibility (small backref)

`/dmt/leads/manual` (or wherever lead's full detail visible) — თუ `lead.from_contact_id` დასახელებულია, აჩვენე badge: `← C-1234` (linked to `/dmt/contacts?highlight=C-1234`). ეს ცალკე component-ი (`<LeadOriginBadge contactId={...} />`).

Out of scope ამ task-ში — **მხოლოდ DB ველი დადო** (`from_contact_id`), UI rendering მოგვიანებით task-ად. **არ აიძულო** დარენდრო ლიდის გვერდზე ეხლა.

## Acceptance criteria

✅ Migration `0062_dmt_contacts.sql` apply-დება შეცდომის გარეშე
✅ `\dt dmt_contacts*` → 2 ცხრილი (`dmt_contacts`, `dmt_contacts_audit`)
✅ `\d dmt_leads` → ახალი სვეტი `from_contact_id text` ჩანს
✅ `/dmt/contacts` გვერდი იხსნება, ცარიელი state ჩანს
✅ "ახალი კონტაქტის" ღილაკი → row ემატება, DB-ში ჩაიწერება, refresh-ზე რჩება
✅ ცხრილში edit-ი — DB სინქრონდება (apply task 032's localStorage→DB pattern)
✅ Convert button: კომპანიის გარეშე — disabled + tooltip
✅ Convert button: კომპანიით → modal იხსნება → ფორმის შევსების შემდეგ → ახალი ლიდი იქმნება `/dmt/leads`-ში → კონტაქტის row-ში badge `→ L-1234` ჩნდება
✅ Already-converted: ხელახლა convert-ი 409 ერორი + UI ნაცრისფერი badge "უკვე გადაყვანილი"
✅ Sidebar-ში "0 · კონტაქტები" entry ჩანს `1 · ლიდები`-ის ზემოთ
✅ Audit log: convert action ცხადად ნაჩვენებია (ვინ გადაიყვანა, როდის)
✅ Multi-user: User A კონტაქტი → User B refresh → ხედავს (DB sync, არა localStorage)
✅ Browser cache clear → მონაცემი არ იკარგება
✅ TypeScript `npm run typecheck` — pass
✅ ESLint `npm run lint` — pass
✅ Browser smoke test: `admin@engineers.ge` / `admin123` login → /dmt/contacts → create + edit + convert flow ერთად ნაცადი

## Files to create

```
supabase/migrations/0062_dmt_contacts.sql
app/dmt/contacts/page.tsx
lib/dmt/contacts-store.ts
app/api/dmt/contacts/route.ts
app/api/dmt/contacts/[id]/route.ts
app/api/dmt/contacts/[id]/convert/route.ts
app/api/dmt/contacts/audit/route.ts
app/api/dmt/contacts/bulk-import/route.ts
```

## Files to modify

```
components/dmt/sidebar.tsx       — sidebar entry
lib/dmt/shared-state-server.ts   — contactFromDb, contactToDb, auditContactFromDb helpers
```

## Out of scope (later tasks)

- Lead-side display of `from_contact_id` (badge in lead row)
- CSV import UI for bulk contacts
- Email/phone uniqueness validation
- Duplicate detection during contact create
- Bulk convert (multiple contacts → leads at once)
- Tag autocomplete from existing tags
- Contact merge UI

## Notes

- **UTF-8:** ფაილების encoding-ი მკაცრად UTF-8 უნდა დარჩეს. ქართული ტექსტი source-ში არ უნდა გადაიქცეს double-encoded sequence-ად (`áƒ` patterns). ერთხელ უკვე მოხდა task 032-ის დროს — ნუ გაიმეორებ.
- **bigserial PK:** `dmt_contacts_audit.id` ბიგსერიალია. INSERT-ში არასოდეს გაიტანო `id` ველი — DB თვითონ გააკეთებს.
- **Pattern:** ყველაფერი მიჰყევი არსებულ pattern-ს (leads/manual-leads/variables). ნუ ცდილობ ცალკე re-architect.
- **No realtime:** changes propagate manually (page refresh ხელით). Realtime sync out of scope.
- **CLAUDE.md sidebar rule:** ფიჩერი sidebar-ში ჩანდება task-ის closure-მდე — ეს criteria-ის ნაწილია.

## Test plan

1. `supabase migration up` — verify migration apply (psql `\dt`, `\d dmt_leads`)
2. `npm run dev` → http://localhost:3000/dmt/contacts
3. Login `admin@engineers.ge` / `admin123`
4. Click "ახალი კონტაქტი" → row ემატება
5. შეავსე name/phone (კომპანიის გარეშე) → "→ ლიდად" button disabled, hover tooltip ჩანს
6. დაამატე company → button enable-დება
7. Click "→ ლიდად" → modal იხსნება → შეავსე stage/source → "გადაყვანა"
8. Modal იხურება → row-ში badge `→ L-1XXX` ჩანს
9. გადადი `/dmt/leads` → ახალი ლიდი იქ არის
10. Open second browser (incognito) → login `nika@engineers.ge` / `pass123` → /dmt/contacts → იხედავ იგივე კონტაქტს ✅
11. Test edit → audit log ჩაიწერება
12. Test delete → ჩანაწერი ქრება + audit
