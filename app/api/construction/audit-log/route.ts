import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '300'), 1000);
  const actor = url.searchParams.get('actor') || null;
  const action = url.searchParams.get('action') || null;

  const db = supabaseAdmin();
  let q = db
    .from('construction_audit_log')
    .select('id, actor, action, target_type, target_id, summary, ip, user_agent, created_at')
    .order('created_at', {ascending: false})
    .limit(limit);

  if (actor) q = q.ilike('actor', `%${actor}%`);
  if (action) q = q.ilike('action', `%${action}%`);

  const res = await q;
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({events: res.data || []});
}
