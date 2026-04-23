import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string; cid: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id, cid} = await params;
  const siteId = parseInt(id, 10);
  const commentId = parseInt(cid, 10);
  if (isNaN(siteId) || isNaN(commentId)) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const db = supabaseAdmin();
  const {data: comment} = await db
    .from('construction_site_comments')
    .select('id, author, site_id')
    .eq('id', commentId)
    .eq('site_id', siteId)
    .maybeSingle();

  if (!comment) return NextResponse.json({error: 'not_found'}, {status: 404});

  const isOwner = (session.displayName || session.username) === comment.author;
  if (session.role !== 'admin' && !isOwner) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const {error} = await db
    .from('construction_site_comments')
    .delete()
    .eq('id', commentId);

  if (error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
