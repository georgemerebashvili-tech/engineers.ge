import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  contactAuditFromDb,
  contactFromDb,
  contactToDb,
  dmtActor,
  jsonError,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function label(contact: Record<string, unknown>) {
  return String(contact.name || contact.company || contact.email || contact.phone || 'Contact');
}

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_contacts')
    .select('*')
    .order('updated_at', {ascending: false});

  if (error) return jsonError(error);
  return NextResponse.json({contacts: (data ?? []).map(contactFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const actor = dmtActor(auth.me);
  const db = supabaseAdmin();
  const {data, error} = await db
    .from('dmt_contacts')
    .insert(contactToDb(body, actor))
    .select()
    .single();

  if (error) return jsonError(error);

  const {data: auditRow} = await db
    .from('dmt_contacts_audit')
    .insert({
      by: actor,
      action: 'create',
      contact_id: data.id,
      contact_label: label(data),
    })
    .select()
    .single();

  return NextResponse.json(
    {contact: contactFromDb(data), auditEntry: auditRow ? contactAuditFromDb(auditRow) : null},
    {status: 201},
  );
}
