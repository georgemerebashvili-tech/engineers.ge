import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_items')
    .select('id, project_id, sort_order, name, unit, qty, labor_note, created_at')
    .eq('project_id', id)
    .order('sort_order');

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({items: data ?? []});
}

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const name = (body.name as string)?.trim() || 'ახალი სტრიქონი';

  const db = supabaseAdmin();
  const {data: existing} = await db
    .from('construction_procurement_items')
    .select('sort_order')
    .eq('project_id', id)
    .order('sort_order', {ascending: false})
    .limit(1)
    .maybeSingle();

  const sort_order = ((existing?.sort_order as number) ?? -1) + 1;

  const {data, error} = await db.from('construction_procurement_items').insert({
    project_id: id,
    sort_order,
    name,
    unit: (body.unit as string) || 'pcs',
    qty: Number(body.qty) || 1,
    labor_note: (body.labor_note as string)?.trim() || null
  }).select('id, project_id, sort_order, name, unit, qty, labor_note').single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({item: data}, {status: 201});
}

export async function PATCH(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const itemId = body.id as string;
  if (!itemId) return NextResponse.json({error: 'item_id_required'}, {status: 400});

  const allowed: Record<string, unknown> = {};
  for (const k of ['name', 'unit', 'qty', 'labor_note', 'sort_order']) {
    if (k in body) allowed[k] = body[k];
  }

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_items')
    .update(allowed)
    .eq('id', itemId)
    .eq('project_id', id)
    .select('id, sort_order, name, unit, qty, labor_note')
    .single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({item: data});
}

export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {searchParams} = new URL(req.url);
  const itemId = searchParams.get('item_id');
  if (!itemId) return NextResponse.json({error: 'item_id_required'}, {status: 400});

  const db = supabaseAdmin();
  const {error} = await db
    .from('construction_procurement_items')
    .delete()
    .eq('id', itemId)
    .eq('project_id', id);

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
