import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  contactAuditFromDb,
  contactFromDb,
  dmtActor,
  jsonError,
  leadFromDb,
  parseNumber,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function nextLeadId(db: ReturnType<typeof supabaseAdmin>) {
  const {data, error} = await db
    .from('dmt_leads')
    .select('id');

  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const n = Number((row as {id?: unknown}).id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}

function contactLabel(contact: Record<string, unknown>) {
  return String(contact.name || contact.company || contact.email || contact.phone || 'Contact');
}

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  const {data: contact, error: contactError} = await db
    .from('dmt_contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (contactError || !contact) return NextResponse.json({error: 'not found'}, {status: 404});
  if (!String(contact.company ?? '').trim()) {
    return NextResponse.json({error: 'company_required'}, {status: 400});
  }
  if (contact.converted_to_lead_id) {
    return NextResponse.json({error: 'already_converted', leadId: contact.converted_to_lead_id}, {status: 409});
  }

  const now = new Date().toISOString();
  const leadId = await nextLeadId(db);

  const leadRow = {
    id: leadId,
    name: String(contact.name ?? ''),
    company: String(contact.company ?? ''),
    phone: String(contact.phone ?? ''),
    email: String(contact.email ?? ''),
    source: typeof body?.source === 'string' && body.source ? body.source : 'manual',
    stage: typeof body?.stage === 'string' && body.stage ? body.stage : 'new',
    owner: String(body?.owner ?? actor),
    value: parseNumber(body?.value, 0),
    labels: [],
    offer_status: 'offer_in_progress',
    inventory_checked: false,
    from_contact_id: id,
    created_at: now,
    created_by: actor,
    updated_at: now,
    updated_by: actor,
  };

  const {data: lead, error: leadError} = await db
    .from('dmt_leads')
    .insert(leadRow)
    .select()
    .single();

  if (leadError) return jsonError(leadError);

  const {data: updatedContact, error: updateError} = await db
    .from('dmt_contacts')
    .update({
      converted_to_lead_id: leadId,
      converted_at: now,
      converted_by: actor,
      updated_at: now,
      updated_by: actor,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) return jsonError(updateError);

  const {data: contactAudit} = await db
    .from('dmt_contacts_audit')
    .insert({
      by: actor,
      action: 'convert',
      contact_id: id,
      contact_label: contactLabel(contact),
      column_key: 'converted_to_lead_id',
      column_label: 'Lead',
      before_val: '',
      after_val: leadId,
    })
    .select()
    .single();

  return NextResponse.json({
    contact: contactFromDb(updatedContact),
    lead: leadFromDb(lead),
    contactAuditEntry: contactAudit ? contactAuditFromDb(contactAudit) : null,
  });
}
