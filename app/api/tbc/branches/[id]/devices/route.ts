import {NextResponse} from 'next/server';
import {z} from 'zod';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

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

const DeviceSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  category: z.string().max(128).nullable().optional(),
  subtype: z.string().max(128).nullable().optional(),
  brand: z.string().max(128).nullable().optional(),
  model: z.string().max(128).nullable().optional(),
  serial: z.string().max(128).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  install_date: z.string().max(64).nullable().optional(),
  specs: z.string().max(2000).nullable().optional(),
  unplanned: z.boolean().default(false),
  photos: z
    .array(z.string().nullable())
    .max(5)
    .default([null, null, null, null, null]),
  photo_meta: z
    .array(
      z
        .object({
          by: z.string().max(128).optional(),
          at: z.string().max(64).optional()
        })
        .nullable()
    )
    .max(5)
    .optional(),
  situational_photos: z.array(SituationalPhoto).max(50).default([]),
  needs: z.array(TodoItem).max(100).default([]),
  prohibitions: z.array(TodoItem).max(100).default([]),
  comments: z.array(CommentItem).max(200).default([]),
  ai_missing: z.array(z.string().max(64)).max(16).optional(),
  added_at: z.string().optional()
});

export async function POST(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = DeviceSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const branch = await db
    .from('tbc_branches')
    .select('id, devices')
    .eq('id', branchId)
    .maybeSingle<{id: number; devices: unknown[]}>();
  if (!branch.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const devices = Array.isArray(branch.data.devices) ? branch.data.devices : [];
  const newDevice = {
    name: parsed.data.name || '',
    category: parsed.data.category || '',
    subtype: parsed.data.subtype || '',
    brand: parsed.data.brand || '',
    model: parsed.data.model || '',
    serial: parsed.data.serial || '',
    location: parsed.data.location || '',
    install_date:
      parsed.data.install_date || new Date().toISOString().slice(0, 10),
    specs: parsed.data.specs || '',
    unplanned: !!parsed.data.unplanned,
    photos:
      parsed.data.photos && parsed.data.photos.length === 5
        ? parsed.data.photos
        : [null, null, null, null, null],
    photo_meta:
      parsed.data.photo_meta && parsed.data.photo_meta.length === 5
        ? parsed.data.photo_meta
        : [null, null, null, null, null],
    situational_photos: parsed.data.situational_photos || [],
    needs: parsed.data.needs || [],
    prohibitions: parsed.data.prohibitions || [],
    comments: (parsed.data.comments || []).map((c) => ({
      text: c.text,
      at: c.at || new Date().toISOString(),
      by: c.by || session.username
    })),
    ai_missing: parsed.data.ai_missing || [],
    added_at: parsed.data.added_at || new Date().toISOString(),
    added_by: session.username
  };

  const upd = await db
    .from('tbc_branches')
    .update({
      devices: [...devices, newDevice],
      updated_at: new Date().toISOString(),
      updated_by: session.username
    })
    .eq('id', branchId)
    .select('id')
    .single();

  if (upd.error) {
    console.error('[tbc] device append', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const photoCount = newDevice.photos.filter(Boolean).length;
  const labelParts = [
    newDevice.category,
    newDevice.subtype,
    newDevice.brand,
    newDevice.model,
    newDevice.serial ? `S/N ${newDevice.serial}` : ''
  ].filter(Boolean);
  await writeAudit({
    actor: session.username,
    action: 'device.add',
    targetType: 'branch',
    targetId: branchId,
    summary: `დაამატა მოწყობილობა: ${
      newDevice.name || labelParts.join(' · ') || '(empty)'
    }${photoCount ? ` · ${photoCount} ფოტო` : ''}${
      newDevice.situational_photos.length
        ? ` · ${newDevice.situational_photos.length} სიტ.`
        : ''
    }${newDevice.unplanned ? ' · დაუგეგმავი' : ''}`,
    metadata: {
      branch_id: branchId,
      name: newDevice.name,
      category: newDevice.category,
      subtype: newDevice.subtype,
      brand: newDevice.brand,
      model: newDevice.model,
      serial: newDevice.serial,
      location: newDevice.location,
      unplanned: newDevice.unplanned,
      photo_count: photoCount,
      situational_count: newDevice.situational_photos.length,
      needs_count: newDevice.needs.length,
      prohibitions_count: newDevice.prohibitions.length,
      comments_count: newDevice.comments.length,
      total_devices_now: devices.length + 1
    }
  });

  return NextResponse.json({ok: true, count: devices.length + 1});
}
