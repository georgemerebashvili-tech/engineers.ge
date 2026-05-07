import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  auditFromDb,
  dmtActor,
  jsonError,
  leadFromDb,
  requireDmtUser,
} from '@/lib/dmt/shared-state-server';
import {LEAD_COLUMNS} from '@/lib/dmt/leads-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  company: 'company',
  phone: 'phone',
  email: 'email',
  source: 'source',
  stage: 'stage',
  offerStatus: 'offer_status',
  labels: 'labels',
  inventoryChecked: 'inventory_checked',
  inventoryCheckedAt: 'inventory_checked_at',
  inventoryCheckedBy: 'inventory_checked_by',
  invoiceId: 'invoice_id',
  invoiceIssuedAt: 'invoice_issued_at',
  offerDecidedAt: 'offer_decided_at',
  offerDecidedBy: 'offer_decided_by',
  fromContactId: 'from_contact_id',
  owner: 'owner',
  value: 'value',
};

function labelFor(key: string) {
  return LEAD_COLUMNS[key]?.label ?? key;
}

function leadLabel(lead: Record<string, unknown>) {
  return String(lead.name || lead.company || lead.email || lead.phone || 'Lead');
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
    .from('dmt_leads')
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
    .from('dmt_leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonError(error);

  const auditRows = Object.entries(FIELD_MAP)
    .filter(([clientKey]) => clientKey in (body as Record<string, unknown>))
    .filter(([, dbKey]) => String((existing as Record<string, unknown>)[dbKey] ?? '') !== String((data as Record<string, unknown>)[dbKey] ?? ''))
    .map(([clientKey, dbKey]) => ({
      at: new Date().toISOString(),
      by: actor,
      action: 'update',
      lead_id: id,
      lead_label: leadLabel(data),
      column_key: clientKey,
      column_label: labelFor(clientKey),
      before_val: Array.isArray((existing as Record<string, unknown>)[dbKey])
        ? ((existing as Record<string, unknown>)[dbKey] as unknown[]).join(', ')
        : String((existing as Record<string, unknown>)[dbKey] ?? ''),
      after_val: Array.isArray((data as Record<string, unknown>)[dbKey])
        ? ((data as Record<string, unknown>)[dbKey] as unknown[]).join(', ')
        : String((data as Record<string, unknown>)[dbKey] ?? ''),
    }));

  const {data: auditData} = auditRows.length
    ? await db.from('dmt_leads_audit').insert(auditRows).select()
    : {data: []};

  return NextResponse.json({lead: leadFromDb(data), auditEntries: (auditData ?? []).map(auditFromDb)});
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
    .from('dmt_leads')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return NextResponse.json({error: 'not found'}, {status: 404});

  const actor = dmtActor(auth.me);
  const {error} = await db.from('dmt_leads').delete().eq('id', id);
  if (error) return jsonError(error);

  const {data: auditRow} = await db
    .from('dmt_leads_audit')
    .insert({
      at: new Date().toISOString(),
      by: actor,
      action: 'delete',
      lead_id: id,
      lead_label: leadLabel(existing),
    })
    .select()
    .single();

  return NextResponse.json({ok: true, auditEntry: auditRow ? auditFromDb(auditRow) : null});
}
