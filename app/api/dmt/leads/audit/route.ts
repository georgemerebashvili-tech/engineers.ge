import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {auditFromDb, dmtActor, jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_leads_audit')
    .select('*')
    .order('at', {ascending: false})
    .limit(500);

  if (error) return jsonError(error);
  return NextResponse.json({audit: (data ?? []).map(auditFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const actor = dmtActor(auth.me);
  const row = body as Record<string, unknown>;
  const {data, error} = await supabaseAdmin()
    .from('dmt_leads_audit')
    .insert({
      at: String(row.at ?? new Date().toISOString()),
      by: String(row.by ?? actor),
      action: String(row.action ?? 'update'),
      lead_id: String(row.leadId ?? row.lead_id ?? ''),
      lead_label: String(row.leadLabel ?? row.lead_label ?? ''),
      column_key: row.column ? String(row.column) : null,
      column_label: row.columnLabel ? String(row.columnLabel) : null,
      before_val: row.before === undefined ? null : String(row.before),
      after_val: row.after === undefined ? null : String(row.after),
    })
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({entry: auditFromDb(data)}, {status: 201});
}
