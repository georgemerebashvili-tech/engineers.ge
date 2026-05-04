import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {auditFromDb, dmtActor, jsonError, leadFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);
  const now = new Date().toISOString();
  const invoiceId = 'INV-' + Date.now();

  const {data: existing, error: fetchError} = await db.from('dmt_leads').select('*').eq('id', id).single();
  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const {data, error} = await db
    .from('dmt_leads')
    .update({invoice_id: invoiceId, invoice_issued_at: now, updated_at: now, updated_by: actor})
    .eq('id', id)
    .select()
    .single();
  if (error) return jsonError(error);

  const {data: auditRow} = await db.from('dmt_leads_audit').insert({
    by: actor,
    action: 'update',
    lead_id: id,
    lead_label: String(data.name || data.company || data.id),
    column_key: 'invoice_issued',
    column_label: 'ინვოისი',
    before_val: String(existing.invoice_id ?? ''),
    after_val: invoiceId,
  }).select().single();

  return NextResponse.json({lead: leadFromDb(data), auditEntry: auditRow ? auditFromDb(auditRow) : null});
}
