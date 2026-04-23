import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {sendTenderAnnouncementEmail} from '@/lib/construction/procurement-email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, {params}: {params: {id: string}}) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({error: 'bad_request'}, {status: 400}); }

  const contact_ids = body.contact_ids as string[];
  if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
    return NextResponse.json({error: 'contact_ids required'}, {status: 400});
  }

  const db = supabaseAdmin();

  const [{data: project, error: pErr}, {data: contacts, error: cErr}, {count: itemCount}] = await Promise.all([
    db.from('construction_procurement_projects')
      .select('id, project_no, name')
      .eq('id', params.id)
      .single(),
    db.from('construction_contacts')
      .select('id, name, email')
      .in('id', contact_ids),
    db.from('construction_procurement_items')
      .select('id', {count: 'exact', head: true})
      .eq('project_id', params.id)
  ]);

  if (pErr || !project) return NextResponse.json({error: 'project_not_found'}, {status: 404});
  if (cErr) return NextResponse.json({error: 'db_error'}, {status: 500});

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://engineers.ge';
  const results: {contactId: string; name: string; email: string | null; status: 'sent' | 'no_email' | 'failed'}[] = [];

  for (const contact of contacts ?? []) {
    if (!contact.email) {
      results.push({contactId: contact.id, name: contact.name, email: null, status: 'no_email'});
      continue;
    }

    // upsert invite record (reset if re-sent)
    const {data: invite, error: iErr} = await db
      .from('construction_tender_invites')
      .upsert({
        project_id: params.id,
        contact_id: contact.id,
        status: 'pending',
        sent_at: new Date().toISOString()
      }, {onConflict: 'project_id,contact_id'})
      .select('token')
      .single();

    if (iErr || !invite) {
      results.push({contactId: contact.id, name: contact.name, email: contact.email, status: 'failed'});
      continue;
    }

    const tenderUrl = `${baseUrl}/construction/tender/${invite.token}`;
    const emailRes = await sendTenderAnnouncementEmail({
      to: contact.email,
      contactName: contact.name,
      projectNo: project.project_no || params.id.slice(0, 8),
      projectName: project.name,
      itemCount: itemCount ?? 0,
      tenderUrl,
      senderName: session.displayName || session.username
    });

    results.push({
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      status: emailRes.ok ? 'sent' : 'failed'
    });
  }

  // mark project as open if it's still draft
  await db.from('construction_procurement_projects')
    .update({status: 'open', updated_at: new Date().toISOString()})
    .eq('id', params.id)
    .eq('status', 'draft');

  return NextResponse.json({results});
}
