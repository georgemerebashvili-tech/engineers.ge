import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const allowed: Record<string, unknown> = {};
  for (const k of ['name', 'company', 'email', 'phone', 'category', 'notes', 'active']) {
    if (k in body) allowed[k] = body[k] === '' ? null : body[k];
  }

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_contacts')
    .update(allowed)
    .eq('id', params.id)
    .select('id, name, company, email, phone, category, notes, active')
    .single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({contact: data});
}

export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const {error} = await db.from('construction_contacts').delete().eq('id', params.id);
  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
