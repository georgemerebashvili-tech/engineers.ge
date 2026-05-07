import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, manualLeadFromDb, offerFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {calculateOfferPdfTotals, renderOfferPdf} from '@/lib/dmt/pdf/offer-template';
import {insertOfferAudit} from '@/lib/dmt/offers-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'dmt-offers-pdfs';

async function ensureDocNumber(db: ReturnType<typeof supabaseAdmin>, offerRow: Record<string, unknown>) {
  if (offerRow.doc_number_override !== null && offerRow.doc_number_override !== undefined) {
    return Number(offerRow.doc_number_override);
  }

  if (offerRow.doc_number !== null && offerRow.doc_number !== undefined) {
    return Number(offerRow.doc_number);
  }

  const {data, error} = await db.rpc('dmt_next_offer_doc_number');
  if (error) throw error;
  return Number(data);
}

export async function POST(
  _req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {id} = await params;
  const db = supabaseAdmin();
  const actor = dmtActor(auth.me);

  try {
    const {data: offerRow, error: offerError} = await db
      .from('dmt_offers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (offerError) throw offerError;
    if (!offerRow) return NextResponse.json({error: 'offer not found'}, {status: 404});

    const {data: leadRow, error: leadError} = await db
      .from('dmt_manual_leads')
      .select('*')
      .eq('id', String(offerRow.lead_id ?? ''))
      .maybeSingle();
    if (leadError) throw leadError;
    if (!leadRow) return NextResponse.json({error: 'lead not found'}, {status: 404});

    const docNumber = await ensureDocNumber(db, offerRow);
    const baseOffer = offerFromDb({...offerRow, doc_number: docNumber});
    const totals = calculateOfferPdfTotals(baseOffer);
    const docDate = String(offerRow.doc_date_override ?? offerRow.doc_date ?? new Date().toISOString().slice(0, 10));
    const lead = manualLeadFromDb(leadRow);

    const rendered = await renderOfferPdf({
      offer: {
        ...baseOffer,
        docNumber,
        docDate,
        laborTotal: totals.laborTotal,
        marginAmount: totals.marginAmount,
        total: totals.grandTotal
      },
      lead: {
        id: lead.id,
        company: lead.company,
        contact: lead.contact,
        phone: lead.phone
      },
      docNumber,
      docDate
    });

    const path = `offers/${id}.pdf`;
    const bytes = Buffer.from(rendered.bytes);
    const {error: uploadError} = await db.storage
      .from(BUCKET)
      .upload(path, bytes, {contentType: 'application/pdf', upsert: true});
    if (uploadError) throw uploadError;

    const {data: urlData} = db.storage.from(BUCKET).getPublicUrl(path);
    const now = new Date().toISOString();
    const {data: updated, error: updateError} = await db
      .from('dmt_offers')
      .update({
        doc_number: docNumber,
        doc_date: docDate,
        subtotal: totals.subtotal,
        labor_total: totals.laborTotal,
        margin_percent: totals.marginPercent,
        margin_amount: totals.marginAmount,
        total: totals.grandTotal,
        pdf_url: urlData.publicUrl,
        pdf_generated_at: now,
        pdf_generated_by: actor,
        pdf_doc_size_bytes: bytes.length,
        updated_at: now,
        updated_by: actor
      })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    await insertOfferAudit(db, {
      actor,
      action: 'generate_pdf',
      offerId: id,
      leadId: String(offerRow.lead_id ?? ''),
      before: offerRow,
      after: updated,
      notes: `PDF generated: SOP.8.2.5.COFR.${docNumber}`
    });

    return NextResponse.json({
      offer: offerFromDb(updated),
      pdfUrl: urlData.publicUrl,
      docNumber,
      total: totals.grandTotal
    }, {status: 201});
  } catch (error) {
    return jsonError(error);
  }
}
