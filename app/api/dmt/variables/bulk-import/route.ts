import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, pageScopeToDb, requireDmtUser, variableSetToDb} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const sets = Array.isArray(body?.sets) ? body.sets : [];
  const pages = Array.isArray(body?.pages) ? body.pages : [];
  const db = supabaseAdmin();

  if (body?.replaceSets) {
    const {error} = await db.from('dmt_variable_sets').delete().neq('id', '');
    if (error) return jsonError(error);
  }
  if (sets.length) {
    const {error} = await db
      .from('dmt_variable_sets')
      .upsert(sets.map((set: Record<string, unknown>, index: number) => variableSetToDb(set, index)), {
        onConflict: 'id',
        ignoreDuplicates: !body?.replaceSets,
      });
    if (error) return jsonError(error);
  }

  if (body?.replacePages) {
    const {error} = await db.from('dmt_page_scopes').delete().neq('id', '');
    if (error) return jsonError(error);
  }
  if (pages.length) {
    const {error} = await db
      .from('dmt_page_scopes')
      .upsert(pages.map((page: Record<string, unknown>, index: number) => pageScopeToDb(page, index)), {
        onConflict: 'id',
        ignoreDuplicates: !body?.replacePages,
      });
    if (error) return jsonError(error);
  }

  return NextResponse.json({ok: true}, {status: 201});
}
