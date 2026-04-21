import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

async function ensureVisible(
  db: ReturnType<typeof supabaseAdmin>,
  session: {uid: string; role: 'admin' | 'user'},
  branchId: number
) {
  if (session.role === 'admin') return true;
  const perms = await db
    .from('tbc_branch_permissions')
    .select('branch_id')
    .eq('user_id', session.uid);
  const rows = perms.data || [];
  if (rows.some((r) => r.branch_id == null)) return true;
  return rows.some((r) => r.branch_id === branchId);
}

const PhotoMetaItem = z
  .object({
    by: z.string().max(128).optional(),
    at: z.string().max(64).optional()
  })
  .nullable();

const PatchSchema = z.object({
  photos: z.array(z.string().nullable()).length(5),
  photo_meta: z.array(PhotoMetaItem).length(5).optional()
});

type DeviceRow = Record<string, unknown> & {
  photos?: (string | null)[];
  photo_meta?: (null | {by?: string; at?: string})[];
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
  if (!(await ensureVisible(db, session, branchId)))
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
  if (deviceIdx >= devices.length)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const device = {...devices[deviceIdx]} as DeviceRow;
  const prevPhotos =
    Array.isArray(device.photos) && device.photos.length === 5
      ? device.photos
      : [null, null, null, null, null];
  const prevMeta =
    Array.isArray(device.photo_meta) && device.photo_meta.length === 5
      ? device.photo_meta
      : [null, null, null, null, null];

  const nextPhotos = parsed.data.photos;
  const now = new Date().toISOString();
  const nextMeta = nextPhotos.map((p, i) => {
    if (!p) return null;
    if (p === prevPhotos[i]) return prevMeta[i] ?? null;
    const incoming = parsed.data.photo_meta?.[i];
    return {
      by: incoming?.by || session.username,
      at: incoming?.at || now
    };
  });

  device.photos = nextPhotos;
  device.photo_meta = nextMeta;
  devices[deviceIdx] = device;

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
