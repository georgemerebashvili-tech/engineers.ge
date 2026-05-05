# Task 037 — DMT: Offer creation + per-lead inventory with AI photo analysis

**Delegated to:** Codex
**Created:** 2026-05-05
**Parent:** /dmt CRM workflow expansion
**Scope:** **STRICTLY /dmt namespace** — backend (3 migrations + multiple API routes) + frontend (offer modal, mobile inventory page, AI vision endpoint) + Supabase Storage bucket
**Depends on:** Task 033 ✅ contacts. Task 035/036 (TagsCell, M-NNNN format) — independent.

## ⚠️ MUST READ — SCOPE & NO DELETIONS

### SCOPE LIMITS

- ✅ **Work ONLY on /dmt area** — `app/dmt/**`, `app/api/dmt/**`, `components/dmt/**`, `lib/dmt/**`, `supabase/migrations/006X_*`
- ❌ **DO NOT TOUCH** any other part of the site (TBC, calc, dashboard, admin, etc.)
- ❌ **DO NOT MODIFY** existing Anthropic integration (`lib/anthropic.ts`, `resolveAnthropicKey`) — use as-is
- ❌ **DO NOT MODIFY** existing `dmt_inventory` table or `/api/dmt/inventory/*` routes — read-only reuse
- ❌ **NO DELETIONS** — never drop tables, columns, files, rows. Only additive

### Existing infrastructure to REUSE (do not modify)

| Resource | Path | How to use |
|---|---|---|
| Anthropic API key resolver | `lib/anthropic.ts` `resolveAnthropicKey()` | Call from server route, attach to fetch headers as `x-api-key` |
| DMT photo upload pattern | `app/api/dmt/inventory/upload/route.ts` (5MB, JPEG/PNG/WebP, Supabase Storage `dmt-inventory` bucket) | Mirror this for new lead-photos bucket |
| `dmt_inventory` SKU catalog | `dmt_inventory` table — reads only via existing `/api/dmt/inventory` GET | Used as source for offer item picker |
| Auth | `requireDmtUser()` from `lib/dmt/shared-state-server` | Wrap every new route |
| supabaseAdmin | `lib/supabase/admin` | DB access |

## What to build (3 phases)

### Phase A — Offers (`dmt_offers` table + create UI)

#### Migration `0067_dmt_offers.sql`

```sql
create table if not exists public.dmt_offers (
  id          text primary key,                    -- 'O-1001' format
  lead_id     text not null,                       -- references dmt_manual_leads(id)
  status      text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'rejected', 'cancelled')),
  items       jsonb not null default '[]'::jsonb,  -- [{sku?, name, description?, qty, unit_price, currency, source: 'inventory'|'custom'}, ...]
  subtotal    numeric(12,2) not null default 0,
  vat_rate    numeric(5,2),                        -- e.g., 18.00 for 18% VAT, null = none
  vat_amount  numeric(12,2),
  total       numeric(12,2) not null default 0,
  currency    text not null default 'GEL',
  delivery_terms text not null default '',
  payment_terms  text not null default '',
  notes       text not null default '',
  share_token text unique,                          -- random 32-char for public access link
  share_token_expires_at timestamptz,
  sent_at     timestamptz,
  approved_at timestamptz,
  approved_by_client text,                          -- name/email of approver (from public page)
  rejected_at timestamptz,
  rejection_reason text,
  created_at  timestamptz not null default now(),
  created_by  text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text not null
);

create index if not exists dmt_offers_lead_idx    on public.dmt_offers (lead_id);
create index if not exists dmt_offers_status_idx  on public.dmt_offers (status);
create index if not exists dmt_offers_share_idx   on public.dmt_offers (share_token) where share_token is not null;
create index if not exists dmt_offers_updated_idx on public.dmt_offers (updated_at desc);

create table if not exists public.dmt_offers_audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  by          text not null,
  action      text not null check (action in ('create', 'update', 'send', 'approve', 'reject', 'delete')),
  offer_id    text not null,
  lead_id     text,
  before_val  jsonb,
  after_val   jsonb,
  notes       text
);

create index if not exists dmt_offers_audit_offer_idx on public.dmt_offers_audit (offer_id);
create index if not exists dmt_offers_audit_at_idx    on public.dmt_offers_audit (at desc);

alter table public.dmt_offers       disable row level security;
alter table public.dmt_offers_audit disable row level security;
```

