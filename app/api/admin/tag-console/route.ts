import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase/server';
import {getSession} from '@/lib/auth';

async function requireAdmin() {
  const s = await getSession();
  if (!s) return null;
  return s;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const db = await supabaseServer();
  const {data, error} = await db
    .from('site_tags')
    .select('*')
    .order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const body = await req.json();
  const {page_path, selector, element_type, element_text, tag_name, note} = body;
  if (!page_path || !selector || !tag_name)
    return NextResponse.json({error: 'page_path, selector, tag_name required'}, {status: 400});
  const db = await supabaseServer();
  const {data, error} = await db
    .from('site_tags')
    .insert({page_path, selector, element_type, element_text, tag_name, note})
    .select()
    .single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await req.json();
  if (!id) return NextResponse.json({error: 'id required'}, {status: 400});
  const db = await supabaseServer();
  const {error} = await db.from('site_tags').delete().eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({ok: true});
}
