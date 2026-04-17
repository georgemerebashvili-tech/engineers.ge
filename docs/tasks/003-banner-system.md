# 003 · მთავარი გვერდის 9 Tile-ის ბანერ-სისტემა

**Status:** in-progress
**Owner:** Claude (lead)
**Dependencies:** 001 (design), 002 (style)

## მიზანი

მთავარი გვერდის `hero-treemap` (9 ცალი tile) გადავაქციოთ **მართვად ბანერ-სისტემად**:
- Admin-ს შეუძლია თითო tile-ის სურათი + metadata-ს გაცვლა
- ნაწილი tile-ები არის **ფასიანი სარეკლამო ადგილები** (deadline, client email, invoicing)
- Deadline ამოწურვისას სურათი ავტომატურად იცვლება alt-image-ით
- Click top-left-ზე ⬈ icon-ს ხსნის **lightbox modal**-ს (გარდა tile 1-ისა)

## Tile-ის რუკა (9 ცალი)

| № | Position | Kind | აღწერა |
|---|----------|------|--------|
| 1 | top-left, headline | `personal` | პირადი სურათი (არა click-to-zoom) |
| 2 | bottom-left-small | `own-banner` | მფლობელის ბანერი |
| 3 | middle-column | `ad-slot` | სარეკლამო, ფასიანი, deadline-ით |
| 4 | middle-top | `ad-slot` | სარეკლამო, ფასიანი |
| 5 | middle-large | `ad-slot` | სარეკლამო, ფასიანი |
| 6 | middle-bottom | `ad-slot` | სარეკლამო, ფასიანი |
| 7 | right-HVAC | `own-banner` | მფლობელის ბანერი |
| 8 | right-upper | `own-banner` | მფლობელის ბანერი |
| 9 | right-bottom | `own-banner` | მფლობელის ბანერი |

## მონაცემთა მოდელი

### Supabase table `tiles`

```sql
create type tile_kind as enum ('personal', 'own-banner', 'ad-slot');

create table tiles (
  id smallint primary key check (id between 1 and 9),
  kind tile_kind not null,
  label text,              -- ყველა tile-ზე editable admin-ში
  sublabel text,           -- ყველა tile-ზე editable admin-ში
  href text,
  image_url text,
  alt_image_url text,      -- fallback ვადაგასული deadline-ისას
  size smallint not null default 300,

  -- personal (kind='personal', tile 1)
  personal_name text,      -- "გიორგი მერებაშვილი"
  personal_title text,     -- "HVAC ინჟინერი · ენტერპრენერი"
  bio text,                -- long biography (modal)

  -- ad-slot ველები (kind='ad-slot')
  client_email text,
  client_name text,
  whatsapp text,           -- სპონსორის ტელეფონი
  promo text,              -- მცირე badge: '−20%', 'TOP'
  price_gel numeric(10,2),
  deadline timestamptz,
  invoice_sent_at timestamptz,
  reminder_days_before smallint default 7,
  last_reminder_at timestamptz,

  -- audit
  updated_at timestamptz default now(),
  updated_by text
);

-- helper view: active image for a tile
create view tiles_active as
select
  id, kind, label, sublabel, href, size,
  case
    when kind = 'ad-slot' and deadline < now() and alt_image_url is not null
    then alt_image_url
    else image_url
  end as image_url,
  deadline,
  (kind = 'ad-slot' and deadline < now()) as expired
from tiles;
```

### Storage bucket `tiles/`
- Public read (homepage-ს უნდა წაიკითხოს)
- Write: service_role მხოლოდ admin upload-ისას
- File pattern: `tile-{id}.{ext}`, `tile-{id}-alt.{ext}`

## Email / Invoicing

**Provider:** Resend (Vercel-native, მარტივი setup)
- Env: `RESEND_API_KEY`
- From: `noreply@engineers.ge`

### ტრიგერები
1. **Invoice on ad-slot update** — როცა admin აფიქსირებს client_email + deadline + price:
   - გაიგზავნება HTML invoice შემდეგ მისამართებზე:
     - `ADMIN_EMAIL` (მფლობელი)
     - `client_email`
   - invoice_sent_at ტაიმსტემპი ნიშნავს გაგზავნას
2. **Deadline reminder** — Vercel Cron (daily):
   - ითვლის: `deadline - reminder_days_before` დღეში გამოვა
   - თუ `last_reminder_at` არ არის ამ ციკლში, აგზავნის reminder email-ს
