import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Public endpoint — no auth required; token authenticates the supplier
export async function GET(_req: Request, {params}: {params: {token: string}}) {
  const db = supabaseAdmin();

  const {data: invite, error} = await db
    .from('construction_tender_invites')
    .select(`
      id, token, status, sent_at, submitted_at,
      project:construction_procurement_projects(
        id, project_no, name, notes, drive_url,
        items:construction_procurement_items(id, sort_order, name, unit, qty, labor_note)
      ),
      contact:construction_contacts(id, name, company)
    `)
    .eq('token', params.token)
    .single();

  if (error || !invite) return NextResponse.json({error: 'not_found'}, {status: 404});

  // mark as viewed if pending
  if (invite.status === 'pending') {
    await db.from('construction_tender_invites')
      .update({status: 'viewed', viewed_at: new Date().toISOString()})
      .eq('token', params.token);
  }

  // fetch existing bids for this contact
  const project = (Array.isArray(invite.project) ? invite.project[0] : invite.project) as {id: string; items: {id: string}[]};
  const contact = (Array.isArray(invite.contact) ? invite.contact[0] : invite.contact) as {id: string};
  const itemIds = (project?.items ?? []).map((i: {id: string}) => i.id);

  const {data: bids} = itemIds.length
    ? await db.from('construction_procurement_bids')
        .select('item_id, product_price, install_price')
        .eq('contact_id', contact.id)
        .in('item_id', itemIds)
    : {data: []};

  return NextResponse.json({invite, bids: bids ?? []});
}
