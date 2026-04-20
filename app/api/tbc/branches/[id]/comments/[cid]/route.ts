import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string; cid: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id, cid} = await params;
  const branchId = Number(id);
  const commentId = Number(cid);
  if (!Number.isFinite(branchId) || !Number.isFinite(commentId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  const row = await db
    .from('tbc_branch_comments')
    .select('id, author, branch_id')
    .eq('id', commentId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (!row.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  // Only author or admin can delete
  if (row.data.author !== session.username && session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const del = await db.from('tbc_branch_comments').delete().eq('id', commentId);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({ok: true});
}
