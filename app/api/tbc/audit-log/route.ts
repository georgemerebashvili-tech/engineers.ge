import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const url = new URL(req.url);
  const limit = Math.min(
    500,
    Math.max(1, parseInt(url.searchParams.get('limit') || '200', 10))
  );
  const actor = url.searchParams.get('actor')?.trim().toLowerCase() || null;
  const actionPrefix = url.searchParams.get('action') || null;

  const db = supabaseAdmin();
  let q = db
    .from('tbc_audit_log')
    .select(
      'id, actor, action, target_type, target_id, summary, metadata, ip, user_agent, created_at'
    )
    .order('created_at', {ascending: false})
    .limit(limit);

  if (actor) q = q.eq('actor', actor);
  if (actionPrefix) q = q.ilike('action', actionPrefix + '%');

  const res = await q;
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({events: res.data || []});
}
