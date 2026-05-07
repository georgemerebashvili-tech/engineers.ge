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

async function nextContactId(db: ReturnType<typeof supabaseAdmin>) {
  const {data, error} = await db
    .from('dmt_contacts')
    .select('id');

  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const n = Number((row as {id?: unknown}).id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
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
  const id = String((body as {id?: unknown}).id ?? '');
  if (id && !/^[1-9][0-9]*$/.test(id)) {
    return NextResponse.json({error: 'invalid_contact_id_format'}, {status: 400});
  }

  const actor = dmtActor(auth.me);
  const db = supabaseAdmin();
  const bodyWithId = {...body, id: id || await nextContactId(db)};
  const {data, error} = await db
    .from('dmt_contacts')
    .insert(contactToDb(bodyWithId, actor))
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
