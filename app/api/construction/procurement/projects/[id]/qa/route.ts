import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_qa')
    .select(`
      id, project_id, contact_id, question, created_at,
      contact:construction_contacts(id, name, company),
      answers:construction_procurement_qa_answers(id, answer, answered_by, created_at)
    `)
    .eq('project_id', params.id)
    .order('created_at', {ascending: false});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({qa: data ?? []});
}

export async function POST(req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const contact_id = body.contact_id as string;
  const question = (body.question as string)?.trim();
  if (!contact_id || !question) return NextResponse.json({error: 'contact_id and question required'}, {status: 400});

  const db = supabaseAdmin();
  const {data, error} = await db.from('construction_procurement_qa').insert({
    project_id: params.id, contact_id, question
  }).select('id, contact_id, question, created_at').single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({qa: data}, {status: 201});
}
