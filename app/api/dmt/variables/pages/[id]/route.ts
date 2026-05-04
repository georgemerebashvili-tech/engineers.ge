import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, pageScopeFromDb, pageScopeToDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const patch = pageScopeToDb({...body, id});
  delete (patch as Record<string, unknown>).id;
  const {data, error} = await supabaseAdmin()
    .from('dmt_page_scopes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({page: pageScopeFromDb(data)});
}

export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const {error} = await supabaseAdmin().from('dmt_page_scopes').delete().eq('id', id);
  if (error) return jsonError(error);
  return NextResponse.json({ok: true});
}
