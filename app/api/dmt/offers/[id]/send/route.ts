import {randomBytes} from 'crypto';
import {NextRequest, NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {dmtActor, jsonError, offerFromDb, requireDmtUser} from '@/lib/dmt/shared-state-server';
import {insertOfferAudit} from '@/lib/dmt/offers-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
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

    const shareToken = randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const {data, error} = await db
      .from('dmt_offers')
      .update({
        share_token: shareToken,
        share_token_expires_at: expiresAt,
        status: 'sent',
        sent_at: now.toISOString(),
        updated_at: now.toISOString(),
        updated_by: actor
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await insertOfferAudit(db, {
      actor,
      action: 'send',
      offerId: id,
      leadId: String(before.lead_id ?? ''),
      before,
      after: data
    });

    return NextResponse.json({
      offer: offerFromDb(data),
      publicUrl: `${req.nextUrl.origin}/offer/${shareToken}`
    });
  } catch (error) {
    return jsonError(error);
  }
}
