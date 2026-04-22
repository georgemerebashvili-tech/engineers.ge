import {NextResponse} from 'next/server';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const branch = await db
    .from('tbc_branches')
    .select('id, devices')
    .eq('id', branchId)
    .maybeSingle<{id: number; devices: Array<Record<string, unknown>>}>();
  if (!branch.data)
    return NextResponse.json({error: 'not_found'}, {status: 404});

  const devices = Array.isArray(branch.data.devices)
    ? branch.data.devices
    : [];
  if (devices.length === 0)
    return NextResponse.json({error: 'empty'}, {status: 400});

  const removed = devices[devices.length - 1];
  const next = devices.slice(0, -1);

  const upd = await db
    .from('tbc_branches')
    .update({
      devices: next,
      updated_at: new Date().toISOString(),
      updated_by: session.username
    })
    .eq('id', branchId)
    .select('id')
    .single();

  if (upd.error) {
    console.error('[tbc] device last-delete', upd.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeAudit({
    actor: session.username,
    action: 'device.delete_last',
    targetType: 'branch',
    targetId: branchId,
    summary: `წაშალა ბოლო მოწყობილობა (ფილიალი #${branchId}): ${[removed.category, removed.subtype, removed.brand, removed.model, removed.serial].filter(Boolean).join(' · ') || '(empty)'}`,
    metadata: {branch_id: branchId, removed}
  });

  return NextResponse.json({ok: true, count: next.length, removed});
}
