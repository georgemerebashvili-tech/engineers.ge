import {NextResponse} from 'next/server';
import {z} from 'zod';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit, truncate} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const res = await db
    .from('tbc_branch_comments')
    .select('id, author, kind, body, created_at')
    .eq('branch_id', branchId)
    .is('archived_at', null)
    .order('created_at', {ascending: false})
    .limit(200);

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({comments: res.data || []});
}

const PostBody = z.object({
  kind: z.enum(['note', 'blocker', 'info', 'done']).default('note'),
  body: z.string().min(1).max(4000)
});

export async function POST(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const ins = await db
    .from('tbc_branch_comments')
    .insert({
      branch_id: branchId,
      author: session.username,
      kind: parsed.data.kind,
      body: parsed.data.body
    })
    .select('id, author, kind, body, created_at')
    .single();

  if (ins.error) {
    console.error('[tbc] comment insert', ins.error);
    return NextResponse.json({error: 'db_error'}, {status: 500});
  }

  const kindLabel: Record<string, string> = {
    note: 'შენიშვნა',
    blocker: 'პრობლემა',
    info: 'ინფო',
    done: 'დასრულდა'
  };
  await writeAudit({
    actor: session.username,
    action: 'comment.post',
    targetType: 'comment',
    targetId: ins.data.id as number,
    summary: `დაწერა [${kindLabel[parsed.data.kind] || parsed.data.kind}] ფილიალი #${branchId}: "${truncate(parsed.data.body, 120)}"`,
    metadata: {
      branch_id: branchId,
      kind: parsed.data.kind,
      body: parsed.data.body
    }
  });

  return NextResponse.json({ok: true, comment: ins.data});
}
