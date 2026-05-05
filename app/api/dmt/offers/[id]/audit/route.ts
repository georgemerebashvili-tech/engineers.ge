import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, offerAuditFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {insertOfferAudit, type OfferAuditAction} from '@/lib/dmt/offers-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS = new Set<OfferAuditAction>(['create', 'update', 'send', 'approve', 'reject', 'delete', 'generate_pdf']);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = asRecord(await req.json().catch(() => null));
  const db = supabaseAdmin();

  try {
    const {data: offer, error: offerError} = await db
      .from('dmt_offers')
      .select('id, lead_id')
      .eq('id', id)
      .maybeSingle();
    if (offerError) throw offerError;
    if (!offer) return NextResponse.json({error: 'offer not found'}, {status: 404});

    const action = ACTIONS.has(String(body.action) as OfferAuditAction)
      ? String(body.action) as OfferAuditAction
      : 'update';
    const audit = await insertOfferAudit(db, {
      actor: dmtActor(auth.me),
      action,
      offerId: id,
      leadId: String(offer.lead_id ?? ''),
      notes: String(body.notes ?? '')
    });

    return NextResponse.json({audit: offerAuditFromDb(audit)}, {status: 201});
  } catch (error) {
    return jsonError(error);
  }
}
