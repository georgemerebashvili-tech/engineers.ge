import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {extraColFromDb, extraColToDb, jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_extra_cols')
    .select('*')
    .order('position', {ascending: true});

  if (error) return jsonError(error);
  return NextResponse.json({cols: (data ?? []).map(extraColFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_extra_cols')
    .insert(extraColToDb(body))
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({col: extraColFromDb(data)}, {status: 201});
}

export async function PUT(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const cols = Array.isArray(body?.cols) ? body.cols : Array.isArray(body) ? body : [];
  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_extra_cols')
    .upsert(cols.map((col: Record<string, unknown>, index: number) => extraColToDb(col, index)), {onConflict: 'id'})
    .select();

  if (error) return jsonError(error);
  return NextResponse.json({cols: (data ?? []).map(extraColFromDb)});
}
