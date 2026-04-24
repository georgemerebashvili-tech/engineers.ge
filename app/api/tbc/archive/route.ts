import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getTbcSession();
  if (!s || s.role !== 'admin') return null;
  return s;
}

// ── GET /api/tbc/archive?type=users|companies|branches|comments|devices|estimates
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {searchParams} = new URL(req.url);
  const type = searchParams.get('type') ?? 'users';
  const db = supabaseAdmin();

  if (type === 'users') {
    const {data, error} = await db
      .from('tbc_users')
      .select('id, username, email, display_name, role, archived_at, archived_by, archive_expires_at, archive_reason')
      .not('archived_at', 'is', null)
      .order('archived_at', {ascending: false})
      .limit(200);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    return NextResponse.json({items: data || []});
  }

  if (type === 'companies') {
    const {data, error} = await db
      .from('tbc_companies')
      .select('id, name, type, contact_person, phone, archived_at, archived_by, archive_expires_at')
      .not('archived_at', 'is', null)
      .order('archived_at', {ascending: false})
      .limit(200);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    return NextResponse.json({items: data || []});
  }

  if (type === 'branches') {
    const {data, error} = await db
      .from('tbc_branches')
      .select('id, alias, name, region, city, archived_at, archived_by, archive_expires_at, archive_reason')
      .not('archived_at', 'is', null)
      .order('archived_at', {ascending: false})
      .limit(200);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    return NextResponse.json({items: data || []});
  }

  if (type === 'comments') {
    const {data, error} = await db
      .from('tbc_branch_comments')
      .select('id, branch_id, author, kind, body, archived_at, archived_by, archive_expires_at')
      .not('archived_at', 'is', null)
      .order('archived_at', {ascending: false})
      .limit(300);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    return NextResponse.json({items: data || []});
  }

  if (type === 'estimates') {
    const {data, error} = await db
      .from('tbc_estimate_items')
      .select('id, branch_id, sort_order, name, item_type, unit, qty, price, total, note, archived_at, archived_by, archive_expires_at, archive_reason')
      .not('archived_at', 'is', null)
      .order('archived_at', {ascending: false})
      .limit(400);
    if (error) return NextResponse.json({error: error.message}, {status: 500});

    const branchIds = Array.from(
      new Set(
        (data || [])
          .map((row) => Number(row.branch_id))
          .filter(Number.isFinite)
      )
    );
    const branchAliasById = new Map<number, string>();

    if (branchIds.length > 0) {
      const {data: branches, error: branchError} = await db
        .from('tbc_branches')
        .select('id, alias, name')
        .in('id', branchIds);
      if (branchError) return NextResponse.json({error: branchError.message}, {status: 500});

      for (const branch of branches || []) {
        branchAliasById.set(Number(branch.id), branch.alias || branch.name || `#${branch.id}`);
      }
    }

    return NextResponse.json({
      items: (data || []).map((row) => ({
        ...row,
        branch_alias: branchAliasById.get(Number(row.branch_id)) || `#${row.branch_id}`
      }))
    });
  }

  if (type === 'devices') {
    // scan active branches for JSONB devices that have archived_at set
    const {data: branches, error} = await db
      .from('tbc_branches')
      .select('id, alias, name, devices')
      .is('archived_at', null)
      .order('id', {ascending: true});
    if (error) return NextResponse.json({error: error.message}, {status: 500});

    type DevRow = Record<string, unknown> & {archived_at?: string};
    const items: unknown[] = [];
    for (const branch of branches ?? []) {
      const devices = Array.isArray(branch.devices) ? branch.devices as DevRow[] : [];
      devices.forEach((d, rawIdx) => {
        if (d && typeof d.archived_at === 'string' && d.archived_at) {
          items.push({
            branch_id: branch.id,
            branch_alias: branch.alias || branch.name,
            raw_idx: rawIdx,
            category: d.category,
            subtype: d.subtype,
            brand: d.brand,
            model: d.model,
            serial: d.serial,
            location: d.location,
            archived_at: d.archived_at,
            archived_by: d.archived_by,
            archive_expires_at: d.archive_expires_at,
            archive_reason: d.archive_reason
          });
        }
      });
    }
    items.sort((a, b) =>
      ((b as DevRow).archived_at as string) > ((a as DevRow).archived_at as string) ? 1 : -1
    );
    return NextResponse.json({items});
  }

  return NextResponse.json({error: 'unknown type'}, {status: 400});
}

