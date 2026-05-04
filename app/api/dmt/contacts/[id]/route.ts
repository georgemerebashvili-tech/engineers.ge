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

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  company: 'company',
  position: 'position',
  phone: 'phone',
  email: 'email',
  source: 'source',
  notes: 'notes',
  tags: 'tags',
};

const LABELS: Record<string, string> = {
  name: 'სახელი',
  company: 'კომპანია',
  position: 'თანამდებობა',
  phone: 'ტელეფონი',
  email: 'Email',
  source: 'წყარო',
  notes: 'შენიშვნა',
  tags: 'თეგები',
};

function contactLabel(contact: Record<string, unknown>) {
  return String(contact.name || contact.company || contact.email || contact.phone || 'Contact');
}

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'invalid body'}, {status: 400});
  }

  const db = supabaseAdmin();
  const {data: existing, error: fetchError} = await db
    .from('dmt_contacts')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const actor = dmtActor(auth.me);
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: actor,
  };
  for (const [clientKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (clientKey in (body as Record<string, unknown>)) update[dbKey] = (body as Record<string, unknown>)[clientKey];
  }

  const {data, error} = await db
    .from('dmt_contacts')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return jsonError(error);

  const auditRows = Object.entries(FIELD_MAP)
    .filter(([clientKey]) => clientKey in (body as Record<string, unknown>))
    .filter(([, dbKey]) => JSON.stringify((existing as Record<string, unknown>)[dbKey] ?? '') !== JSON.stringify((data as Record<string, unknown>)[dbKey] ?? ''))
    .map(([clientKey, dbKey]) => ({
      by: actor,
      action: 'update',
      contact_id: id,
      contact_label: contactLabel(data),
      column_key: clientKey,
      column_label: LABELS[clientKey] ?? clientKey,
      before_val: Array.isArray((existing as Record<string, unknown>)[dbKey])
        ? ((existing as Record<string, unknown>)[dbKey] as unknown[]).join(', ')
        : String((existing as Record<string, unknown>)[dbKey] ?? ''),
      after_val: Array.isArray((data as Record<string, unknown>)[dbKey])
        ? ((data as Record<string, unknown>)[dbKey] as unknown[]).join(', ')
        : String((data as Record<string, unknown>)[dbKey] ?? ''),
    }));

  const {data: auditData} = auditRows.length
    ? await db.from('dmt_contacts_audit').insert(auditRows).select()
    : {data: []};

  return NextResponse.json({contact: contactFromDb(data), auditEntries: (auditData ?? []).map(contactAuditFromDb)});
}

export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();
  const {data: existing, error: fetchError} = await db
    .from('dmt_contacts')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const actor = dmtActor(auth.me);
  const {error} = await db.from('dmt_contacts').delete().eq('id', id);
  if (error) return jsonError(error);

  const {data: auditRow} = await db
    .from('dmt_contacts_audit')
    .insert({
      by: actor,
      action: 'delete',
      contact_id: id,
      contact_label: contactLabel(existing),
    })
    .select()
    .single();

  return NextResponse.json({ok: true, auditEntry: auditRow ? contactAuditFromDb(auditRow) : null});
}
