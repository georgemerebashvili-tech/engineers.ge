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
    .from('construction_procurement_selections')
    .select('item_id, contact_id, price_type')
    .eq('project_id', id);

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({selections: data ?? []});
}

export async function PATCH(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const {item_id, contact_id, price_type} = body as {item_id: string; contact_id: string | null; price_type: 'product' | 'install'};
  if (!item_id || !price_type) return NextResponse.json({error: 'item_id and price_type required'}, {status: 400});

  const db = supabaseAdmin();

  if (!contact_id) {
    await db.from('construction_procurement_selections')
      .delete()
      .eq('item_id', item_id)
      .eq('price_type', price_type);
    return NextResponse.json({ok: true});
  }

  const {error} = await db.from('construction_procurement_selections').upsert({
    project_id: id,
    item_id,
    contact_id,
    price_type
  }, {onConflict: 'item_id,price_type'});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
