# Task 053 — DMT contacts + leads + negotiations: replace literal "მე" actor with the logged-in DMT user's display name

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Task 033 (contacts) + Task 034 (leads workflow)
**Scope:** [`lib/dmt/leads-store.ts`](../../lib/dmt/leads-store.ts) + write paths in DMT API routes (contacts, leads, manual-leads) + any UI cell that displays "ვინ დაამატა" / "ვინ შეცვალა" / `createdBy` / `updatedBy`

## ⚠️ MUST READ — NO DELETIONS

- ✅ NO DB column changes — `created_by` / `updated_by` already exist on all tables
- ✅ STRICTLY DMT scope (`/dmt/contacts`, `/dmt/leads`, `/dmt/leads/manual`, etc.)
- ✅ Existing rows with the literal `"მე"` value stay until they get updated — don't run a backfill migration
- ✅ Server-side `dmtActor()` from [`lib/dmt/shared-state-server.ts`](../../lib/dmt/shared-state-server.ts) is already correct — uses `me.name || me.email`

## პრობლემა (User-asked 2026-05-07)

User-მა ნახა "ვინ დაამატა" სვეტი contacts/leads/manual-leads-ში — ცოცხლდება `a მე`-ის badge ყოველ row-ზე. ეს არ არის right — ფაქტობრივი DMT user-ის სახელი/email უნდა ცოცხლდეს, არა ლიტერალი "მე".

რა ხდება ფაქტობრივად:

