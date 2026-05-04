import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, manualLeadFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIELD_MAP: Record<string, string> = {
  company: 'company',
  contact: 'contact',
  phone: 'phone',
  contract: 'contract',
  status: 'status',
  role: 'role',
  owner: 'owner',
  period: 'period',
  editedBy: 'edited_by',
  editedAt: 'edited_at',
  createdBy: 'created_by',
};

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

  const actor = dmtActor(auth.me);
  const update: Record<string, unknown> = {
    edited_by: String((body as Record<string, unknown>).editedBy ?? actor),
    edited_at: String((body as Record<string, unknown>).editedAt ?? new Date().toISOString()),
  };

  for (const [clientKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (clientKey in (body as Record<string, unknown>)) update[dbKey] = (body as Record<string, unknown>)[clientKey];
  }

  if (update.contract === '') update.contract = null;

  const {data, error} = await supabaseAdmin()
    .from('dmt_manual_leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({row: manualLeadFromDb(data)});
}

export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const {error} = await supabaseAdmin().from('dmt_manual_leads').delete().eq('id', id);
  if (error) return jsonError(error);
  return NextResponse.json({ok: true});
}
