import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Bulk-seeds branches + equipment types. Admin only.
 * Called once from the browser with the embedded DATA blob from the original
 * HTML. Safe to call repeatedly (upserts on id).
 */
export async function POST(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: {
    branches?: Array<Record<string, unknown>>;
    equipment_types?: Array<{category: string; subtype: string}>;
    mode?: 'merge' | 'replace';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const db = supabaseAdmin();
  const mode = body.mode === 'replace' ? 'replace' : 'merge';

  // Equipment types
  if (Array.isArray(body.equipment_types) && body.equipment_types.length) {
    const types = body.equipment_types
      .filter(
        (t) => t && typeof t.category === 'string' && typeof t.subtype === 'string'
      )
      .map((t) => ({category: t.category.trim(), subtype: t.subtype.trim()}));
    if (types.length) {
      await db.from('tbc_equipment_types').upsert(types, {
        onConflict: 'category,subtype',
        ignoreDuplicates: true
      });
    }
  }

  // Branches
  if (Array.isArray(body.branches) && body.branches.length) {
    const rows = body.branches
      .filter((b) => typeof b.id === 'number' && typeof b.name === 'string')
      .map((b) => ({
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
      }));

    if (mode === 'replace') {
      await db.from('tbc_branches').delete().neq('id', -1);
    }

    // Supabase has a 1000-row limit per insert; chunk just in case.
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const up = await db.from('tbc_branches').upsert(slice, {
        onConflict: 'id',
        ignoreDuplicates: mode === 'merge'
      });
      if (up.error) {
        console.error('[tbc] seed upsert', up.error);
        return NextResponse.json({error: 'db_error'}, {status: 500});
      }
    }
  }

  const count = await db
    .from('tbc_branches')
    .select('id', {count: 'exact', head: true});
  return NextResponse.json({ok: true, total: count.count ?? 0});
}
