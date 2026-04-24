# Task 030 — TBC Photos: migrate base64 → Supabase Storage (zero data loss)

**Delegated to:** Codex
**Created:** 2026-04-24
**Parent:** TBC module rewrite
**Scope:** Backend + frontend, one feature end-to-end

## მიზანი

TBC device-ების ფოტოები ახლა base64 data URL-ებად ზის `tbc_branches.devices` JSONB-ში. ეს არის root cause:
- `/api/tbc/branches` payload = მეგაბაიტები (ყოველ page load-ზე ყველა device-ის ყველა ფოტო data URL-ად)
- Browser-ი ვერ cache-ავს, CDN-ი გვერდს ასცდება
- Vision AI ცხელდება რადგან ფოტო JSON-ში ზის
- XLSX/ZIP export უვალიდოა (fetch-ი data URL-ს ვერ მოიტანს)

გადავდიოთ Supabase Storage-ში (public bucket, UUID paths). ყოველ photo slot-ს ექნება `{url, thumb_url}` ref. Grid/list-ში — `thumb_url` (128 px). Lightbox-ში — `url` (1024 px).

**ULTRA-CRITICAL:** მონაცემი არ უნდა დაიკარგოს. ყველა backfill წინ უნდა იწეროს `tbc_branches_photos_backup` ცხრილში (migration 0055 უკვე ქმნის).

## უკვე გაკეთებულია (foundation)

ქლოდმა ქვემოთ ჩამოთვლილი scaffolding უკვე დაწერა — არ გადააკეთო, ააგე ზედ:

1. [supabase/migrations/0055_tbc_photos_storage.sql](../../supabase/migrations/0055_tbc_photos_storage.sql)
   - Provisions `storage.buckets` row: `tbc-photos` (public, 8 MB max, image MIME types)
   - Creates `tbc_branches_photos_backup(id, branch_id, devices_pre, migrated_at, migrated_by, notes)` table for pre-backfill snapshots
2. [lib/tbc/photo-storage.ts](../../lib/tbc/photo-storage.ts)
   - Exports `PhotoRef`, `isPhotoRef`, `photoFullSrc`, `photoThumbSrc`, `parseDataUrl`, `uploadPhotoPair`, `uploadSingle`, `deleteByPublicUrls`
   - Bucket const: `TBC_PHOTO_BUCKET = 'tbc-photos'`
3. [lib/tbc/photo-schema.ts](../../lib/tbc/photo-schema.ts)
   - `PhotoRefSchema` (zod object for `{url, thumb_url}`)
   - `PhotoValueSchema` = union of legacy string OR `PhotoRefSchema`
4. [app/api/tbc/photos/upload/route.ts](../../app/api/tbc/photos/upload/route.ts)
   - POST `{full_b64, thumb_b64?, kind, branch_id?}` → `{url, thumb_url}`
   - Auth: any logged-in TBC user
   - Validates data URL format, uploads via `uploadPhotoPair` (or `uploadSingle` if no thumb)

**Migration 0055 НЕ applied yet. აპლიკაცია შენი პასუხისმგებლობაა (viashvm → apply-dmt-migration.mjs).**

## What to build

### A. Server schema compatibility (accept legacy string OR new object)

Touch these three device routes and swap the photo-field schemas:

**A1.** [app/api/tbc/branches/[id]/devices/route.ts](../../app/api/tbc/branches/[id]/devices/route.ts) — POST (new device)

- Line 42–45: `SituationalPhoto` schema currently `src: z.string().min(1)`. Replace with `src: PhotoValueSchema` (import from `@/lib/tbc/photo-schema`).
- Line 69–72: `photos: z.array(z.string().nullable()).max(5)` → `z.array(PhotoValueSchema.nullable()).max(5)` (default unchanged).
- Keep all other logic (photo_meta, default values, audit) intact.

**A2.** [app/api/tbc/branches/[id]/devices/[idx]/route.ts](../../app/api/tbc/branches/[id]/devices/[idx]/route.ts) — PATCH full device

