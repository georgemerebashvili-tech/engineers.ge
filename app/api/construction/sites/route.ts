import {NextResponse} from 'next/server';
import {
  siteMatchesConstructionSession,
  getConstructionSiteAccess,
  getConstructionSession
} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit, diffSite} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const res = await db
    .from('construction_sites')
    .select(
      'id, alias, name, type, region, city, address, area_m2, budget, comment, inventory_items, planned_count, status, director, director_phone, dmt_manager, dmt_manager_phone, kaya_manager, kaya_manager_phone, planned_start, planned_end, annotation, act, notes, devices, updated_at, updated_by'
    )
    .order('id', {ascending: true});

  if (res.error) {
    console.error('[construction] sites load', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  let sites = res.data || [];
  if (session.role !== 'admin') {
    const {seeAll, allowedIds} = await getConstructionSiteAccess(db, session);
    if (!seeAll) {
      sites = sites.filter((s) => {
        const siteId = Number(s.id);
        return (
          allowedIds.has(siteId) ||
          siteMatchesConstructionSession(
            {
              dmt_manager: (s.dmt_manager as string | null) || null,
              kaya_manager: (s.kaya_manager as string | null) || null
            },
            session
          )
        );
      });
    }
  }

  // return both keys: {sites} for our code, {branches} for inventory.html
  return NextResponse.json({sites, branches: sites});
}

export async function PUT(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  // accept both {site} (our code) and {branch} (inventory.html)
  const payload = body as {site?: Record<string, unknown>; branch?: Record<string, unknown>};
  const s = payload?.site || payload?.branch;
  if (!s || typeof s !== 'object' || typeof s.id !== 'number') {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const db = supabaseAdmin();
  const row = {
    id: s.id as number,
    alias: (s.alias as string) || null,
    name: (s.name as string) || '',
    type: (s.type as string) || null,
    region: (s.region as string) || null,
    city: (s.city as string) || null,
    address: (s.address as string) || null,
    area_m2: (s.area_m2 as number) ?? null,
    budget: (s.budget as number) ?? null,
    comment: (s.comment as string) || null,
    inventory_items: s.inventory_items ?? [],
    planned_count: (s.planned_count as number) ?? 0,
    status: (s.status as string) || 'general',
    director: (s.director as string) || null,
    director_phone: (s.director_phone as string) || null,
    dmt_manager: (s.dmt_manager as string) || null,
    dmt_manager_phone: (s.dmt_manager_phone as string) || null,
    kaya_manager: (s.kaya_manager as string) || null,
    kaya_manager_phone: (s.kaya_manager_phone as string) || null,
    planned_start: (s.planned_start as string) || null,
    planned_end: (s.planned_end as string) || null,
    annotation: (s.annotation as string) || null,
    act: (s.act as string) || null,
    notes: (s.notes as string) || null,
    devices: s.devices ?? [],
    updated_at: new Date().toISOString(),
    updated_by: session.username
  };

  const prev = await db
    .from('construction_sites')
    .select('alias, name, type, region, city, address, status, director, director_phone, dmt_manager, dmt_manager_phone, kaya_manager, kaya_manager_phone, planned_start, planned_end, annotation, act, notes')
    .eq('id', row.id)
    .maybeSingle();

  const res = await db.from('construction_sites').upsert(row).select('id, name').single();
  if (res.error) {
    console.error('[construction] sites upsert', res.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const isCreate = !prev.data;
  const changes = isCreate ? {} : diffSite(prev.data as Record<string, unknown>, row as Record<string, unknown>);

  if (isCreate || Object.keys(changes).length > 0) {
    await writeConstructionAudit({
      actor: session.username,
      action: isCreate ? 'site.create' : 'site.update',
      targetType: 'site',
      targetId: row.id,
      summary: isCreate
        ? `შექმნა ობიექტი "${row.name}"`
        : `განაახლა "${row.name}" (${Object.keys(changes).join(', ')})`,
      metadata: {site_name: row.name, changes}
    });
  }

  return NextResponse.json({ok: true, id: res.data.id});
}
