import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {getTbcArchiveExpiry, mergeBranchDevices, writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

function keepExistingText(current: unknown, incoming: unknown): string | null {
  if (typeof current === 'string' && current.trim()) return current;
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim();
  return null;
}

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
  const now = new Date().toISOString();

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
    const existingRes = await db
      .from('tbc_branches')
      .select(
        'id, comment, status, director, director_phone, dmt_manager, dmt_manager_phone, tbc_manager, tbc_manager_phone, planned_start, planned_end, annotation, act, notes, devices, archived_at'
      );
    if (existingRes.error) {
      console.error('[tbc] seed existing load', existingRes.error);
      return NextResponse.json({error: 'db_error'}, {status: 500});
    }
    const existingById = new Map(
      (existingRes.data || []).map((branch) => [Number(branch.id), branch])
    );

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
        comment: keepExistingText(
          existingById.get(b.id as number)?.comment,
          b.comment
        ),
        inventory_items: b.inventory_items ?? [],
        planned_count: (b.planned_count as number) ?? 0,
        status:
          (existingById.get(b.id as number)?.status as string | null) ||
          ((b.status as string) || 'general'),
        director: keepExistingText(
          existingById.get(b.id as number)?.director,
          b.director
        ),
        director_phone: keepExistingText(
          existingById.get(b.id as number)?.director_phone,
          b.director_phone
        ),
        dmt_manager: keepExistingText(
          existingById.get(b.id as number)?.dmt_manager,
          b.dmt_manager
        ),
        dmt_manager_phone: keepExistingText(
          existingById.get(b.id as number)?.dmt_manager_phone,
          b.dmt_manager_phone
        ),
        tbc_manager: keepExistingText(
          existingById.get(b.id as number)?.tbc_manager,
          b.tbc_manager
        ),
        tbc_manager_phone: keepExistingText(
          existingById.get(b.id as number)?.tbc_manager_phone,
          b.tbc_manager_phone
        ),
        planned_start: keepExistingText(
          existingById.get(b.id as number)?.planned_start,
          b.planned_start
        ),
        planned_end: keepExistingText(
          existingById.get(b.id as number)?.planned_end,
          b.planned_end
        ),
        annotation: keepExistingText(
          existingById.get(b.id as number)?.annotation,
          b.annotation
        ),
        act: keepExistingText(existingById.get(b.id as number)?.act, b.act),
        notes: keepExistingText(existingById.get(b.id as number)?.notes, b.notes),
        devices: mergeBranchDevices(
          b.devices as unknown[],
          existingById.get(b.id as number)?.devices as unknown[]
        ),
        archived_at: null,
        archived_by: null,
        archive_expires_at: null,
        archive_reason: null,
        updated_at: now,
        updated_by: session.username
      }));

    if (mode === 'replace') {
      const incomingIds = new Set(rows.map((row) => Number(row.id)));
      const missingIds = (existingRes.data || [])
        .filter((branch) => !branch.archived_at && !incomingIds.has(Number(branch.id)))
        .map((branch) => Number(branch.id))
        .filter(Number.isFinite);
      if (missingIds.length > 0) {
        const archiveRes = await db
          .from('tbc_branches')
          .update({
            archived_at: now,
            archived_by: session.username,
            archive_expires_at: getTbcArchiveExpiry(new Date(now)),
            archive_reason: 'seed_replace_missing'
          })
          .in('id', missingIds);
        if (archiveRes.error) {
          console.error('[tbc] seed archive missing', archiveRes.error);
          return NextResponse.json({error: 'db_error'}, {status: 500});
        }
      }
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
    .select('id', {count: 'exact', head: true})
    .is('archived_at', null);

  await writeAudit({
    actor: session.username,
    action: 'seed',
    summary: `bulk seed: mode=${mode}, branches=${body.branches?.length || 0}, types=${body.equipment_types?.length || 0}`,
    metadata: {
      mode,
      branch_count: body.branches?.length || 0,
      type_count: body.equipment_types?.length || 0,
      total_after: count.count ?? 0
    }
  });

  return NextResponse.json({ok: true, total: count.count ?? 0});
}
