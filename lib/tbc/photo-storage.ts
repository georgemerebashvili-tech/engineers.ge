import 'server-only';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const TBC_PHOTO_BUCKET = 'tbc-photos';

export type PhotoRef = {url: string; thumb_url: string};

export function isPhotoRef(v: unknown): v is PhotoRef {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as {url?: unknown}).url === 'string' &&
    typeof (v as {thumb_url?: unknown}).thumb_url === 'string'
  );
}

export function photoFullSrc(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (isPhotoRef(v)) return v.url;
  return null;
}

export function photoThumbSrc(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (isPhotoRef(v)) return v.thumb_url || v.url;
  return null;
}

const DATA_URL_RE = /^data:(image\/[a-z+]+);base64,(.+)$/i;

export function parseDataUrl(s: string): {mime: string; buffer: Buffer} | null {
  const m = s.match(DATA_URL_RE);
  if (!m) return null;
  try {
    return {mime: m[1], buffer: Buffer.from(m[2], 'base64')};
  } catch {
    return null;
  }
}

function extForMime(mime: string): string {
  const mapped = mime.split('/')[1] || 'jpg';
  return mapped.replace('jpeg', 'jpg');
}

/**
 * Upload a pair (full + thumbnail) already base64-encoded (as data URLs).
 * Returns {url, thumb_url} with public URLs, or null on any failure.
 *
 * `folder` segregates objects (e.g. branch id or 'situational/branch-<id>').
 * UUIDs prevent collisions, so folder is just for housekeeping / debugging.
 */
export async function uploadPhotoPair(
  fullDataUrl: string,
  thumbDataUrl: string,
  folder: string
): Promise<PhotoRef | null> {
  const full = parseDataUrl(fullDataUrl);
  const thumb = parseDataUrl(thumbDataUrl);
  if (!full || !thumb) return null;

  const id = crypto.randomUUID();
  const fullExt = extForMime(full.mime);
  const thumbExt = extForMime(thumb.mime);
  const safeFolder = folder.replace(/[^a-z0-9_\-/]/gi, '_').slice(0, 64);
  const fullPath = `${safeFolder}/${id}.${fullExt}`;
  const thumbPath = `${safeFolder}/${id}.thumb.${thumbExt}`;

  const storage = supabaseAdmin().storage.from(TBC_PHOTO_BUCKET);

  const [a, b] = await Promise.all([
    storage.upload(fullPath, full.buffer, {
      contentType: full.mime,
      upsert: false,
      cacheControl: '31536000'
    }),
    storage.upload(thumbPath, thumb.buffer, {
      contentType: thumb.mime,
      upsert: false,
      cacheControl: '31536000'
    })
  ]);

  if (a.error || b.error) {
    console.error('[tbc-photos] upload failed', a.error || b.error);
    // best-effort cleanup of whichever succeeded
    const paths = [a.error ? null : fullPath, b.error ? null : thumbPath].filter(
      Boolean
    ) as string[];
    if (paths.length > 0) await storage.remove(paths).catch(() => {});
    return null;
  }

  const fullUrl = storage.getPublicUrl(fullPath).data.publicUrl;
  const thumbUrl = storage.getPublicUrl(thumbPath).data.publicUrl;
  return {url: fullUrl, thumb_url: thumbUrl};
}

/**
 * Upload a single image (no thumb) — used e.g. for catalog items.
 */
export async function uploadSingle(
  dataUrl: string,
  folder: string
): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const id = crypto.randomUUID();
  const ext = extForMime(parsed.mime);
  const safeFolder = folder.replace(/[^a-z0-9_\-/]/gi, '_').slice(0, 64);
  const path = `${safeFolder}/${id}.${ext}`;
  const storage = supabaseAdmin().storage.from(TBC_PHOTO_BUCKET);
  const r = await storage.upload(path, parsed.buffer, {
    contentType: parsed.mime,
    upsert: false,
    cacheControl: '31536000'
  });
  if (r.error) {
    console.error('[tbc-photos] single upload failed', r.error);
    return null;
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort delete. Accepts full public URLs and tries to extract the path.
 */
export async function deleteByPublicUrls(urls: string[]): Promise<void> {
  const storage = supabaseAdmin().storage.from(TBC_PHOTO_BUCKET);
  const prefix = storage.getPublicUrl('').data.publicUrl.replace(/\/$/, '');
  const paths: string[] = [];
  for (const u of urls) {
    if (!u) continue;
    if (!u.startsWith(prefix)) continue;
    const p = u.slice(prefix.length).replace(/^\//, '');
    if (p) paths.push(p);
  }
  if (paths.length === 0) return;
  await storage.remove(paths).catch((e) => {
    console.warn('[tbc-photos] cleanup failed', e);
  });
}
