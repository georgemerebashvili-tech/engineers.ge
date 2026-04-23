import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const db = supabaseAdmin();
  const res = await db
    .from('construction_equipment_types')
    .select('id, category, subtype')
    .order('category', {ascending: true})
    .order('subtype', {ascending: true});

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({types: res.data || []});
}

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const {category, subtype} = body as {category?: string; subtype?: string};
  if (!category || !subtype) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  const res = await db
    .from('construction_equipment_types')
    .insert({category: category.trim(), subtype: subtype.trim()})
    .select()
    .single();

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true, type: res.data});
}
