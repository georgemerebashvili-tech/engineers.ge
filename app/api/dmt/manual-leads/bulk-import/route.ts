import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, extraColToDb, jsonError, manualLeadToDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const cols = Array.isArray(body?.extraCols) ? body.extraCols : [];
  const vals = body?.extraVals && typeof body.extraVals === 'object' ? body.extraVals : {};
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  if (rows.length) {
    const {error} = await db
      .from('dmt_manual_leads')
      .upsert(rows.map((row: Record<string, unknown>) => manualLeadToDb(row, actor)), {onConflict: 'id', ignoreDuplicates: true});
    if (error) return jsonError(error);
  }

  if (cols.length) {
    const {error} = await db
      .from('dmt_manual_extra_cols')
      .upsert(cols.map((col: Record<string, unknown>, index: number) => extraColToDb(col, index)), {onConflict: 'id', ignoreDuplicates: true});
    if (error) return jsonError(error);
  }

  const valueRows = Object.entries(vals as Record<string, Record<string, unknown>>).flatMap(([leadId, byCol]) =>
    Object.entries(byCol ?? {}).map(([colId, value]) => ({
      lead_id: leadId,
      col_id: colId,
      value: String(value ?? ''),
      updated_at: new Date().toISOString(),
    })),
  );

  if (valueRows.length) {
    const {error} = await db
      .from('dmt_manual_extra_vals')
      .upsert(valueRows, {onConflict: 'lead_id,col_id', ignoreDuplicates: true});
    if (error) return jsonError(error);
  }

  return NextResponse.json({ok: true}, {status: 201});
}