[`lib/dmt/leads-store.ts:173`](../../lib/dmt/leads-store.ts#L173) ცოცხალია **client-side localStorage helper** რომელიც აბრუნებს `'მე'` defаულტს როცა `localStorage[K.me]` არ არის set:

```ts
export function getActor(): string {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(K.me);
    if (saved) return saved;
  } catch {}
  return 'მე';   // ← ლიტერალი default
}
```

და `manual-lead`-ის write path-ი (POST/PATCH) იყენებს ამ `getActor()`-ს client-side, ე.ი. `createdBy: 'მე'` server-ს ეგზავნება. Server-side `shared-state-server.ts` `leadToDb()` გადაიღებს `row.createdBy` value-ს ფიქსაციის გარეშე, ისე რომ `'მე'` literal DB-ში ჩავარდება.

შედარებისთვის: **contacts** და **offers** route-ებში server `dmtActor(auth.me)` ცოცხლდება — სწორი account name. Leads/manual-leads აქცევს client-supplied "მე"-ს.

## Spec

### A. Server-side — always use `dmtActor()` for `created_by` / `updated_by`

In [`app/api/dmt/leads/route.ts`](../../app/api/dmt/leads/route.ts) + [`app/api/dmt/leads/[id]/route.ts`](../../app/api/dmt/leads/[id]/route.ts) + [`app/api/dmt/manual-leads/route.ts`](../../app/api/dmt/manual-leads/route.ts) + [`app/api/dmt/manual-leads/[id]/route.ts`](../../app/api/dmt/manual-leads/[id]/route.ts) + any other DMT POST/PATCH:

```ts
const actor = dmtActor(auth.me);   // ← already imported in most routes
const now = new Date().toISOString();
// When inserting:
{ ..., created_by: actor, updated_by: actor, created_at: now, updated_at: now }
// When updating:
{ ..., updated_by: actor, updated_at: now }   // do NOT touch created_by
```

In `shared-state-server.ts` mappers (`leadToDb`, `contactToDb`):
- **Stop accepting client-provided `createdBy/updatedBy` for new rows.** Always overwrite with the route-supplied `actor`.
- Existing rows keep their `created_by`; only `updated_by` is rewritten on PATCH.

```diff
 export function leadToDb(row, actor) {
   return {
     ...
-    created_by: String(row.createdBy ?? row.created_by ?? actor),
-    updated_by: String(row.updatedBy ?? row.updated_by ?? actor),
+    created_by: actor,                  // INSERT path — caller controls preservation
+    updated_by: actor,                  // always the actor making this request
     ...
   };
 }
```

For PATCH paths that should preserve `created_by` from the existing DB row, the route should fetch the existing row first and merge — pattern already used in offer routes.

### B. Client-side — kill the literal `'მე'` default

[`lib/dmt/leads-store.ts:173`](../../lib/dmt/leads-store.ts#L173):

```diff
 export function getActor(): string {
   if (typeof window === 'undefined') return 'system';
   try {
     const saved = localStorage.getItem(K.me);
     if (saved) return saved;
   } catch {}
-  return 'მე';
+  return '';   // empty → server fills in via dmtActor(auth.me)
 }
```

OR remove the function entirely and let server fill it. Recommend the latter:

1. Remove all client-side `getActor()` callers from POST/PATCH bodies.
2. Routes ignore client-supplied `createdBy/updatedBy` (per A above).

### C. UI — actor cell rendering

For any cell that displays `createdBy` / `updatedBy`:

```tsx
const ActorChip = ({name}: {name: string}) => {
  const display = name?.trim() || '—';
  const initial = display === '—' ? '?' : display.charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur-2 px-2 py-0.5 text-[11px] text-text-2">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-lt text-[9px] font-bold text-blue">
        {initial}
      </span>
      {display}
    </span>
  );
};
```

Replace any current "მე" hardcode in cells with `<ActorChip name={row.createdBy} />`.

### D. Backfill: leave for follow-up task

Existing rows with `created_by = 'მე'` stay as-is. Optional cleanup migration **not in scope**:
```sql
-- Run separately if user requests:
-- update public.dmt_leads set created_by = 'system' where created_by = 'მე';
-- update public.dmt_contacts set created_by = 'system' where created_by = 'მე';
```

## Acceptance criteria

✅ New lead/manual-lead/contact created → `created_by` in DB equals the logged-in DMT user's `name` (or `email` fallback) — NEVER literal "მე"
✅ Lead/contact PATCH → `updated_by` reflects the actor who made the change; `created_by` unchanged
✅ Client-side `getActor()` no longer returns `'მე'` literal
✅ UI cell "ვინ დაამატა" shows account name + initial avatar chip
✅ Existing rows with literal `'მე'` still render (just show "მე" as is) — no data loss
✅ TypeScript pass + lint
✅ Smoke: log in as `g@example.com` → create contact → DB `created_by = 'g@example.com'` (or whatever name) ✓

## Files to modify

```
lib/dmt/leads-store.ts                       (getActor → empty default OR removed)
lib/dmt/shared-state-server.ts               (leadToDb / contactToDb stop accepting client createdBy/updatedBy on insert)
app/api/dmt/leads/route.ts                   (POST — actor only)
app/api/dmt/leads/[id]/route.ts              (PATCH — actor only for updated_by)
app/api/dmt/manual-leads/route.ts            (same)
app/api/dmt/manual-leads/[id]/route.ts       (same)
app/api/dmt/contacts/route.ts                (verify already correct)
app/api/dmt/contacts/[id]/route.ts           (verify already correct)
app/dmt/leads/page.tsx                       (UI cell rendering — ActorChip)
app/dmt/leads/manual/page.tsx                (UI cell rendering — ActorChip)
app/dmt/contacts/page.tsx                    (UI cell rendering — ActorChip if column visible)
```

## Files NOT to touch

- ❌ DB schema / migrations
- ❌ Other DMT pages (invoices/inventory/audits all already correct via `dmtActor`)
- ❌ Login/auth flow

## Out of scope

- Backfilling existing `'მე'` rows (separate task if requested)
- Custom user avatars / profile photos
- Multi-actor display ("created by X, updated by Y")
- Per-user color coding (existing `dmt_users.settings` color unchanged)

## Test plan

1. `npm run typecheck && npm run lint`
2. Log in as DMT user with `name = "Giorgi M."`
3. `/dmt/contacts` → "+ ახალი კონტაქტი" → fill name → save
4. Inspect: DB `dmt_contacts.created_by = "Giorgi M."` ✓
5. UI table cell shows `[G] Giorgi M.` chip ✓
6. Edit the same contact → `updated_by` updates to current actor (still "Giorgi M.") ✓
7. Switch to different user, edit again → `updated_by` changes; `created_by` unchanged ✓
8. /dmt/leads/manual same flow ✓
9. /dmt/leads (auto-imported FB lead etc.) — admin owners flow not regressed
10. Update [docs/TODO.md](../TODO.md) → mark Task 053 done

## Notes for Codex

- **Server is the source of truth.** Never trust client-supplied `createdBy/updatedBy` — overwrite with `dmtActor(auth.me)` in every route.
- For `created_by` preservation on PATCH: read the existing row, copy `created_by` forward into the update payload only if you write the full row; otherwise just don't include it in the update set.
- `K.me` localStorage key + `setActor()` setter still useful for migrating older offline drafts — leave the setter, just neuter the default fallback.
- DESIGN_RULES tokens for ActorChip: `bg-sur-2`, `border-bdr`, `text-text-2`, blue avatar circle uses `bg-blue-lt + text-blue` (already used elsewhere).
