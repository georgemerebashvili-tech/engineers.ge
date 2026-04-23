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
    .from('construction_procurement_participants')
    .select(`
      project_id, contact_id, sort_order,
      contact:construction_contacts(id, name, company, email, phone, category)
    `)
    .eq('project_id', id)
    .order('sort_order');

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({participants: data ?? []});
}

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const contact_id = body.contact_id as string;
  if (!contact_id) return NextResponse.json({error: 'contact_id required'}, {status: 400});

  const db = supabaseAdmin();

  const {data: existing} = await db
    .from('construction_procurement_participants')
    .select('sort_order')
    .eq('project_id', id)
    .order('sort_order', {ascending: false})
    .limit(1)
    .maybeSingle();

  const sort_order = ((existing?.sort_order as number) ?? -1) + 1;

  const {error} = await db.from('construction_procurement_participants').upsert({
    project_id: id,
    contact_id,
    sort_order
  }, {onConflict: 'project_id,contact_id', ignoreDuplicates: true});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true}, {status: 201});
}

export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {searchParams} = new URL(req.url);
  const contact_id = searchParams.get('contact_id');
  if (!contact_id) return NextResponse.json({error: 'contact_id required'}, {status: 400});

  const db = supabaseAdmin();
  const {error} = await db
    .from('construction_procurement_participants')
    .delete()
    .eq('project_id', id)
    .eq('contact_id', contact_id);

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
