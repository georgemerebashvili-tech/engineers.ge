import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_bids')
    .select('id, item_id, contact_id, product_price, install_price, updated_at')
    .eq('project_id', params.id);

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({bids: data ?? []});
}

export async function PATCH(req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const item_id = body.item_id as string;
  const contact_id = body.contact_id as string;
  if (!item_id || !contact_id) return NextResponse.json({error: 'item_id and contact_id required'}, {status: 400});

  const upsertRow: Record<string, unknown> = {
    project_id: params.id,
    item_id,
    contact_id,
    updated_at: new Date().toISOString()
  };
  if ('product_price' in body) upsertRow.product_price = body.product_price === null ? null : Number(body.product_price) || null;
  if ('install_price' in body) upsertRow.install_price = body.install_price === null ? null : Number(body.install_price) || null;

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_bids')
    .upsert(upsertRow, {onConflict: 'item_id,contact_id'})
    .select('id, item_id, contact_id, product_price, install_price')
    .single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({bid: data});
}
