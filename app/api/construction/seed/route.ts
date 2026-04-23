import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: {
    sites?: Array<Record<string, unknown>>;
    branches?: Array<Record<string, unknown>>;
    equipment_types?: Array<{category: string; subtype: string}>;
    mode?: 'merge' | 'replace';
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const db = supabaseAdmin();
  const mode = body.mode === 'replace' ? 'replace' : 'merge';

  if (Array.isArray(body.equipment_types) && body.equipment_types.length) {
    const types = body.equipment_types
      .filter((t) => t && typeof t.category === 'string' && typeof t.subtype === 'string')
      .map((t) => ({category: t.category.trim(), subtype: t.subtype.trim()}));
    if (types.length) {
      await db.from('construction_equipment_types').upsert(types, {onConflict: 'category,subtype', ignoreDuplicates: true});
    }
  }

  const rawSites = body.sites || body.branches || [];
  if (Array.isArray(rawSites) && rawSites.length) {
    const rows = rawSites
      .filter((b) => typeof b.id === 'number' && typeof b.name === 'string')
      .map((b) => ({
        id: b.id as number, alias: (b.alias as string) || null, name: (b.name as string) || '',
        type: (b.type as string) || null, region: (b.region as string) || null,
        city: (b.city as string) || null, address: (b.address as string) || null,
        area_m2: (b.area_m2 as number) ?? null, budget: (b.budget as number) ?? null,
        comment: (b.comment as string) || null, inventory_items: b.inventory_items ?? [],
        planned_count: (b.planned_count as number) ?? 0, status: (b.status as string) || 'general',
        director: (b.director as string) || null, director_phone: (b.director_phone as string) || null,
        dmt_manager: (b.dmt_manager as string) || null, dmt_manager_phone: (b.dmt_manager_phone as string) || null,
        kaya_manager: ((b.kaya_manager as string) || (b.tbc_manager as string) || null),
        kaya_manager_phone: ((b.kaya_manager_phone as string) || (b.tbc_manager_phone as string) || null),
        planned_start: (b.planned_start as string) || null, planned_end: (b.planned_end as string) || null,
        annotation: (b.annotation as string) || null, act: (b.act as string) || null,
        notes: (b.notes as string) || null, devices: b.devices ?? [],
        updated_at: new Date().toISOString(), updated_by: session.username
      }));

    if (mode === 'replace') await db.from('construction_sites').delete().neq('id', -1);

    for (let i = 0; i < rows.length; i += 200) {
      const up = await db.from('construction_sites').upsert(rows.slice(i, i + 200), {onConflict: 'id', ignoreDuplicates: mode === 'merge'});
      if (up.error) return NextResponse.json({error: 'db_error'}, {status: 500});
    }
  }

  const count = await db.from('construction_sites').select('id', {count: 'exact', head: true});
  await writeConstructionAudit({
    actor: session.username, action: 'seed',
    summary: `bulk seed: mode=${mode}, sites=${rawSites.length}, types=${body.equipment_types?.length || 0}`,
    metadata: {mode, site_count: rawSites.length, type_count: body.equipment_types?.length || 0, total_after: count.count ?? 0}
  });

  return NextResponse.json({ok: true, total: count.count ?? 0});
}
