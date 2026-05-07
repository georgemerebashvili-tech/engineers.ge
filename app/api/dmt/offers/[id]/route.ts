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

function nullableString(value: unknown) {
  const next = typeof value === 'string' ? value.trim() : '';
  return next || null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function bodyValue(body: Record<string, unknown>, camel: string, snake: string, fallback: unknown) {
  if (Object.prototype.hasOwnProperty.call(body, camel)) return body[camel];
  if (Object.prototype.hasOwnProperty.call(body, snake)) return body[snake];
  return fallback;
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
    const marginAmountOverride = bodyValue(body, 'marginAmountOverride', 'margin_amount_override', before.margin_amount_override);
    const discountPercent = bodyValue(body, 'discountPercent', 'discount_percent', before.discount_percent);
    const totals = calculateOfferTotals(
      items,
      vatRate === null || vatRate === undefined ? null : Number(vatRate),
      Number(marginPercent),
      nullableNumber(marginAmountOverride),
      nullableNumber(discountPercent)
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
      margin_amount_override: nullableNumber(marginAmountOverride),
      discount_percent: totals.discountPercent,
      monthly_subscription: nullableNumber(bodyValue(body, 'monthlySubscription', 'monthly_subscription', before.monthly_subscription)),
      subscription_regular_price: nullableNumber(bodyValue(body, 'subscriptionRegularPrice', 'subscription_regular_price', before.subscription_regular_price)),
      include_money_back_guarantee: body.includeMoneyBackGuarantee ?? body.include_money_back_guarantee ?? before.include_money_back_guarantee ?? true,
      total: totals.total,
      doc_number_override: nullableNumber(bodyValue(body, 'docNumberOverride', 'doc_number_override', before.doc_number_override)),
      doc_date_override: nullableString(bodyValue(body, 'docDateOverride', 'doc_date_override', before.doc_date_override)),
      client_company: nullableString(bodyValue(body, 'clientCompany', 'client_company', before.client_company)),
      client_tax_id: nullableString(bodyValue(body, 'clientTaxId', 'client_tax_id', before.client_tax_id)),
      client_contact: nullableString(bodyValue(body, 'clientContact', 'client_contact', before.client_contact)),
      client_phone: nullableString(bodyValue(body, 'clientPhone', 'client_phone', before.client_phone)),
      client_address: nullableString(bodyValue(body, 'clientAddress', 'client_address', before.client_address)),
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
