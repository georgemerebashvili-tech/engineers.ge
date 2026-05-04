import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function valFromDb(row: Record<string, unknown>) {
  return {leadId: String(row.lead_id ?? ''), colId: String(row.col_id ?? ''), value: String(row.value ?? '')};
}

export async function GET(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const leadId = req.nextUrl.searchParams.get('lead_id');
  let query = supabaseAdmin().from('dmt_manual_extra_vals').select('*');
  if (leadId) query = query.eq('lead_id', leadId);
  const {data, error} = await query;

  if (error) return jsonError(error);
  return NextResponse.json({values: (data ?? []).map(valFromDb)});
}

export async function PUT(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const rawValues = Array.isArray(body?.values) ? body.values : [body];
  const values = rawValues
    .filter((row: Record<string, unknown> | null) => row && (row.leadId || row.lead_id) && (row.colId || row.col_id))
    .map((row: Record<string, unknown>) => ({
      lead_id: String(row.leadId ?? row.lead_id),
      col_id: String(row.colId ?? row.col_id),
      value: String(row.value ?? ''),
      updated_at: new Date().toISOString(),
    }));

  if (!values.length) return NextResponse.json({values: []});

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_extra_vals')
    .upsert(values, {onConflict: 'lead_id,col_id'})
    .select();

  if (error) return jsonError(error);
  return NextResponse.json({values: (data ?? []).map(valFromDb)});
}
