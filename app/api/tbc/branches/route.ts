import {NextResponse} from 'next/server';
import {
  branchMatchesTbcSession,
  getTbcBranchAccess,
  getTbcSession
} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {diffBranch, listActiveDevices, mergeBranchDevices, writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

// `?lite=1` returns branches without devices — mobile/admin pickers fetch
// devices separately per branch to avoid dragging megabytes of photo data.
export async function GET(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const url = new URL(req.url);
  const lite = url.searchParams.get('lite') === '1';

  const db = supabaseAdmin();
  const query = lite
    ? db
        .from('tbc_branches')
        .select(
          'id, alias, name, type, region, city, address, area_m2, monthly_fee, planned_count, status, dmt_manager, tbc_manager, planned_start, planned_end, updated_at, updated_by'
        )
    : db
        .from('tbc_branches')
        .select(
          'id, alias, name, type, region, city, address, area_m2, monthly_fee, comment, inventory_items, planned_count, status, director, director_phone, dmt_manager, dmt_manager_phone, tbc_manager, tbc_manager_phone, planned_start, planned_end, annotation, act, notes, devices, controllers, tracking_items, updated_at, updated_by'
        );
  const res = await query
    .is('archived_at', null)
    .order('id', {ascending: true});

  if (res.error) {
    console.error('[tbc] branches load', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  // Per-user visibility: admins see all; users see only assigned ones.
  let branches = (res.data || []).map((branch) => {
    if (lite) return branch as Record<string, unknown>;
    return {
      ...(branch as Record<string, unknown>),
      devices: listActiveDevices((branch as {devices?: unknown[]}).devices as unknown[])
    };
  });
  if (session.role !== 'admin') {
    const {seeAll, allowedIds} = await getTbcBranchAccess(db, session);
    if (!seeAll) {
      branches = branches.filter((b) => {
        const branchId = Number((b as {id: number}).id);
        return (
          allowedIds.has(branchId) ||
          branchMatchesTbcSession(
            {
              dmt_manager: ((b as {dmt_manager?: string | null}).dmt_manager) || null,
              tbc_manager: ((b as {tbc_manager?: string | null}).tbc_manager) || null
            },
            session
          )
        );
      });
    }
  }

  return NextResponse.json({branches});
}

export async function PUT(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const payload = body as {branch?: Record<string, unknown>};
  const b = payload?.branch;
  if (!b || typeof b !== 'object' || typeof b.id !== 'number') {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const db = supabaseAdmin();
  const row = {
    id: b.id as number,
    alias: (b.alias as string) || null,
    name: (b.name as string) || '',
    type: (b.type as string) || null,
    region: (b.region as string) || null,
    city: (b.city as string) || null,
    address: (b.address as string) || null,
    area_m2: (b.area_m2 as number) ?? null,
    monthly_fee: (b.monthly_fee as number) ?? null,
    comment: (b.comment as string) || null,
    inventory_items: b.inventory_items ?? [],
    planned_count: (b.planned_count as number) ?? 0,
    status: (b.status as string) || 'general',
    director: (b.director as string) || null,
    director_phone: (b.director_phone as string) || null,
    dmt_manager: (b.dmt_manager as string) || null,
    dmt_manager_phone: (b.dmt_manager_phone as string) || null,
    tbc_manager: (b.tbc_manager as string) || null,
    tbc_manager_phone: (b.tbc_manager_phone as string) || null,
    planned_start: (b.planned_start as string) || null,
    planned_end: (b.planned_end as string) || null,
    annotation: (b.annotation as string) || null,
    act: (b.act as string) || null,
    notes: (b.notes as string) || null,
    devices: b.devices ?? [],
    controllers: b.controllers ?? [],
    tracking_items: b.tracking_items ?? [],
    updated_at: new Date().toISOString(),
    updated_by: session.username
  };

  // Snapshot existing row for audit diff
  const prev = await db
    .from('tbc_branches')
    .select(
      'alias, name, type, region, city, address, status, director, director_phone, dmt_manager, dmt_manager_phone, tbc_manager, tbc_manager_phone, planned_start, planned_end, annotation, act, notes, devices'
    )
    .eq('id', row.id)
    .maybeSingle();

  row.devices = mergeBranchDevices(
    row.devices as unknown[],
    (prev.data as {devices?: unknown[]} | null)?.devices
  );

  const res = await db.from('tbc_branches').upsert(row).select('id, name').single();
  if (res.error) {
    console.error('[tbc] branches upsert', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const isCreate = !prev.data;
  const changes = isCreate
    ? {}
    : diffBranch(
        prev.data as Record<string, unknown>,
        row as Record<string, unknown>
      );

  // Skip audit if nothing meaningful changed (dirty detector in client may
  // false-positive). Only log if there are changes or it's a new branch.
  if (isCreate || Object.keys(changes).length > 0) {
    await writeAudit({
      actor: session.username,
      action: isCreate ? 'branch.create' : 'branch.update',
      targetType: 'branch',
      targetId: row.id,
      summary: isCreate
        ? `შექმნა ფილიალი "${row.name}"`
        : `განაახლა "${row.name}" (${Object.keys(changes).join(', ')})`,
      metadata: {branch_name: row.name, changes}
    });
  }

  return NextResponse.json({ok: true, id: res.data.id});
}