**ID format:** `O-1001`, `O-1002`, ... (sequential, server-generated like M-NNNN pattern from task 036).

#### API routes (Phase A)

```
GET    /api/dmt/offers                           — list (filter by lead_id query)
POST   /api/dmt/offers                           — create draft
GET    /api/dmt/offers/[id]                      — single offer
PATCH  /api/dmt/offers/[id]                      — update fields
DELETE /api/dmt/offers/[id]                      — soft → status='cancelled' (NO actual delete)
POST   /api/dmt/offers/[id]/send                 — generate share_token (32-char hex), set status='sent', return public URL
POST   /api/dmt/offers/[id]/audit                — manual audit entry (notes)
```

`POST /[id]/send`:
1. Generate `share_token = randomBytes(16).toString('hex')`
2. Set `share_token_expires_at = now + 30 days`
3. Update status='sent', sent_at=now
4. Return `{ offer, publicUrl: '/offer/' + share_token }`

(Public approval page itself is Phase D — not in this task; just generate the URL.)

#### Frontend — Offer creation flow

**Location:** Add "ოფერი" button on `/dmt/leads/manual` row actions (not modal — separate panel).

Better approach: lead row click opens **drawer/sidebar** showing lead details + tabs:
- 📋 Info (existing fields)
- 📦 ოფერები (list of offers for this lead + "ახალი ოფერი" button)
- 📸 ინვენტარი (Phase B)

**Offer Editor Component** (`components/dmt/offer-editor.tsx`) — modal or full-page:

```
┌──────────────────────────────────────┐
│ ოფერი O-1001 · M-1234 (კომპანია)      [draft] │
├──────────────────────────────────────┤
│  ITEMS (table):                                │
│  ┌────────┬────────┬─────┬─────────┬─────┐    │
│  │ პროდუქტი │ აღწერა │ qty │ ფასი    │ Σ  │    │
│  ├────────┴────────┴─────┴─────────┴─────┤    │
│  │ [+ Inventory-დან] [+ Custom item]      │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Inventory picker:                             │
│   - search/filter dmt_inventory                │
│   - click row → adds with sku/name/price       │
│  Custom item:                                  │
│   - inline form (name, qty, price)             │
│                                                │
│  Subtotal: ₾ 1,200.00                         │
│  VAT (18%): ₾ 216.00     [☑ Apply VAT]        │
│  Total:    ₾ 1,416.00                         │
│                                                │
│  [ Delivery terms — textarea ]                 │
│  [ Payment terms — textarea ]                  │
│  [ Notes — textarea ]                          │
├──────────────────────────────────────┤
│  [Save draft]  [Send to client →]              │
└──────────────────────────────────────┘
```

**Behavior:**
- Items can be added from `dmt_inventory` (button → searchable picker) OR as custom (free text)
- `source` field on each item: `'inventory'` or `'custom'`
- Subtotal/total auto-recalc on item changes
- VAT optional toggle (default 18% Georgia)
- "Save draft" → status='draft', no token
- "Send to client" → status='sent', returns public URL → toast with copy button

### Phase B — Per-lead inventory (mobile photos + AI vision)

#### Migration `0068_dmt_lead_inventory_photos.sql`

