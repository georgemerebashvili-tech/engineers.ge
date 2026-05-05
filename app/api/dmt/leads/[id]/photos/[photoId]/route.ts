import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, photoFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export async function GET(
  _req: NextRequest,
  {params}: {params: Promise<{id: string; photoId: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id, photoId} = await params;
  const {data, error} = await supabaseAdmin()
    .from('dmt_lead_inventory_photos')
    .select('*')
    .eq('id', photoId)
    .eq('lead_id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return jsonError(error);
  if (!data) return NextResponse.json({error: 'photo not found'}, {status: 404});
  return NextResponse.json({photo: photoFromDb(data)});
}

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string; photoId: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id, photoId} = await params;
  const body = asRecord(await req.json().catch(() => null));
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: dmtActor(auth.me)
  };

  if ('userNotes' in body || 'user_notes' in body) {
    patch.user_notes = String(body.userNotes ?? body.user_notes ?? '');
  }
  if ('matchedInventoryId' in body || 'matched_inventory_id' in body) {
    const value = String(body.matchedInventoryId ?? body.matched_inventory_id ?? '').trim();
    patch.matched_inventory_id = value || null;
  }
  if ('matchedQty' in body || 'matched_qty' in body) {
    const raw = body.matchedQty ?? body.matched_qty;
    const qty = raw === null || raw === '' || raw === undefined ? null : Number(raw);
    patch.matched_qty = qty === null || Number.isFinite(qty) ? qty : null;
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_lead_inventory_photos')
    .update(patch)
    .eq('id', photoId)
    .eq('lead_id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({photo: photoFromDb(data)});
}

export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string; photoId: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id, photoId} = await params;
  const actor = dmtActor(auth.me);
  const {data, error} = await supabaseAdmin()
    .from('dmt_lead_inventory_photos')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actor,
      updated_at: new Date().toISOString(),
      updated_by: actor
    })
    .eq('id', photoId)
    .eq('lead_id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) return jsonError(error);
  return NextResponse.json({photo: photoFromDb(data)});
}
