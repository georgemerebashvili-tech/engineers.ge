import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, offerFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {calculateOfferTotals, normalizeOfferItems, offerItemsToDb} from '@/lib/dmt/offers-store';
import {insertOfferAudit, manualLeadExists, nextOfferId} from '@/lib/dmt/offers-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const leadId = req.nextUrl.searchParams.get('lead_id')?.trim();
  const db = supabaseAdmin();
  let query = db
    .from('dmt_offers')
    .select('*')
    .order('updated_at', {ascending: false});

  if (leadId) query = query.eq('lead_id', leadId);

  const {data, error} = await query;
  if (error) return jsonError(error);
  return NextResponse.json({offers: (data ?? []).map(offerFromDb)});
}

export async function POST(req: NextRequest) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const body = asRecord(await req.json().catch(() => null));
  const leadId = String(body.leadId ?? body.lead_id ?? '').trim();
  if (!leadId) return NextResponse.json({error: 'leadId is required'}, {status: 400});

  const db = supabaseAdmin();
  try {
    if (!(await manualLeadExists(db, leadId))) {
      return NextResponse.json({error: 'lead not found'}, {status: 404});
    }

    const actor = dmtActor(auth.me);
    const now = new Date().toISOString();
    const items = normalizeOfferItems(body.items);
    const rawVatRate = body.vatRate ?? body.vat_rate;
    const rawMarginPercent = body.marginPercent ?? body.margin_percent;
    const rawMarginAmountOverride = body.marginAmountOverride ?? body.margin_amount_override;
    const rawDiscountPercent = body.discountPercent ?? body.discount_percent;
    const totals = calculateOfferTotals(
      items,
      rawVatRate === null || rawVatRate === undefined ? null : Number(rawVatRate),
      rawMarginPercent === null || rawMarginPercent === undefined ? 15 : Number(rawMarginPercent),
      nullableNumber(rawMarginAmountOverride),
      nullableNumber(rawDiscountPercent)
    );
    const marginAmountOverride = nullableNumber(rawMarginAmountOverride);
    const currency = String(body.currency ?? 'GEL').trim() || 'GEL';
    const id = await nextOfferId(db);

    const {data, error} = await db
      .from('dmt_offers')
      .insert({
        id,
        lead_id: leadId,
        status: 'draft',
        items: offerItemsToDb(items),
        subtotal: totals.subtotal,
        vat_rate: totals.vatRate,
        vat_amount: totals.vatAmount,
        labor_total: totals.laborTotal,
        margin_percent: totals.marginPercent,
        margin_amount: totals.marginAmount,
        margin_amount_override: marginAmountOverride,
        discount_percent: totals.discountPercent,
        monthly_subscription: nullableNumber(body.monthlySubscription ?? body.monthly_subscription),
        subscription_regular_price: nullableNumber(body.subscriptionRegularPrice ?? body.subscription_regular_price),
        include_money_back_guarantee: body.includeMoneyBackGuarantee ?? body.include_money_back_guarantee ?? true,
        total: totals.total,
        doc_number_override: nullableNumber(body.docNumberOverride ?? body.doc_number_override),
        doc_date_override: nullableString(body.docDateOverride ?? body.doc_date_override),
        client_company: nullableString(body.clientCompany ?? body.client_company),
        client_tax_id: nullableString(body.clientTaxId ?? body.client_tax_id),
        client_contact: nullableString(body.clientContact ?? body.client_contact),
        client_phone: nullableString(body.clientPhone ?? body.client_phone),
        client_address: nullableString(body.clientAddress ?? body.client_address),
        currency,
        delivery_terms: String(body.deliveryTerms ?? body.delivery_terms ?? ''),
        payment_terms: String(body.paymentTerms ?? body.payment_terms ?? ''),
        notes: String(body.notes ?? ''),
        created_at: now,
        created_by: actor,
        updated_at: now,
        updated_by: actor
      })
      .select()
      .single();

    if (error) throw error;
    await insertOfferAudit(db, {
      actor,
      action: 'create',
      offerId: id,
      leadId,
      after: data
    });

    return NextResponse.json({offer: offerFromDb(data)}, {status: 201});
  } catch (error) {
    return jsonError(error);
  }
}
