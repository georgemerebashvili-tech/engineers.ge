# Task 045 — Contacts: convert API inserts into the wrong leads table (FK violation)

**Status:** done 2026-05-07 — Codex ✅
**Created:** 2026-05-07
**Owner role:** Claude (lead) → Codex (implementation)
**Scope:** `app/api/dmt/contacts/[id]/convert/route.ts` and the matching unlink
route. NO other files. Stay inside `/dmt`.

---

## 0. Why

User feedback after Task 044 shipped:

> ლიდიდან იშლება, მაგრამ ვერ ემატება.

Translation: unlink works, but convert (toggle OFF → ON) fails. The toggle
flips optimistically, the server returns an error, the client rolls back, and
the user sees the toggle snap back to OFF.

This is a **server-side bug**, not a UI bug. Optimistic update is fine.

---

## 1. Root cause (verified against the live DB)

[`app/api/dmt/contacts/[id]/convert/route.ts`](../../app/api/dmt/contacts/[id]/convert/route.ts)
inserts the new lead row into the **wrong table**.

- The convert handler inserts into `dmt_manual_leads` (lines 16–29 query
  `dmt_manual_leads` for next id; lines 79–83 insert into `dmt_manual_leads`).
- It then sets `dmt_contacts.converted_to_lead_id = leadId`.
- But the FK on that column points to `dmt_leads`, NOT `dmt_manual_leads`:

```
dmt_contacts_converted_to_lead_id_fkey
  FOREIGN KEY (converted_to_lead_id) REFERENCES dmt_leads(id) ON DELETE SET NULL
```

