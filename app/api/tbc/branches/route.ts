import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const res = await db
    .from('tbc_branches')
    .select(
      'id, alias, name, type, region, city, address, area_m2, monthly_fee, comment, inventory_items, planned_count, status, director, director_phone, dmt_manager, dmt_manager_phone, tbc_manager, tbc_manager_phone, planned_start, planned_end, annotation, act, notes, devices, updated_at, updated_by'
    )
    .order('id', {ascending: true});

  if (res.error) {
    console.error('[tbc] branches load', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  // Per-user visibility: admins see all; users see only assigned ones.
  let branches = res.data || [];
  if (session.role !== 'admin') {
    const perms = await db
      .from('tbc_branch_permissions')
      .select('branch_id')
      .eq('user_id', session.uid);
    const allowedIds = new Set<number>();
    let seeAll = false;
    (perms.data || []).forEach((r) => {
      if (r.branch_id == null) seeAll = true;
      else allowedIds.add(r.branch_id as number);
    });
    if (!seeAll) {
      branches = branches.filter((b) => allowedIds.has(b.id as number));
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
    updated_at: new Date().toISOString(),
    updated_by: session.username
  };

  const res = await db.from('tbc_branches').upsert(row).select('id').single();
  if (res.error) {
    console.error('[tbc] branches upsert', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  return NextResponse.json({ok: true, id: res.data.id});
}