```sql
create table if not exists public.dmt_lead_inventory_photos (
  id              text primary key,                -- 'P-' + ulid/timestamp
  lead_id         text not null,
  photo_url       text not null,
  thumbnail_url   text,
  ai_analyzed     boolean not null default false,
  ai_analysis     jsonb,                           -- {items: [{name, category, qty, condition, suggested_sku?}], confidence: 0.85, raw: '...'}
  ai_model        text,                             -- 'claude-sonnet-4-6' or 'claude-haiku-4-5'
  ai_analyzed_at  timestamptz,
  ai_error        text,
  matched_inventory_id uuid,                        -- references dmt_inventory(id) if user confirmed match
  matched_qty     int,
  user_notes      text not null default '',
  created_at      timestamptz not null default now(),
  created_by      text not null,
  updated_at      timestamptz not null default now(),
  updated_by      text not null
);

create index if not exists dmt_lead_inventory_photos_lead_idx
  on public.dmt_lead_inventory_photos (lead_id);
create index if not exists dmt_lead_inventory_photos_ai_idx
  on public.dmt_lead_inventory_photos (ai_analyzed)
  where ai_analyzed = false;
create index if not exists dmt_lead_inventory_photos_matched_idx
  on public.dmt_lead_inventory_photos (matched_inventory_id)
  where matched_inventory_id is not null;

alter table public.dmt_lead_inventory_photos disable row level security;
```

#### Supabase Storage bucket

Create new bucket: `dmt-lead-photos` (public, 8MB max, image MIME types). Mirror `dmt-inventory` config.

#### API routes (Phase B)

```
POST   /api/dmt/leads/[id]/photos                — upload photo (multipart/form-data)
GET    /api/dmt/leads/[id]/photos                — list lead's photos
PATCH  /api/dmt/leads/[id]/photos/[photoId]      — update notes / matched_inventory_id / matched_qty
DELETE /api/dmt/leads/[id]/photos/[photoId]      — soft (mark deleted) — see "NO DELETIONS" note
POST   /api/dmt/leads/[id]/photos/[photoId]/analyze   — trigger AI vision (re-analyze)
```

`POST /api/dmt/leads/[id]/photos`:
1. Validate auth + lead exists
2. Upload to `dmt-lead-photos/leads/{lead_id}/{timestamp}-{rand}.{ext}`
3. Generate thumbnail (optional — use sharp or skip, just use full)
4. Insert `dmt_lead_inventory_photos` row with `photo_url`, `ai_analyzed=false`
5. **Trigger AI analysis async** (fire-and-forget OR await — see "AI vision" below)
6. Return `{photo: {...}}`

#### AI vision — `POST /api/dmt/leads/[id]/photos/[photoId]/analyze`

Uses existing Anthropic integration:

```typescript
import {resolveAnthropicKey} from '@/lib/anthropic';

const apiKey = await resolveAnthropicKey();
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',  // or sonnet for higher quality
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'url',
            url: photoUrl,  // public URL from Supabase Storage
          },
        },
        {
          type: 'text',
          text: `გააანალიზე ფოტო და მომიწოდე JSON ფორმატი:
{
  "items": [
    {
      "name": "ნივთის სახელი ქართულად",
      "category": "ერთ-ერთი: HVAC | radiator | pipe | valve | tool | other",
      "qty": <approximate count>,
      "condition": "new | used | damaged",
      "description": "მოკლე აღწერა",
      "suggested_sku_keywords": ["ძიების სიტყვები inventory-ში"]
    }
  ],
  "scene_description": "ზოგადი აღწერა",
  "confidence": 0.0-1.0
}

დააბრუნე მხოლოდ JSON, არანაირი markdown/explanation.`,
        },
      ],
    }],
  }),
});
```

Parse response → store in `ai_analysis` JSONB column. Update `ai_analyzed=true`, `ai_analyzed_at=now`, `ai_model='claude-haiku-4-5-20251001'`.

If AI fails: store error in `ai_error`, leave `ai_analyzed=false` for retry.

**Cost note:** Claude Haiku ~$0.001/image. Use Haiku by default. Add `?model=sonnet` query param for high-quality re-analysis.

#### Frontend — Mobile inventory page

**Route:** `/dmt/m/leads/[id]/photos` — mobile-optimized standalone page (no sidebar, full-screen).

**Layout:**

