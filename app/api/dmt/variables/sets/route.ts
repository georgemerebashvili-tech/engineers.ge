import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, requireDmtUser, variableSetFromDb, variableSetToDb} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_variable_sets')
    .select('*')
    .order('position', {ascending: true});

  if (error) return jsonError(error);
  return NextResponse.json({sets: (data ?? []).map(variableSetFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_variable_sets')
    .upsert(variableSetToDb(body), {onConflict: 'id'})
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({set: variableSetFromDb(data)}, {status: 201});
}