3. **Deadline expired** — Vercel Cron (daily):
   - თუ `deadline < now()` → homepage view ავტომატურად აბრუნებს alt_image-ს
   - მფლობელს ეგზავნება notification ("slot {id} ვადაგასული, ჩანაცვლდა alt-ით")

### Cron (Vercel)
```ts
// vercel.ts
crons: [
  { path: '/api/cron/tiles', schedule: '0 9 * * *' }  // daily at 09:00
]
```

## Admin UI (`/admin/tiles`)

- Grid 3×3 (იგივე layout რაც homepage-ზე)
- თითო card-ი:
  - Image preview (click → re-upload)
  - Alt image upload (ad-slot-ებისთვის)
  - **Label, sublabel, href** inputs — ყველა tile-ს ექნება (მათ შორის tile 5 „ბავშვობა/საწყისი")
  - **personal** tile-ზე (#1) დამატებით: `personal_name`, `personal_title`, `bio` (multi-line textarea)
  - **ad-slot**-ებისთვის დამატებითი ბლოკი:
    - Client email, client name
    - **WhatsApp ტელეფონი** (format: `995XXXXXXXXX` — ქვეყნის კოდით)
    - **Promo badge text** (max 10 chars, მცირე მოკლე ტექსტი, მაგ: `−20%`, `TOP`, `NEW`)
    - Price (GEL)
    - Deadline (datepicker)
    - Reminder days before (default 7)
    - „Invoice გადაგზავნა" button (manual trigger)
    - Status badge: Active / Expiring soon (≤ 7 days) / Expired

## Frontend ცვლილებები

### `components/hero-treemap.tsx`
- სტატიკური `DATA` array → ჩანაცვლდეს server fetch-ით `tiles_active` view-დან
- თითო tile-ს დაემატოს `data-tile-id` + overlay:
  - top-left: ⬈ icon (click → lightbox), გარდა id=1
  - hover: label + sublabel overlay (უკვე არის)
- lightbox: MUI `Dialog` / shadcn — full-size image

### `components/hero-lightbox.tsx` (ახალი)
- Controlled by URL hash `#tile-{id}` ან state
- Close on Esc / backdrop
- Zoom/pan (optional, v2)

## Acceptance criteria

### Phase 1 (no backend)
- [x] tile 2-9-ზე ⬈ icon top-left-ში
- [x] click ხსნის lightbox-ს სურათის full-size
- [x] tile 1-ზე ⬈ icon არ არის
- [x] Esc / backdrop click ხურავს
- [x] ad-slot (3-6)-ზე „სპონსორი" tag top-right-ში
- [x] ad-slot-ზე WhatsApp icon (18×18, green) — click ხსნის `wa.me/{phone}`
- [x] ad-slot-ზე promo badge (მცირე წითელი pill, max 10 chars)
- [x] tile 1 — personal card (photo + name + title + ბიო button modal)
- [x] responsive hiding — WA/promo/სპონსორი იმალება ვიწრო tile-ებზე

### Phase 2 (Supabase)
- [ ] `tiles` table + `tiles_active` view migration
- [ ] Storage bucket `tiles/` public read
- [ ] Admin `/admin/tiles` UI — 9 ცალი card, upload + metadata
- [ ] Homepage hero-treemap წაიკითხავს `tiles_active`-დან
- [ ] Dark mode / image optimization

### Phase 3 (Resend + Cron)
- [ ] Invoice HTML template (ქართული + EN)
- [ ] `/api/cron/tiles` endpoint (protected by CRON_SECRET)
- [ ] Deadline reminder logic (days_before)
- [ ] Deadline expiry → auto alt-image swap (via view, no code change needed)
- [ ] Expired notification email to admin

## Env vars

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=
ADMIN_EMAIL=georgemerebashvili@gmail.com

# Cron
CRON_SECRET=                    # Vercel Cron Authorization header
```

## Open questions

1. **Price currency** — GEL მხოლოდ თუ USD/EUR support-იც საჭიროა?
2. **Invoice PDF** — HTML email საკმარისია თუ PDF attachment გვინდა?
3. **Payment integration** — invoice მხოლოდ notification-ია, თუ Stripe/BOG link-ი უნდა ჩაერთოს?
4. **Tile 2** — `own-banner` დავადასტურე, ან რამე სხვა?