- Line 17–18 (SituationalPhoto.src), line 40 (photos array) — same swap as A1.
- **Archive trail (line 118–151):** when a photo slot gets cleared, `prev.photos[i]` becomes part of `archived_photos` with the original value. DO NOT change archival behavior — the old `src` field stores whatever was there (string or object). The comparison `p === prevPhotos[i]` still works for objects (reference equality is fine because Supabase doesn't re-serialize) — but change it to a deep equal (or compare `photoFullSrc()` values) to be safe across JSON round-trips.
- `photoFullSrc(prevPhotos[i])` gives the full URL/data URL you'd store in the archive snapshot.

**A3.** [app/api/tbc/branches/[id]/devices/[idx]/photos/route.ts](../../app/api/tbc/branches/[id]/devices/[idx]/photos/route.ts) — PATCH photos only

- Line 17–18: loosen photos + situational schemas the same way.
- Archive logic (around line 82–105): same treatment as A2. When storing in `archived_photos`, preserve the incoming value verbatim (whether string or `{url, thumb_url}`).

### B. Vision AI URL tolerance

**B1.** [app/api/tbc/vision/analyze-device/route.ts](../../app/api/tbc/vision/analyze-device/route.ts)
**B2.** [app/api/tbc/vision/research-device/route.ts](../../app/api/tbc/vision/research-device/route.ts)

Currently both expect `photos: z.array(z.string().min(32))` and parse as data URL via regex. Loosen to accept **either**:
- `string` = data URL (legacy path — check with existing regex), OR
- `string` = `https://…` (fetch server-side, convert to data URL before sending to Claude)

Add helper inline (or in `lib/tbc/photo-storage.ts`):

```ts
async function urlToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
}
```

Call it for every incoming photo before building the Claude message. Drop photos that convert to `null` (with a console.warn).

### C. Client upload flow (new uploads go to Storage)

**C1.** [components/tbc/device-editor-modal.tsx](../../components/tbc/device-editor-modal.tsx) — mobile + shared modal

Current `fileToDataUrl(file, 1024, 0.82)` produces the full. Add a twin helper `fileToResizedPair(file, {fullDim=1024, fullQ=0.82, thumbDim=256, thumbQ=0.7})` that returns `{full, thumb}` (two data URLs produced from the same source image in one read).

Then change:

- `onDeviceFile` (line 163 area): instead of `setPhotos((p) => {...photos[slot]=dataUrl})`, do:
  1. resize → pair
  2. POST to `/api/tbc/photos/upload` with `{full_b64: full, thumb_b64: thumb, kind:'device'}`
  3. on `ok`, set `photos[slot] = {url, thumb_url}`
  4. while uploading, set a loading flag `uploadingSlots: Set<number>` → show spinner overlay on the slot
  5. on error: toast "ვერ ატვირთა" and leave slot empty

- `onSituFiles` (line 206): similar, but per-file. Loop with `for` (not Promise.all to keep ordering). Use `kind:'situational'`. Store `{src: {url, thumb_url}, caption: ''}` in `situational`.

- Photo rendering (line 431, 582): read `typeof photo === 'string' ? photo : photo.thumb_url` for slot grid; `photo.url` (or the string itself) for full view.

**C2.** [public/tbc/inventory.html](../../public/tbc/inventory.html) — desktop sheet

Find `handlePhotoFile` (around line 5416) and the situational handlers. Swap the same way:

1. Client-side resize (existing canvas logic) → produce full (1024, 0.82) + thumb (256, 0.7)
2. POST to `/api/tbc/photos/upload`
3. Store `{url, thumb_url}` instead of raw data URL
4. Progress UI: `<div class="photo-slot-uploading">` overlay with a `<progress>` or custom bar (see section E)

Catalog `photo_b64` (line 4227 area) — this is purely local state / persisted via saveState. Swap to store a URL via `kind:'catalog'` upload. `photo_b64` field should continue to serialize as-is (client-only), but rendering must also accept URL.

### D. Rendering compat (handles both legacy string and new object)

Add these helpers at the top of the `<script>` block in inventory.html (e.g. near `_uploaderName`):

```js
function _photoFull(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  return p.url || p.thumb_url || null;
}
function _photoThumb(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  return p.thumb_url || p.url || null;
}
```

Replace every `<img src="${photo}">` in render functions with `_photoThumb(photo)` or `_photoFull(photo)` depending on context:

- `renderDevicesList` grid slots → `_photoThumb`
- `_viewerPhotos` (lightbox, line 5470) → `_photoFull`
- Mobile `mobile-app.tsx` thumbnail in list (line 315–318) → `_photoThumb` (define a local helper in the TSX)
- Modal photo grid slots → `_photoThumb` (import from photo-storage or inline)

### E. Upload progress bar + loaders

Reuse pattern: a small bar loader with percentage.

Spec:
- During upload, slot shows: base image background (if already set) or skeleton, with a top 3-px progress bar and a `XX%` label bottom-right.
- Use `XMLHttpRequest` in the client upload call so `upload.onprogress` fires. Fetch API doesn't expose upload progress.
- Batch situational uploads serially; show one global top-banner bar "ატვირთვა 3/10…"

Global page-level loader — add a thin 2-px bar at the top of `/tbc/app` that activates on any `/api/tbc/*` in-flight request. Add it via a fetch interceptor in inventory.html (monkey-patch `window.fetch` once at init; increment/decrement a counter; bar visible when counter > 0). Transition CSS 150 ms.

For mobile modal: similar bar at top of the modal.

### F. Backfill script (ultra-critical, data-preserving)

Create [scripts/migrate-tbc-photos-to-storage.mjs](../../scripts/migrate-tbc-photos-to-storage.mjs):

1. Read `.env.local` the same way `apply-dmt-migration.mjs` does.
2. Connect via pg Client + Supabase JS client.
3. Fetch all `tbc_branches` rows (id, devices).
4. **BEFORE any rewrite**: insert `{branch_id, devices_pre: <whole devices array>, migrated_by: 'migrate-script'}` into `tbc_branches_photos_backup`. Skip a branch if a backup row already exists (idempotency).
5. For each branch → for each device (active AND archived) → for each photo field (main photos array + situational_photos + archived_photos):
   - If value is a string starting with `data:image/`:
     - Decode buffer
     - Generate thumb server-side: **pure-node pipeline using `sharp` if installed, else skip thumb and reuse full URL as thumb_url** (we don't want to hard-depend on sharp; document fallback)
     - Upload full → Storage (`folder: 'backfill/b<branchId>'`)
     - Upload thumb (or same as full) → Storage
     - Replace the string with `{url, thumb_url}` in the device JSON
   - If already `{url, thumb_url}` → skip
   - If any URL (http/s) but not our bucket → leave alone (flag in notes)
6. After all devices processed, `update tbc_branches set devices = $1 where id = $2`.
7. Log: `{branch_id, devices_count, photos_migrated, photos_skipped, photos_failed}` per branch; final summary.
8. `--dry-run` flag to preview without writing.

**Note on sharp:** if unavailable, the script must still work. Check `try { const sharp = require('sharp'); } catch { /* fallback: no thumb gen */ }`. Fallback = upload full twice (full + thumb_url = same URL). Client rendering handles that gracefully.

### G. Documentation updates

- [CLAUDE.md](../../CLAUDE.md) → no changes needed (persistent rules still apply)
- [docs/DECISIONS.md](../../docs/DECISIONS.md) → add an ADR entry: "TBC photos moved to Supabase Storage, 2026-04-24. Backfill script run once; backup table preserved for 90 days then dropped."
- [docs/TODO.md](../../docs/TODO.md) → add item to drop `tbc_branches_photos_backup` after 90 days.
- [components/tbc-help-modal.tsx](../../components/tbc-help-modal.tsx) → update the relevant sections: photos now ვინახება Storage-ში, 128 px thumbnails, click → full.

## Acceptance criteria

- [ ] Migration 0055 applied prod; bucket exists; backup table exists.
- [ ] Upload route returns `{url, thumb_url}`; both URLs 200.
- [ ] New photo in mobile modal → stored as `{url, thumb_url}`; `/api/tbc/branches` payload for that device contains object not data URL.
- [ ] Desktop sheet: same.
- [ ] Existing legacy devices still render (string data URLs accepted by rendering helpers).
- [ ] Vision AI (`analyze-device`, `research-device`) works on: (a) a legacy device with data URL, (b) a migrated device with Storage URL.
- [ ] Archival: archiving a device preserves all photos; restore brings them back intact. Removing a single photo → it lands in `archived_photos` with the same shape (string or object) as it was active.
- [ ] XLSX/ZIP export: photos actually get into the ZIP (both legacy + new paths).
- [ ] Upload progress bar visible during slot fill (with %).
- [ ] Global fetch bar at top of `/tbc/app`.
- [ ] Backfill script runs on prod (after snapshot); `select count(*) from tbc_branches_photos_backup` > 0; spot-check 3 branches — `devices->0->photos->0` is now an object.
- [ ] `tsc --noEmit` clean.
- [ ] Deploy preview + smoke test + promote to prod.

## Non-goals

- Signed URLs. Public bucket is fine; URLs contain UUIDs.
- Sharp-based server-side resize. Client produces thumb; backfill uses `sharp` if available, else full=thumb.
- `catalog_items.photo_b64` backfill — catalog is local-only; skip.
- `storyabout.me` / other non-TBC photos — out of scope.

## Order of execution (required, to guarantee zero data loss)

1. Write code for A + B + C + D + E + F (do not run).
2. `tsc --noEmit` clean.
3. Apply migration 0055 (via `node scripts/apply-dmt-migration.mjs supabase/migrations/0055_tbc_photos_storage.sql`).
4. Deploy to Vercel preview. Spot-test new upload in preview.
5. Deploy to prod.
6. Run backfill script in **dry-run** mode first. Review log.
7. Run backfill for real.
8. Spot-check 3 random branches in prod UI — photos still visible, new uploads use Storage.

## Contact

If anything is ambiguous → stop, ask ქლოდს (lead). Do not guess on archival or backup semantics — user said explicitly: "no data loss."
