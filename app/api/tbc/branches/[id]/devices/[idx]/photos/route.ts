import {NextResponse} from 'next/server';
import {z} from 'zod';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {findActiveDeviceEntry, getTbcArchiveExpiry, writeAudit} from '@/lib/tbc/audit';
import {PhotoValueSchema} from '@/lib/tbc/photo-schema';
import {photoFullSrc} from '@/lib/tbc/photo-storage';

export const dynamic = 'force-dynamic';

const PhotoMetaItem = z
  .object({
    by: z.string().max(128).optional(),
    at: z.string().max(64).optional()
  })
  .nullable();

const PatchSchema = z.object({
  photos: z.array(PhotoValueSchema.nullable()).length(5),
  photo_meta: z.array(PhotoMetaItem).length(5).optional()
});

type PhotoSlot = string | {url: string; thumb_url: string} | null;

type DeviceRow = Record<string, unknown> & {
  photos?: PhotoSlot[];
  photo_meta?: (null | {by?: string; at?: string})[];
  archived_photos?: Array<Record<string, unknown>>;
};

export async function PATCH(
  req: Request,
  {params}: {params: Promise<{id: string; idx: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id, idx} = await params;
  const branchId = Number(id);
  const deviceIdx = Number(idx);
  if (!Number.isFinite(branchId) || !Number.isFinite(deviceIdx) || deviceIdx < 0)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const branch = await db
    .from('tbc_branches')
    .select('id, devices')
    .eq('id', branchId)
    .maybeSingle<{id: number; devices: DeviceRow[]}>();
  if (!branch.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const devices = Array.isArray(branch.data.devices)
    ? branch.data.devices.slice()
    : [];
  const target = findActiveDeviceEntry(devices, deviceIdx);
  if (!target)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const device = {...target.device} as DeviceRow;
  const prevPhotos =
    Array.isArray(device.photos) && device.photos.length === 5
      ? device.photos
      : [null, null, null, null, null];
  const prevMeta =
    Array.isArray(device.photo_meta) && device.photo_meta.length === 5
      ? device.photo_meta
      : [null, null, null, null, null];
  const archivedPhotos = Array.isArray(device.archived_photos)
    ? [...device.archived_photos]
    : [];

  const nextPhotos = parsed.data.photos;
  const now = new Date().toISOString();
  const nextMeta = nextPhotos.map((p, i) => {
    if (!p) return null;
    if (photoFullSrc(p) === photoFullSrc(prevPhotos[i] as unknown)) return prevMeta[i] ?? null;
    const incoming = parsed.data.photo_meta?.[i];
    return {
      by: incoming?.by || session.username,
      at: incoming?.at || now
    };
  });
  nextPhotos.forEach((photo, i) => {
    if (!photo && prevPhotos[i]) {
      archivedPhotos.push({
        slot: i,
        src: prevPhotos[i],
        meta: prevMeta[i] ?? null,
        archived_at: now,
        archived_by: session.username,
        archive_expires_at: getTbcArchiveExpiry(new Date(now)),
        archive_reason: 'manual_photo_remove'
      });
    }
  });

  device.photos = nextPhotos;
  device.photo_meta = nextMeta;
  if (archivedPhotos.length > 0) device.archived_photos = archivedPhotos;
  devices[target.rawIndex] = device;

  const upd = await db
    .from('tbc_branches')
    .update({
      devices,
      updated_at: now,
      updated_by: session.username
    })
    .eq('id', branchId)
    .select('id')
    .single();

  if (upd.error) {
    console.error('[tbc] device photos patch', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const prevCount = prevPhotos.filter(Boolean).length;
  const nextCount = nextPhotos.filter(Boolean).length;
  await writeAudit({
    actor: session.username,
    action: 'device.photos_update',
    targetType: 'branch',
    targetId: branchId,
    summary: `განაახლა ფოტოები (ფილიალი #${branchId} · #${
      deviceIdx + 1
    }): ${prevCount} → ${nextCount}`,
    metadata: {
      branch_id: branchId,
      device_idx: deviceIdx,
      prev_count: prevCount,
      next_count: nextCount
    }
  });

  return NextResponse.json({ok: true, photos: nextPhotos, photo_meta: nextMeta});
}
