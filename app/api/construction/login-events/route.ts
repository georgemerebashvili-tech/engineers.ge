import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '200'), 1000);

  const db = supabaseAdmin();
  const res = await db
    .from('construction_login_events')
    .select('id, username, user_id, ip, user_agent, success, created_at')
    .order('created_at', {ascending: false})
    .limit(limit);

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({events: res.data || []});
}
