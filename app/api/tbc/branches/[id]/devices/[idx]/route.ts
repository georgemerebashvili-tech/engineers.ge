import {NextResponse} from 'next/server';
import {z} from 'zod';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  archiveDevice,
  findActiveDeviceEntry,
  getTbcArchiveExpiry,
  writeAudit
} from '@/lib/tbc/audit';
import {PhotoValueSchema} from '@/lib/tbc/photo-schema';
import {photoFullSrc} from '@/lib/tbc/photo-storage';

export const dynamic = 'force-dynamic';

const SituationalPhoto = z.object({
  src: PhotoValueSchema,
  caption: z.string().max(500).optional().default('')
});

const TodoItem = z.object({
  text: z.string().max(500),
  done: z.boolean().default(false)
});

const CommentItem = z.object({
  text: z.string().max(2000),
  at: z.string().optional(),
  by: z.string().max(128).optional()
});

const PatchSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  category: z.string().max(128).nullable().optional(),
  subtype: z.string().max(128).nullable().optional(),
  brand: z.string().max(128).nullable().optional(),
  model: z.string().max(128).nullable().optional(),
  serial: z.string().max(128).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  install_date: z.string().max(64).nullable().optional(),
  specs: z.string().max(2000).nullable().optional(),
  unplanned: z.boolean().optional(),
  photos: z.array(PhotoValueSchema.nullable()).length(5).optional(),
  situational_photos: z.array(SituationalPhoto).max(50).optional(),
  needs: z.array(TodoItem).max(100).optional(),
  prohibitions: z.array(TodoItem).max(100).optional(),
  comments: z.array(CommentItem).max(200).optional(),
  ai_missing: z.array(z.string().max(64)).max(16).optional()
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

  const prev = {...target.device} as DeviceRow;
  const now = new Date().toISOString();
  const next: DeviceRow = {...prev};

  const scalarKeys = [
    'name',
    'category',
    'subtype',
    'brand',
    'model',
    'serial',
    'location',
    'install_date',
    'specs'
  ] as const;
  for (const k of scalarKeys) {
    const v = parsed.data[k];
    if (v !== undefined) next[k] = v ?? '';
  }
  if (parsed.data.unplanned !== undefined) next.unplanned = parsed.data.unplanned;

  if (parsed.data.photos) {
    const prevPhotos =
      Array.isArray(prev.photos) && prev.photos.length === 5
        ? prev.photos
        : [null, null, null, null, null];
    const prevMeta =
      Array.isArray(prev.photo_meta) && prev.photo_meta.length === 5
        ? prev.photo_meta
        : [null, null, null, null, null];
    const archivedPhotos = Array.isArray(prev.archived_photos)
      ? [...prev.archived_photos]
      : [];
    const nextPhotos = parsed.data.photos;
    const nextMeta = nextPhotos.map((p, i) => {
      if (!p) return null;
      // Compare by resolved full src so string↔object round-trip still reads as "unchanged"
      if (photoFullSrc(p) === photoFullSrc(prevPhotos[i] as unknown)) return prevMeta[i] ?? null;
      return {by: session.username, at: now};
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
    next.photos = nextPhotos;
    next.photo_meta = nextMeta;
    if (archivedPhotos.length > 0) next.archived_photos = archivedPhotos;
  }

  if (parsed.data.situational_photos)
    next.situational_photos = parsed.data.situational_photos;
  if (parsed.data.needs) next.needs = parsed.data.needs;
  if (parsed.data.prohibitions) next.prohibitions = parsed.data.prohibitions;
  if (parsed.data.comments) {
    next.comments = parsed.data.comments.map((c) => ({
      text: c.text,
      at: c.at || now,
      by: c.by || session.username
    }));
  }
  if (parsed.data.ai_missing !== undefined)
    next.ai_missing = parsed.data.ai_missing;

  devices[target.rawIndex] = next;

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
    console.error('[tbc] device patch', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'device.update',
    targetType: 'branch',
    targetId: branchId,
    summary: `განაახლა დანადგარი (ფილიალი #${branchId} · #${
      deviceIdx + 1
    }): ${[next.category, next.subtype, next.brand, next.model, next.serial]
      .filter(Boolean)
      .join(' · ') || '(empty)'}`,
    metadata: {
      branch_id: branchId,
      device_idx: deviceIdx,
      photo_count: Array.isArray(next.photos)
        ? (next.photos as PhotoSlot[]).filter(Boolean).length
        : 0
    }
  });

  return NextResponse.json({ok: true});
}

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string; idx: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id, idx} = await params;
  const branchId = Number(id);
  const deviceIdx = Number(idx);
  if (!Number.isFinite(branchId) || !Number.isFinite(deviceIdx) || deviceIdx < 0)
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

  const archivedAt = new Date().toISOString();
  const archived = archiveDevice(
    target.device,
    session.username,
    'manual_archive',
    archivedAt
  );
  devices[target.rawIndex] = archived;

  const upd = await db
    .from('tbc_branches')
    .update({
      devices,
      updated_at: archivedAt,
      updated_by: session.username
    })
    .eq('id', branchId)
    .select('id')
    .single();

  if (upd.error) {
    console.error('[tbc] device archive', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'device.archive',
    targetType: 'branch',
    targetId: branchId,
    summary: `არქივში გადაიტანა დანადგარი (ფილიალი #${branchId} · #${
      deviceIdx + 1
    }): ${[
      target.device.category,
      target.device.subtype,
      target.device.brand,
      target.device.model,
      target.device.serial
    ]
      .filter(Boolean)
      .join(' · ') || '(empty)'}`,
    metadata: {
      branch_id: branchId,
      device_idx: deviceIdx,
      archive_expires_at: getTbcArchiveExpiry(new Date(archivedAt))
    }
  });

  return NextResponse.json({ok: true, archived: true});
}
