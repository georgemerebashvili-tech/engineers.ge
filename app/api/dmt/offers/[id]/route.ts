import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, offerFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {calculateOfferTotals, normalizeOfferItems, offerItemsToDb, type OfferStatus} from '@/lib/dmt/offers-store';
import {insertOfferAudit} from '@/lib/dmt/offers-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUS = new Set<OfferStatus>(['draft', 'sent', 'approved', 'rejected', 'cancelled']);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function auditAction(beforeStatus: string, nextStatus: string) {
  if (beforeStatus !== 'approved' && nextStatus === 'approved') return 'approve';
  if (beforeStatus !== 'rejected' && nextStatus === 'rejected') return 'reject';
  return 'update';
}

export async function GET(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const {data, error} = await supabaseAdmin()
    .from('dmt_offers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return jsonError(error);
  if (!data) return NextResponse.json({error: 'offer not found'}, {status: 404});
  return NextResponse.json({offer: offerFromDb(data)});
}

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const body = asRecord(await req.json().catch(() => null));
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  try {
    const {data: before, error: beforeError} = await db
      .from('dmt_offers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) return NextResponse.json({error: 'offer not found'}, {status: 404});

    const items = body.items === undefined
      ? normalizeOfferItems(before.items)
      : normalizeOfferItems(body.items);
    const vatRate = body.vatRate ?? body.vat_rate ?? before.vat_rate;
    const marginPercent = body.marginPercent ?? body.margin_percent ?? before.margin_percent ?? 15;
    const totals = calculateOfferTotals(
      items,
      vatRate === null || vatRate === undefined ? null : Number(vatRate),
      Number(marginPercent)
    );
    const status = String(body.status ?? before.status);
    if (!VALID_STATUS.has(status as OfferStatus)) {
      return NextResponse.json({error: 'invalid status'}, {status: 400});
    }

    const now = new Date().toISOString();
    const patch = {
      status,
      items: offerItemsToDb(items),
      subtotal: totals.subtotal,
      vat_rate: totals.vatRate,
      vat_amount: totals.vatAmount,
      labor_total: totals.laborTotal,
      margin_percent: totals.marginPercent,
      margin_amount: totals.marginAmount,
      include_money_back_guarantee: body.includeMoneyBackGuarantee ?? body.include_money_back_guarantee ?? before.include_money_back_guarantee ?? true,
      total: totals.total,
      currency: String(body.currency ?? before.currency ?? 'GEL'),
      delivery_terms: String(body.deliveryTerms ?? body.delivery_terms ?? before.delivery_terms ?? ''),
      payment_terms: String(body.paymentTerms ?? body.payment_terms ?? before.payment_terms ?? ''),
      notes: String(body.notes ?? before.notes ?? ''),
      approved_by_client: body.approvedByClient ?? body.approved_by_client ?? before.approved_by_client ?? null,
      rejection_reason: body.rejectionReason ?? body.rejection_reason ?? before.rejection_reason ?? null,
      approved_at: status === 'approved' && before.status !== 'approved' ? now : before.approved_at,
      rejected_at: status === 'rejected' && before.status !== 'rejected' ? now : before.rejected_at,
      updated_at: now,
      updated_by: actor
    };

    const {data, error} = await db
      .from('dmt_offers')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await insertOfferAudit(db, {
      actor,
      action: auditAction(String(before.status), status),
      offerId: id,
      leadId: String(before.lead_id ?? ''),
      before,
      after: data
    });

    return NextResponse.json({offer: offerFromDb(data)});
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  try {
    const {data: before, error: beforeError} = await db
      .from('dmt_offers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) return NextResponse.json({error: 'offer not found'}, {status: 404});

    const {data, error} = await db
      .from('dmt_offers')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        updated_by: actor
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await insertOfferAudit(db, {
      actor,
      action: 'delete',
      offerId: id,
      leadId: String(before.lead_id ?? ''),
      before,
      after: data,
      notes: 'soft cancelled'
    });

    return NextResponse.json({offer: offerFromDb(data)});
  } catch (error) {
    return jsonError(error);
  }
}
