import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit, truncate} from '@/lib/tbc/audit';

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
    .select('id, author, branch_id, kind, body')
    .eq('id', commentId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (!row.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  // Only author or admin can delete
  if (row.data.author !== session.username && session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const del = await db.from('tbc_branch_comments').delete().eq('id', commentId);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeAudit({
    actor: session.username,
    action: 'comment.delete',
    targetType: 'comment',
    targetId: commentId,
    summary: `წაშალა ${row.data.author}-ის განცხადება ფილიალი #${branchId}: "${truncate(
      row.data.body as string,
      120
    )}"`,
    metadata: {
      branch_id: branchId,
      original_author: row.data.author,
      kind: row.data.kind,
      body: row.data.body
    }
  });

  return NextResponse.json({ok: true});
}
