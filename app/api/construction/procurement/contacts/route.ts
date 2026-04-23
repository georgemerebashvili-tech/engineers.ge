import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {searchParams} = new URL(req.url);
  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const activeOnly = searchParams.get('active') !== 'all';

  const db = supabaseAdmin();
  let q = db
    .from('construction_contacts')
    .select('id, name, identification_code, company, email, phone, category, notes, active, created_by, created_at')
    .order('name');

  if (activeOnly) q = q.eq('active', true);
  if (category) q = q.eq('category', category);
  if (search) q = q.ilike('name', `%${search}%`);

  const {data, error} = await q;
  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({contacts: data ?? []});
}

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({error: 'name_required'}, {status: 400});

  const db = supabaseAdmin();
  const {data, error} = await db.from('construction_contacts').insert({
    name,
    identification_code: (body.identification_code as string)?.trim() || null,
    company: (body.company as string)?.trim() || null,
    email: (body.email as string)?.trim() || null,
    phone: (body.phone as string)?.trim() || null,
    category: (body.category as string)?.trim() || null,
    notes: (body.notes as string)?.trim() || null,
    created_by: session.username
  }).select('id, name, identification_code, company, email, phone, category, notes, active, created_by, created_at').single();

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({contact: data}, {status: 201});
}
