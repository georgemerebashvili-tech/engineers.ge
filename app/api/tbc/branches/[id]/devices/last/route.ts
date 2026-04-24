import {NextResponse} from 'next/server';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  archiveDevice,
  findActiveDeviceEntry,
  getTbcArchiveExpiry,
  listActiveDevices,
  writeAudit
} from '@/lib/tbc/audit';

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
  const activeDevices = listActiveDevices(devices);
  if (activeDevices.length === 0)
    return NextResponse.json({error: 'empty'}, {status: 400});

  const target = findActiveDeviceEntry(devices, activeDevices.length - 1);
  if (!target)
    return NextResponse.json({error: 'not_found'}, {status: 404});
  const archivedAt = new Date().toISOString();
  const removed = target.device;
  const next = devices.slice();
  next[target.rawIndex] = archiveDevice(
    target.device,
    session.username,
    'manual_archive',
    archivedAt
  );

  const upd = await db
    .from('tbc_branches')
    .update({
      devices: next,
      updated_at: archivedAt,
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
    action: 'device.archive_last',
    targetType: 'branch',
    targetId: branchId,
    summary: `არქივში გადაიტანა ბოლო მოწყობილობა (ფილიალი #${branchId}): ${[removed.category, removed.subtype, removed.brand, removed.model, removed.serial].filter(Boolean).join(' · ') || '(empty)'}`,
    metadata: {
      branch_id: branchId,
      removed,
      archive_expires_at: getTbcArchiveExpiry(new Date(archivedAt))
    }
  });

  return NextResponse.json({ok: true, count: activeDevices.length - 1, removed, archived: true});
}
