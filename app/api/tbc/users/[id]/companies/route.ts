import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';

// GET — list company ids the given user is allowed to see.
// Response: {wildcard: boolean, companyIds: number[]}
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
    .from('tbc_user_company_access')
    .select('company_id')
    .eq('user_id', id);
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const rows = res.data || [];
  const wildcard = rows.some((r) => r.company_id === null);
  const companyIds = rows
    .map((r) => r.company_id)
    .filter((v): v is number => v !== null);

  return NextResponse.json({wildcard, companyIds});
}

const PutBody = z.object({
  wildcard: z.boolean().optional().default(false),
  companyIds: z.array(z.number().int().positive()).default([])
});

// PUT — replace the user's company access set.
// Body: {wildcard: boolean, companyIds: number[]}
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
  const del = await db.from('tbc_user_company_access').delete().eq('user_id', id);
  if (del.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const rows: Array<{user_id: string; company_id: number | null; created_by: string}> = [];
  if (parsed.data.wildcard) {
    rows.push({user_id: id, company_id: null, created_by: session.username});
  } else {
    const uniqueIds = Array.from(new Set(parsed.data.companyIds));
    for (const cid of uniqueIds) {
      rows.push({user_id: id, company_id: cid, created_by: session.username});
    }
  }

  if (rows.length > 0) {
    const ins = await db.from('tbc_user_company_access').insert(rows);
    if (ins.error) {
      console.error('[tbc user-companies] insert', ins.error);
      return NextResponse.json({error: 'db_error'}, {status: 500});
    }
  }

  await writeAudit({
    actor: session.username,
    action: 'user.company_access',
    targetType: 'user',
    targetId: id,
    summary: parsed.data.wildcard
      ? `"${user.data.username}"-ს მიანიჭა წვდომა ყველა კომპანიაზე`
      : `"${user.data.username}"-ს კომპანიების წვდომა: ${rows.length} კომპანია`,
    metadata: {
      username: user.data.username,
      wildcard: parsed.data.wildcard,
      company_count: rows.length,
      company_ids: parsed.data.wildcard ? 'ALL' : parsed.data.companyIds
    }
  });

  return NextResponse.json({
    ok: true,
    wildcard: parsed.data.wildcard,
    companyIds: parsed.data.wildcard ? [] : Array.from(new Set(parsed.data.companyIds))
  });
}