```
┌──────────────────────────────────────┐
│ [←]  M-1234 ინვენტარი    [3 ფოტო]   │
├──────────────────────────────────────┤
│                                       │
│   ┌──────────────────┐                │
│   │                  │                │
│   │   📷 ატვირთე     │                │
│   │      ფოტო        │                │
│   │                  │                │
│   └──────────────────┘                │
│   (camera capture button — large)     │
│                                       │
├──────────────────────────────────────┤
│ ფოტოები:                              │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ IMG  │ │ IMG  │ │ IMG  │         │
│  │ 🤖 ✓ │ │ ⏳   │ │ ⚠   │         │
│  └──────┘ └──────┘ └──────┘         │
│  ✓ = AI done · ⏳ = analyzing · ⚠ = error │
└──────────────────────────────────────┘
```

**Click on photo → detail view:**

```
┌──────────────────────────────────────┐
│ [←]  ფოტო #1                          │
├──────────────────────────────────────┤
│                                       │
│  [Full image preview]                 │
│                                       │
├──────────────────────────────────────┤
│ 🤖 AI ანალიზი:                        │
│  • რადიატორი KERMI (5 ცალი, used)     │
│  • პოლიეთილენის მილი (~30მ, new)      │
│  • ბურთულა ვენტილი (3 ცალი)           │
│                                       │
│ Inventory match:                      │
│  [ ↕ აირჩიე SKU-დან... ]              │
│  qty: [___]                           │
│                                       │
│ შენიშვნა:                             │
│  [ textarea ]                         │
│                                       │
│ [ წაშლა ]      [ შენახვა ]            │
└──────────────────────────────────────┘
```

**Camera capture:**
- `<input type="file" accept="image/*" capture="environment" />` — opens native camera on mobile
- Preview before upload
- Multi-shot mode: after upload, "კიდევ ფოტო" button quickly returns to camera

**Mobile-specific:**
- Touch-friendly large buttons (min 44px tap target)
- Sticky header with back arrow
- Full-screen photo grid (no padding)
- Pull-to-refresh

### Phase C — Lead detail drawer integration

In `/dmt/leads/manual` page — clicking a row opens detail drawer (right-side panel):

**Tabs:**
1. **Info** — existing editable fields (current behavior on row click)
2. **ოფერები** (Phase A) — list + create offer
3. **ინვენტარი** (Phase B) — list of photos with AI analysis + "📱 ტელეფონით" button (deep-link to mobile route OR QR code)

**Mobile deep-link:**
- Show QR code that encodes `/dmt/m/leads/M-1234/photos`
- On desktop, user scans with phone → goes directly to mobile inventory flow
- Authenticated session required (or use temporary token with limited scope)

## Files to create

```
supabase/migrations/0067_dmt_offers.sql
supabase/migrations/0068_dmt_lead_inventory_photos.sql

app/api/dmt/offers/route.ts
app/api/dmt/offers/[id]/route.ts
app/api/dmt/offers/[id]/send/route.ts
app/api/dmt/offers/audit/route.ts

app/api/dmt/leads/[id]/photos/route.ts
app/api/dmt/leads/[id]/photos/[photoId]/route.ts
app/api/dmt/leads/[id]/photos/[photoId]/analyze/route.ts

app/dmt/m/leads/[id]/photos/page.tsx          (mobile-optimized)
app/dmt/m/leads/[id]/photos/[photoId]/page.tsx (photo detail)
app/dmt/m/layout.tsx                           (no sidebar, mobile shell)

components/dmt/offer-editor.tsx
components/dmt/offer-list.tsx
components/dmt/lead-detail-drawer.tsx
components/dmt/photo-grid.tsx
components/dmt/inventory-picker.tsx
components/dmt/qr-code-link.tsx                (uses existing 'qrcode.react' package)

lib/dmt/offers-store.ts                        (API client)
lib/dmt/photos-store.ts                        (API client)
```

## Files to modify

```
app/dmt/leads/manual/page.tsx              — open detail drawer on row click
lib/dmt/shared-state-server.ts             — add offerFromDb, photoFromDb helpers
components/dmt/sidebar.tsx                 — no new entry (lead detail accessible from existing pages)
```

## Acceptance criteria

### Phase A — Offers
✅ Migration `0067` apply-დება
✅ POST `/api/dmt/offers` ქმნის draft offer-ს, ID `O-NNNN`
✅ Offer Editor — items add from `dmt_inventory` (search + click) AND custom (free text)
✅ Subtotal/VAT/total auto-recalculate
✅ "Save draft" → DB persist
✅ "Send to client" → status='sent', share_token generated, public URL returned
✅ Audit log entries on create/update/send

