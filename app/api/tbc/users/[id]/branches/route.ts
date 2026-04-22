import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

// GET — list branch ids the given user is allowed to see (via tbc_branch_permissions).
// Response: {wildcard: boolean, branchIds: number[]}
export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const db = supabaseAdmin();

  const user = await db
    .from('tbc_users')
    .select('id, username')
    .eq('id', id)
    .maybeSingle();
  if (!user.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  const res = await db
    .from('tbc_branch_permissions')
    .select('branch_id')
    .eq('user_id', id);
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const rows = res.data || [];
  const wildcard = rows.some((r) => r.branch_id === null);
  const branchIds = rows
    .map((r) => r.branch_id)
    .filter((v): v is number => typeof v === 'number');

  return NextResponse.json({wildcard, branchIds});
}

const PutBody = z.object({
  wildcard: z.boolean().optional().default(false),
  branchIds: z.array(z.number().int()).default([])
});

// PUT — replace the user's branch access set.
export async function PUT(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', details: parsed.error.flatten()},
      {status: 400}
    );
  }

  const db = supabaseAdmin();
  const user = await db
    .from('tbc_users')
    .select('id, username')
    .eq('id', id)
    .maybeSingle();
  if (!user.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  // Replace set: delete existing, then insert new rows.
  const del = await db.from('tbc_branch_permissions').delete().eq('user_id', id);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const rows: Array<{
    user_id: string;
    branch_id: number | null;
    can_edit: boolean;
    created_by: string;
  }> = [];
  if (parsed.data.wildcard) {
    rows.push({user_id: id, branch_id: null, can_edit: false, created_by: session.username});
  } else {
    const uniqueIds = Array.from(new Set(parsed.data.branchIds));
    for (const bid of uniqueIds) {
      rows.push({user_id: id, branch_id: bid, can_edit: false, created_by: session.username});
    }
  }

  if (rows.length > 0) {
    const ins = await db.from('tbc_branch_permissions').insert(rows);
    if (ins.error) {
      console.error('[tbc user-branches] insert', ins.error);
      return NextResponse.json({error: 'db_error'}, {status: 500});
    }
  }

  await writeAudit({
    actor: session.username,
    action: 'user.branch_access',
    targetType: 'user',
    targetId: id,
    summary: parsed.data.wildcard
      ? `"${user.data.username}"-ს მიანიჭა წვდომა ყველა ფილიალზე`
      : `"${user.data.username}"-ს ფილიალების წვდომა: ${rows.length} ფილიალი`,
    metadata: {
      username: user.data.username,
      wildcard: parsed.data.wildcard,
      branch_count: rows.length,
      branch_ids: parsed.data.wildcard ? 'ALL' : parsed.data.branchIds
    }
  });

  return NextResponse.json({
    ok: true,
    wildcard: parsed.data.wildcard,
    branchIds: parsed.data.wildcard ? [] : Array.from(new Set(parsed.data.branchIds))
  });
}
