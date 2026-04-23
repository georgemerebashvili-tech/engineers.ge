import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type BidInput = {item_id: string; product_price?: number | null; install_price?: number | null};

export async function POST(req: Request, {params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  let body: {bids: BidInput[]};
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const db = supabaseAdmin();

  const {data: invite, error} = await db
    .from('construction_tender_invites')
    .select('id, contact_id, project_id, status')
    .eq('token', token)
    .single();

  if (error || !invite) return NextResponse.json({error: 'not_found'}, {status: 404});

  const bids = body.bids ?? [];
  if (bids.length === 0) return NextResponse.json({error: 'no_bids'}, {status: 400});

  const rows = bids.map((b) => ({
    project_id: invite.project_id,
    item_id: b.item_id,
    contact_id: invite.contact_id,
    product_price: b.product_price ?? null,
    install_price: b.install_price ?? null,
    updated_at: new Date().toISOString()
  }));

  const {error: bidErr} = await db
    .from('construction_procurement_bids')
    .upsert(rows, {onConflict: 'item_id,contact_id'});

  if (bidErr) return NextResponse.json({error: 'db_error'}, {status: 500});

  await db.from('construction_tender_invites')
    .update({status: 'submitted', submitted_at: new Date().toISOString()})
    .eq('token', token);

  return NextResponse.json({ok: true});
}
