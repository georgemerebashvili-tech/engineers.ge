import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const {data, error} = await db
    .from('construction_procurement_projects')
    .select(`
      id, project_no, name, notes, status, drive_url, created_by, created_at, updated_at,
      winner_contact_id,
      site:construction_sites(id, name)
    `)
    .order('created_at', {ascending: false});

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({projects: data ?? []});
}

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({error: 'name_required'}, {status: 400});

  const db = supabaseAdmin();
  const {data, error} = await db.from('construction_procurement_projects').insert({
    project_no: (body.project_no as string)?.trim() || '',
    name,
    notes: (body.notes as string)?.trim() || null,
    status: 'draft',
    site_id: (body.site_id as number) || null,
    drive_url: (body.drive_url as string)?.trim() || null,
    created_by: session.username
  }).select('id, project_no, name, status, created_at').single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({project: data}, {status: 201});
}
