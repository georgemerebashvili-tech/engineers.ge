import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase/server';
import {getSession} from '@/lib/auth';

async function requireAdmin() {
  const s = await getSession();
  return s ?? null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const db = await supabaseServer();
  const {data, error} = await db
    .from('site_page_nodes')
    .select('*')
    .order('created_at', {ascending: true});
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const body = await req.json();
  const {page_key, page_path, label, next_keys, requires, outputs} = body;
  if (!page_key || !page_path)
    return NextResponse.json({error: 'page_key and page_path required'}, {status: 400});
  const db = await supabaseServer();
  const {data, error} = await db
    .from('site_page_nodes')
    .upsert({page_key, page_path, label, next_keys: next_keys ?? [], requires: requires ?? [], outputs: outputs ?? []})
    .select()
    .single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await req.json();
  const db = await supabaseServer();
  const {error} = await db.from('site_page_nodes').delete().eq('id', id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({ok: true});
}
