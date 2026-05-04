import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, manualLeadFromDb, manualLeadToDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_leads')
    .select('*')
    .order('edited_at', {ascending: false});

  if (error) return jsonError(error);
  return NextResponse.json({rows: (data ?? []).map(manualLeadFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_leads')
    .upsert(manualLeadToDb(body, dmtActor(auth.me)), {onConflict: 'id'})
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({row: manualLeadFromDb(data)}, {status: 201});
}
