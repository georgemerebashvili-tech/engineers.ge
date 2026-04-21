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

const SituationalPhoto = z.object({
  src: z.string().min(1),
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
  photos: z.array(z.string().nullable()).length(5).optional(),
  situational_photos: z.array(SituationalPhoto).max(50).optional(),
  needs: z.array(TodoItem).max(100).optional(),
  prohibitions: z.array(TodoItem).max(100).optional(),
  comments: z.array(CommentItem).max(200).optional(),
  ai_missing: z.array(z.string().max(64)).max(16).optional()
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

  const prev = {...devices[deviceIdx]} as DeviceRow;
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
    const nextPhotos = parsed.data.photos;
    const nextMeta = nextPhotos.map((p, i) => {
      if (!p) return null;
      if (p === prevPhotos[i]) return prevMeta[i] ?? null;
      return {by: session.username, at: now};
    });
    next.photos = nextPhotos;
    next.photo_meta = nextMeta;
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

  devices[deviceIdx] = next;

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
        ? (next.photos as (string | null)[]).filter(Boolean).length
        : 0
    }
  });

  return NextResponse.json({ok: true});
}