(from migration [`0062_dmt_contacts.sql:11`](../../supabase/migrations/0062_dmt_contacts.sql#L11))

Live DB state confirming the failure:

```
dmt_leads:        n=30, max_id=30
dmt_manual_leads: n=33, max_id=35
next manual_lead id = 36
36 exists in dmt_leads? false   ← FK violation on the contacts UPDATE
```

Convert "worked" by accident before — `dmt_manual_leads.max_id` happened to
fall in the seeded `1..30` range of `dmt_leads`, so the FK lined up. Once the
manual leads table grew past 30, every new convert violates the FK.

Unlink does not hit the FK — it sets `converted_to_lead_id = null`. That's
why it works.

---

## 2. The fix

Insert the new lead into **`dmt_leads`**, the table the FK references.

`dmt_leads` schema (from migrations [`0061_dmt_shared_state.sql:3-21`](../../supabase/migrations/0061_dmt_shared_state.sql#L3-L21),
[`0062_dmt_contacts.sql:42-45`](../../supabase/migrations/0062_dmt_contacts.sql#L42-L45),
[`0063_leads_status_workflow.sql:1-11`](../../supabase/migrations/0063_leads_status_workflow.sql#L1-L11)):

```
id text primary key
name text default ''
company text default ''
phone text default ''
email text default ''
source text default 'website'
stage text default 'new'
owner text default ''
value numeric(12,2) default 0
labels text[] default '{}'
offer_status text default 'offer_in_progress'
inventory_checked boolean default false
from_contact_id text references dmt_contacts(id) on delete set null
created_at, created_by, updated_at, updated_by
```

### 2.1 Replace the body of the convert handler

Replace [lines 16–29](../../app/api/dmt/contacts/[id]/convert/route.ts#L16-L29)
(`nextLeadId` querying `dmt_manual_leads`) with a query against `dmt_leads`:

```ts
async function nextLeadId(db: ReturnType<typeof supabaseAdmin>) {
  const {data, error} = await db.from('dmt_leads').select('id');
  if (error) throw error;
  let max = 0;
  for (const row of data ?? []) {
    const n = Number((row as {id?: unknown}).id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}
```

Replace [lines 64–85](../../app/api/dmt/contacts/[id]/convert/route.ts#L64-L85)
(the `manualLeadRow` insert) with a `dmt_leads` insert that uses the schema's
fields:

```ts
const leadId = await nextLeadId(db);

const leadRow = {
  id: leadId,
  name: String(contact.name ?? ''),
  company: String(contact.company ?? ''),
  phone: String(contact.phone ?? ''),
  email: String(contact.email ?? ''),
  source: typeof body?.source === 'string' && body.source ? body.source : 'manual',
  stage: typeof body?.stage === 'string' && body.stage ? body.stage : 'new',
  owner: String(body?.owner ?? actor),
  value: parseNumber(body?.value, 0),
  labels: [],
  offer_status: 'offer_in_progress',
  from_contact_id: id,                 // back-reference contact → lead
  created_at: now,
  created_by: actor,
  updated_at: now,
  updated_by: actor,
};

const {data: lead, error: leadError} = await db
  .from('dmt_leads')
  .insert(leadRow)
  .select()
  .single();

if (leadError) return jsonError(leadError);
```

The contacts UPDATE block at lines 87–100 stays the same — it now references
the just-inserted `dmt_leads` row, so the FK is satisfied.

### 2.2 Update the response shape

[Lines 117–121](../../app/api/dmt/contacts/[id]/convert/route.ts#L117-L121)
currently use `manualLeadFromDb` to serialize a `dmt_manual_leads` row. Switch
to a serializer that matches `dmt_leads` shape — there should already be one
in [`lib/dmt/shared-state-server.ts`](../../lib/dmt/shared-state-server.ts)
(look for `leadFromDb` or similar; if not, add a thin one alongside
`manualLeadFromDb`):

```ts
return NextResponse.json({
  contact: contactFromDb(updatedContact),
  lead: leadFromDb(lead),  // ← changed from manualLeadFromDb
  contactAuditEntry: contactAudit ? contactAuditFromDb(contactAudit) : null,
});
```

The client at
[`lib/dmt/contacts-store.ts:103-110`](../../lib/dmt/contacts-store.ts#L103-L110)
uses `result.lead.id` for the toast — both shapes have an `id` field, so the
client doesn't need changes.

### 2.3 Update the unlink handler the same way

Open [`app/api/dmt/contacts/[id]/unlink-lead/route.ts`](../../app/api/dmt/contacts/[id]/unlink-lead/route.ts).
If it currently DELETEs from `dmt_manual_leads`, switch it to DELETE from
`dmt_leads` (matching where the convert just inserted). If it relies on
`dmt_contacts.converted_to_lead_id` only and doesn't delete the lead row at
all, leave it. Read the file first, then decide.

If the unlink does delete a lead row, also confirm the audit log on the
`dmt_leads_audit` table gets the `delete` entry (mirror what `dmt_manual_leads`
deletion would have written).

### 2.4 Don't break the manual leads grid

The manual leads page (`/dmt/leads/manual`) lists rows from `dmt_manual_leads`
— that table stays untouched by this change. The convert flow no longer
creates rows there. The pipeline page (`/dmt/leads`) lists rows from
`dmt_leads` — converts now show up in that view, alongside their
`from_contact_id` back-pointer.

---

## 3. Acceptance criteria — verify in browser

Login as `giorgi@dmt.ge` / `demo123`. Open `/dmt/contacts`. Then:

- [ ] On a contact with toggle OFF, click the toggle → toggle flips ON
  immediately (optimistic) → ribbon appears → ~half a second later, server
  responds with the new lead row → toast `ლიდი შეიქმნა: NN` (NN is the new id).
- [ ] Open `/dmt/leads` in another tab → the new lead row is visible there,
  with `name`, `company`, `phone` copied from the contact.
- [ ] On the same contact, click the toggle again → confirm dialog → toggle
  flips OFF → ribbon disappears → toast `ლიდი ამოშლილია`.
- [ ] Open browser devtools Network tab. Call to `POST
  /api/dmt/contacts/<id>/convert` returns **200** with JSON `{contact, lead, contactAuditEntry}`.
  No 500, no `foreign key violation` in the response.
- [ ] Repeat convert+unlink on 5 different contacts in a row. All succeed,
  each gets a unique sequential lead id.
- [ ] No regression on the manual leads grid (`/dmt/leads/manual`) — its rows
  still come from `dmt_manual_leads`, unchanged.
- [ ] No regression on the pipeline page (`/dmt/leads`) — its rows still come
  from `dmt_leads`, plus any newly converted contacts now appear there.
- [ ] `npm run lint` passes. `npm run typecheck` passes.

---

## 4. Out of scope

- Migration changes (FK direction, table merge, etc.). The schema is correct;
  the API is wrong.
- Adding new columns to `dmt_leads`.
- The `from_contact_id` UI surfacing on `/dmt/leads` (separate concern;
  defer if needed).
- The behaviour of the manual leads page.

---

## 5. Files expected to change

- `app/api/dmt/contacts/[id]/convert/route.ts` — swap target table from
  `dmt_manual_leads` to `dmt_leads`, populate the schema's fields, return the
  new lead via `leadFromDb`.
- `app/api/dmt/contacts/[id]/unlink-lead/route.ts` — if it currently touches
  `dmt_manual_leads`, switch to `dmt_leads`. Otherwise leave it.
- `lib/dmt/shared-state-server.ts` — if `leadFromDb` doesn't exist yet, add a
  thin one.

No new tables. No migrations. No package.json changes.

---

## 6. Reporting back

When done:
1. Append `(done YYYY-MM-DD — Codex ✅)` at the top of this file.
2. Update [`docs/TODO.md`](../TODO.md).
3. Commit: `fix(dmt/contacts): convert into dmt_leads (matches FK), not dmt_manual_leads (Task 045)`
