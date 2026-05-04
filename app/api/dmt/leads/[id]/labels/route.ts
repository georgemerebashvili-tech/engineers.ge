import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {auditFromDb, dmtActor, jsonError, leadFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = await req.json().catch(() => ({}));
  const labels = Array.isArray(body?.labels)
    ? [...new Set(body.labels.map((label: unknown) => String(label).trim()).filter(Boolean))]
    : [];

  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);
  const {data: existing, error: fetchError} = await db.from('dmt_leads').select('*').eq('id', id).single();
  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const now = new Date().toISOString();
  const {data, error} = await db
    .from('dmt_leads')
    .update({labels, updated_at: now, updated_by: actor})
    .eq('id', id)
    .select()
    .single();
  if (error) return jsonError(error);

  if (labels.length) {
    await db.from('dmt_lead_label_suggestions').upsert(
      labels.map((label) => ({label, use_count: 1, updated_at: now})),
      {onConflict: 'label'},
    );
  }

  const {data: auditRow} = await db.from('dmt_leads_audit').insert({
    by: actor,
    action: 'update',
    lead_id: id,
    lead_label: String(data.name || data.company || data.id),
    column_key: 'labels',
    column_label: 'იარლიყები',
    before_val: Array.isArray(existing.labels) ? existing.labels.join(', ') : '',
    after_val: labels.join(', '),
  }).select().single();

  return NextResponse.json({lead: leadFromDb(data), auditEntry: auditRow ? auditFromDb(auditRow) : null});
}
