import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, {params}: {params: {id: string; qaId: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const answer = (body.answer as string)?.trim();
  if (!answer) return NextResponse.json({error: 'answer required'}, {status: 400});

  const db = supabaseAdmin();
  const {data, error} = await db.from('construction_procurement_qa_answers').insert({
    qa_id: params.qaId,
    answer,
    answered_by: session.displayName || session.username
  }).select('id, answer, answered_by, created_at').single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({answer: data}, {status: 201});
}

export async function DELETE(_req: Request, {params}: {params: {id: string; qaId: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const db = supabaseAdmin();
  const {error} = await db.from('construction_procurement_qa').delete().eq('id', params.qaId).eq('project_id', params.id);
  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
