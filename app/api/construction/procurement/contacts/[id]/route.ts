import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const allowed: Record<string, unknown> = {};
  for (const k of ['name', 'identification_code', 'company', 'email', 'phone', 'category', 'notes', 'active', 'procurement_blocked', 'procurement_block_reason']) {
    if (k in body) allowed[k] = body[k] === '' ? null : body[k];
  }
  if ('procurement_blocked' in body) {
    const blocked = body.procurement_blocked === true;
    allowed.procurement_blocked = blocked;
    allowed.procurement_blocked_at = blocked ? new Date().toISOString() : null;
    allowed.procurement_blocked_by = blocked ? session.username : null;
    if (!blocked) allowed.procurement_block_reason = null;
  }

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_contacts')
    .update(allowed)
    .eq('id', id)
    .select('id, name, identification_code, company, email, phone, category, notes, active, procurement_blocked, procurement_block_reason, procurement_blocked_at, procurement_blocked_by')
    .single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({contact: data});
}

export async function DELETE(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const {error} = await db.from('construction_contacts').delete().eq('id', id);
  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
