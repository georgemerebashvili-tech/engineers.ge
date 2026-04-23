import {NextResponse} from 'next/server';
import {getConstructionSession, canAccessConstructionSite} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const siteId = parseInt(id, 10);
  if (isNaN(siteId)) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessConstructionSite(db, session, siteId))) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const {data, error} = await db
    .from('construction_estimate_items')
    .select('id, sort_order, name, item_type, unit, qty, price, total, note')
    .eq('site_id', siteId)
    .order('sort_order', {ascending: true});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({items: data || []});
}

export async function PUT(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const siteId = parseInt(id, 10);
  if (isNaN(siteId)) return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const {items} = body as {items?: Array<{name: string; item_type?: string; unit?: string; qty: number; price: number; note?: string; sort_order?: number}>};
  if (!Array.isArray(items)) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  await db.from('construction_estimate_items').delete().eq('site_id', siteId);

  if (items.length > 0) {
    const now = new Date().toISOString();
    const rows = items.map((it, idx) => ({
      site_id: siteId,
      sort_order: it.sort_order ?? idx,
      name: it.name || 'უსათაურო',
      item_type: it.item_type || null,
      unit: it.unit || null,
      qty: Number(it.qty) || 0,
      price: Number(it.price) || 0,
      note: it.note || null,
      updated_at: now,
      updated_by: session.username
    }));
    const {error} = await db.from('construction_estimate_items').insert(rows);
    if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  await writeConstructionAudit({
    actor: session.username,
    action: 'estimate.save',
    targetType: 'site',
    targetId: siteId,
    summary: `ხარჯთაღრიცხვა შეინახა — ${items.length} პოზიცია`,
    metadata: {site_id: siteId, item_count: items.length}
  });

  return NextResponse.json({ok: true, count: items.length});
}
