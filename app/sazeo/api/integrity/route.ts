import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  const db = supabaseAdmin();

  const {data, error, count} = await db
    .from('sazeo_events_integrity')
    .select('id, developer_id, session_id, ts_server, prev_hash, expected_prev', {
      count: 'exact'
    })
    .eq('ok', false)
    .order('id', {ascending: false})
    .limit(200);

  if (error) {
    return NextResponse.json({error: error.message}, {status: 500});
  }

  return NextResponse.json({
    broken_count: count ?? 0,
    broken: data ?? []
  });
}
