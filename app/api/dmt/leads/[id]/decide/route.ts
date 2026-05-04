import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {auditFromDb, dmtActor, jsonError, leadFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = await req.json().catch(() => ({}));
  const outcome = body?.outcome === 'accepted' ? 'accepted' : body?.outcome === 'rejected' ? 'rejected' : null;
  if (!outcome) return NextResponse.json({error: 'invalid outcome'}, {status: 400});

  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);
  const {data: existing, error: fetchError} = await db.from('dmt_leads').select('*').eq('id', id).single();
  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  if (outcome === 'accepted') {
    const missing = [
      existing.inventory_checked ? '' : 'inventory',
      existing.invoice_id ? '' : 'invoice',
    ].filter(Boolean);
    if (missing.length) return NextResponse.json({error: 'workflow_incomplete', missing}, {status: 400});
  }

  const now = new Date().toISOString();
  const offerStatus = outcome === 'accepted' ? 'offer_accepted' : 'offer_rejected';
  const {data, error} = await db
    .from('dmt_leads')
    .update({offer_status: offerStatus, offer_decided_at: now, offer_decided_by: actor, updated_at: now, updated_by: actor})
    .eq('id', id)
    .select()
    .single();
  if (error) return jsonError(error);

  const {data: auditRow} = await db.from('dmt_leads_audit').insert({
    by: actor,
    action: 'update',
    lead_id: id,
    lead_label: String(data.name || data.company || data.id),
    column_key: 'offer_status',
    column_label: 'სტატუსი',
    before_val: String(existing.offer_status ?? 'offer_in_progress'),
    after_val: offerStatus,
  }).select().single();

  return NextResponse.json({lead: leadFromDb(data), auditEntry: auditRow ? auditFromDb(auditRow) : null});
}
