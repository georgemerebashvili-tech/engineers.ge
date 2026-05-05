import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  contactAuditFromDb,
  contactFromDb,
  dmtActor,
  jsonError,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function contactLabel(contact: Record<string, unknown>) {
  return String(contact.name || contact.company || contact.email || contact.phone || 'Contact');
}

export async function POST(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  const {data: contact, error: contactError} = await db
    .from('dmt_contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (contactError || !contact) return NextResponse.json({error: 'not found'}, {status: 404});

  const leadId = contact.converted_to_lead_id;
  if (!leadId) {
    return NextResponse.json({error: 'not_converted'}, {status: 400});
  }

  const {error: deleteError} = await db
    .from('dmt_manual_leads')
    .delete()
    .eq('id', leadId);

  if (deleteError) return jsonError(deleteError);

  const now = new Date().toISOString();
  const {data: updatedContact, error: updateError} = await db
    .from('dmt_contacts')
    .update({
      converted_to_lead_id: null,
      converted_at: null,
      converted_by: null,
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
      action: 'update',
      contact_id: id,
      contact_label: contactLabel(contact),
      column_key: 'converted_to_lead_id',
      column_label: 'Lead',
      before_val: String(leadId),
      after_val: '',
    })
    .select()
    .single();

  return NextResponse.json({
    contact: contactFromDb(updatedContact),
    deletedLeadId: leadId,
    contactAuditEntry: contactAudit ? contactAuditFromDb(contactAudit) : null,
  });
}
