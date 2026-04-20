import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

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

const DeviceSchema = z.object({
  category: z.string().max(128).nullable().optional(),
  subtype: z.string().max(128).nullable().optional(),
  brand: z.string().max(128).nullable().optional(),
  model: z.string().max(128).nullable().optional(),
  serial: z.string().max(128).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  install_date: z.string().max(64).nullable().optional(),
  specs: z.string().max(2000).nullable().optional(),
  unplanned: z.boolean().default(false),
  photos: z.array(z.string().nullable()).max(5).default([null, null, null, null, null]),
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
  if (!(await ensureVisible(db, session, branchId)))
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

  return NextResponse.json({ok: true, count: devices.length + 1});
}
