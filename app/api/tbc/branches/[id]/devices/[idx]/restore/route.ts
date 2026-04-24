import {NextResponse} from 'next/server';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

// idx = raw array index among all devices (including archived)
export async function POST(
  _req: Request,
  {params}: {params: Promise<{id: string; idx: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id, idx} = await params;
  const branchId = Number(id);
  const rawIdx = Number(idx);
  if (!Number.isFinite(branchId) || !Number.isFinite(rawIdx) || rawIdx < 0)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const branch = await db
    .from('tbc_branches')
    .select('id, devices')
    .eq('id', branchId)
    .maybeSingle<{id: number; devices: Record<string, unknown>[]}>();

  if (!branch.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const devices = Array.isArray(branch.data.devices)
    ? branch.data.devices.slice()
    : [];

  if (rawIdx >= devices.length)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const device = devices[rawIdx] as Record<string, unknown>;
  if (!device.archived_at)
    return NextResponse.json({error: 'not_archived'}, {status: 409});

  const restored = {...device};
  delete restored.archived_at;
  delete restored.archived_by;
  delete restored.archive_expires_at;
  delete restored.archive_reason;
  devices[rawIdx] = restored;

  const upd = await db
    .from('tbc_branches')
    .update({
      devices,
      updated_at: new Date().toISOString(),
      updated_by: session.username
    })
    .eq('id', branchId)
    .select('id')
    .single();

  if (upd.error) {
    console.error('[tbc] device restore', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'device.restore',
    targetType: 'branch',
    targetId: branchId,
    summary: `არქივიდან აღადგინა დანადგარი (ფილიალი #${branchId} · raw #${rawIdx}): ${
      [device.category, device.subtype, device.brand, device.model, device.serial]
        .filter(Boolean)
        .join(' · ') || '(empty)'
    }`,
    metadata: {branch_id: branchId, raw_idx: rawIdx}
  });

  return NextResponse.json({ok: true, restored: true});
}