// ── POST /api/tbc/archive — restore an archived entity ───────────────────────
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: {type?: string; id?: unknown} = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const {type, id} = body;
  if (!type || !id) return NextResponse.json({error: 'type and id required'}, {status: 400});

  const db = supabaseAdmin();
  const clear = {archived_at: null, archived_by: null, archive_expires_at: null, archive_reason: null};

  if (type === 'user') {
    const target = await db.from('tbc_users').select('username').eq('id', String(id)).single();
    if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
    const res = await db.from('tbc_users').update({...clear, active: true}).eq('id', String(id));
    if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
    await writeAudit({
      actor: session.username, action: 'user.restore', targetType: 'user', targetId: String(id),
      summary: `არქივიდან აღადგინა მომხმარებელი "${target.data.username}"`
    });
    return NextResponse.json({ok: true});
  }

  if (type === 'company') {
    const target = await db.from('tbc_companies').select('name').eq('id', Number(id)).single();
    if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
    const res = await db.from('tbc_companies').update({
      ...clear, active: true,
      updated_at: new Date().toISOString(), updated_by: session.username
    }).eq('id', Number(id));
    if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
    await writeAudit({
      actor: session.username, action: 'company.restore', targetType: 'company', targetId: String(id),
      summary: `არქივიდან აღადგინა კომპანია "${target.data.name}"`
    });
    return NextResponse.json({ok: true});
  }

  if (type === 'branch') {
    const target = await db.from('tbc_branches').select('name, alias').eq('id', Number(id)).single();
    if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
    const res = await db.from('tbc_branches').update({
      ...clear, updated_at: new Date().toISOString(), updated_by: session.username
    }).eq('id', Number(id));
    if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
    await writeAudit({
      actor: session.username, action: 'branch.restore', targetType: 'branch', targetId: String(id),
      summary: `არქივიდან აღადგინა ფილიალი "${target.data.alias || target.data.name}"`
    });
    return NextResponse.json({ok: true});
  }

  if (type === 'comment') {
    const target = await db.from('tbc_branch_comments').select('branch_id, author, body').eq('id', Number(id)).single();
    if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
    const res = await db.from('tbc_branch_comments').update(clear).eq('id', Number(id));
    if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
    await writeAudit({
      actor: session.username, action: 'comment.restore', targetType: 'branch', targetId: String(target.data.branch_id),
      summary: `არქივიდან აღადგინა კომენტარი (branch #${target.data.branch_id}, ${target.data.author})`
    });
    return NextResponse.json({ok: true});
  }

  if (type === 'estimate') {
    const target = await db
      .from('tbc_estimate_items')
      .select('id, branch_id, sort_order, name, item_type, unit, qty, price, total, archived_at')
      .eq('id', Number(id))
      .maybeSingle();
    if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
    if (!target.data.archived_at)
      return NextResponse.json({error: 'not_archived'}, {status: 409});

    const latestActive = await db
      .from('tbc_estimate_items')
      .select('sort_order')
      .eq('branch_id', Number(target.data.branch_id))
      .is('archived_at', null)
      .order('sort_order', {ascending: false})
      .limit(1)
      .maybeSingle();
    if (latestActive.error) return NextResponse.json({error: 'db_error'}, {status: 500});

    const restoredSortOrder =
      typeof latestActive.data?.sort_order === 'number'
        ? latestActive.data.sort_order + 1
        : 0;
    const now = new Date().toISOString();

    const res = await db
      .from('tbc_estimate_items')
      .update({
        ...clear,
        sort_order: restoredSortOrder,
        updated_at: now,
        updated_by: session.username
      })
      .eq('id', Number(id));
    if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

    await writeAudit({
      actor: session.username,
      action: 'estimate.restore',
      targetType: 'branch',
      targetId: String(target.data.branch_id),
      summary: `არქივიდან აღადგინა ხარჯთაღრიცხვის პოზიცია "${target.data.name}" (ფილიალი #${target.data.branch_id})`,
      metadata: {
        branch_id: target.data.branch_id,
        estimate_item_id: Number(id),
        restored_sort_order: restoredSortOrder,
        original_sort_order: target.data.sort_order,
        archived_at: target.data.archived_at
      }
    });
    return NextResponse.json({ok: true});
  }

  return NextResponse.json({error: 'unknown type'}, {status: 400});
}
