import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_projects')
    .select('id, project_no, name, notes, status, drive_url, project_date, formulas, created_by, created_at, updated_at, winner_contact_id, site_id')
    .eq('id', params.id)
    .single();

  if (error) {
    console.error('[procurement] project GET', params.id, error);
    return NextResponse.json({error: 'not_found'}, {status: 404});
  }
  return NextResponse.json({project: data});
}

export async function PATCH(req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const allowed: Record<string, unknown> = {updated_at: new Date().toISOString()};
  for (const k of ['project_no', 'name', 'notes', 'status', 'drive_url', 'project_date', 'site_id', 'winner_contact_id', 'formulas']) {
    if (k in body) allowed[k] = body[k] === '' ? null : body[k];
  }

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_projects')
    .update(allowed)
    .eq('id', params.id)
    .select('id, project_no, name, notes, status, drive_url, project_date, formulas, updated_at, winner_contact_id')
    .single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({project: data});
}

export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const {error} = await db.from('construction_procurement_projects').delete().eq('id', params.id);
  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