### Phase B — Lead inventory photos
✅ Migration `0068` apply-დება
✅ Supabase Storage bucket `dmt-lead-photos` exists
✅ POST `/api/dmt/leads/[id]/photos` — upload works on mobile (camera capture)
✅ AI vision analyze endpoint — calls Anthropic Claude with photo URL, returns structured JSON
✅ Photo grid shows AI status (analyzing / done / error)
✅ Photo detail view — AI items list visible, user can match to existing SKU
✅ Multi-shot mode — quick consecutive uploads
✅ Mobile route `/dmt/m/leads/[id]/photos` — full-screen, no sidebar

### Phase C — Integration
✅ Lead row click opens detail drawer with 3 tabs
✅ Offer list visible per lead
✅ Photo grid visible per lead
✅ QR code generates correct mobile deep-link

### Universal
✅ All routes `requireDmtUser()` auth-gated
✅ NO modifications outside `/dmt` namespace
✅ NO modifications to `lib/anthropic.ts`, `dmt_inventory` table
✅ NO DELETIONS (soft delete only)
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული (task 032 corruption არ გაიმეოროს)

## Out of scope (future tasks)

- **AI invoice generation** — separate task, awaiting invoice template example
- **Public client approval page** (`/offer/[token]`) — separate task
- **Email sending** to client — separate task (SMTP integration)
- **Bulk photo upload** (drag-drop multi-file desktop) — Phase B is mobile-first
- **Real-time AI progress** (websocket) — current design polls
- **Reservation/lock SKU** when added to offer — out of scope
- **Multi-currency conversion** — fixed at GEL default
- **Offer versioning** (track changes between revisions) — soft only via audit log

## Notes

- **Anthropic API:** `lib/anthropic.ts` `resolveAnthropicKey()` returns key from settings or env. Don't modify. Just call.
- **Model selection:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — fast + cheap, good for batch photo analysis. Use Sonnet only on retry for high-confidence cases.
- **Photo storage:** mirror `dmt-inventory` bucket pattern in upload route. Public URLs OK (lead photos aren't PII-grade sensitive).
- **Mobile shell:** `/dmt/m/*` routes get standalone layout (no sidebar). Use existing DMT auth check (cookie session same as `/dmt/*`).
- **QR code:** use installed package `qrcode.react` (`package.json:40`).
- **`bigserial` PK trap:** `dmt_offers_audit.id` is bigserial. Never pass `id` in INSERT.
- **AI analysis async:** background queue not implemented. For now, fire-and-forget on upload — set `ai_analyzed=false`, trigger via separate endpoint OR same request awaited (slower upload). Recommend: same request awaited initially; if too slow → polling pattern.

## Test plan

1. `supabase migration up` (apply 0067 + 0068)
2. Verify Storage bucket `dmt-lead-photos` exists in Supabase Studio
3. `npm run dev` → http://localhost:3000/dmt/leads/manual
4. Login admin
5. Click row → detail drawer opens with 3 tabs
6. **Tab "ოფერები"** → click "ახალი ოფერი" → editor opens
7. Add inventory item (Gree კონდიციონერი) → row added with price
8. Add custom item (free text) → row added
9. Toggle VAT → subtotal/total updates
10. "Save draft" → success
11. "Send to client" → toast "გაგზავნილი" + copy URL button
12. Verify `dmt_offers` row in DB with `status='sent'`, `share_token` populated
13. **Tab "ინვენტარი"** → QR code visible
14. Mobile test: open `/dmt/m/leads/M-1234/photos` directly
15. Click camera → take photo → upload progress → photo appears with ⏳
16. AI analysis completes → ⏳ → ✓ → click photo → AI items visible
17. Match to inventory SKU → save → return to grid
18. Multi-shot: take 2 more photos quickly → all uploaded
19. Multi-user: User B refresh → sees same offers + photos
20. Browser cache clear → data persists in DB
