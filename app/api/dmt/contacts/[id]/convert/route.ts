import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  auditFromDb,
  contactAuditFromDb,
  contactFromDb,
  dmtActor,
  jsonError,
  leadFromDb,
  leadToDb,
  parseNumber,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function nextLeadId(rows: Array<{id: string}>) {
  let max = 1000;
  for (const row of rows) {
    const m = /^L-(\d+)$/.exec(row.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return 'L-' + (max + 1);
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

  const {data: ids, error: idsError} = await db.from('dmt_leads').select('id');
  if (idsError) return jsonError(idsError);

  const now = new Date().toISOString();
  const leadId = nextLeadId((ids ?? []) as Array<{id: string}>);
  const leadDraft = {
    id: leadId,
    name: contact.name,
    company: contact.company,
    phone: contact.phone,
    email: contact.email,
    source: String(body?.source ?? contact.source ?? 'manual'),
    stage: String(body?.stage ?? 'new'),
    owner: String(body?.owner ?? actor),
    value: parseNumber(body?.value, 0),
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    fromContactId: contact.id,
    offerStatus: 'offer_in_progress',
    labels: ['ახალი'],
  };

  const {data: lead, error: leadError} = await db
    .from('dmt_leads')
    .insert(leadToDb(leadDraft, actor))
    .select()
    .single();

  if (leadError) return jsonError(leadError);

  const {data: updatedContact, error: updateError} = await db
    .from('dmt_contacts')
    .update({
      converted_to_lead_id: lead.id,
      converted_at: now,
      converted_by: actor,
      updated_at: now,
      updated_by: actor,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) return jsonError(updateError);

  const [{data: contactAudit}, {data: leadAudit}] = await Promise.all([
    db
      .from('dmt_contacts_audit')
      .insert({
        by: actor,
        action: 'convert',
        contact_id: id,
        contact_label: contactLabel(contact),
        column_key: 'converted_to_lead_id',
        column_label: 'Lead',
        before_val: '',
        after_val: lead.id,
      })
      .select()
      .single(),
    db
      .from('dmt_leads_audit')
      .insert({
        by: actor,
        action: 'create',
        lead_id: lead.id,
        lead_label: String(lead.name || lead.company || lead.id),
        column_key: 'from_contact_id',
        column_label: 'Contact',
        before_val: '',
        after_val: id,
      })
      .select()
      .single(),
  ]);

  return NextResponse.json({
    contact: contactFromDb(updatedContact),
    lead: leadFromDb(lead),
    contactAuditEntry: contactAudit ? contactAuditFromDb(contactAudit) : null,
    leadAuditEntry: leadAudit ? auditFromDb(leadAudit) : null,
  });
}
