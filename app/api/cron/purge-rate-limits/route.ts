import {NextResponse, type NextRequest} from 'next/server';
import {isAuthorizedCron} from '@/lib/cron-auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel Cron calls this weekly. Purges stale rate-limit rows (non-locked,
// older than 30 days) via the purge_rate_limits() RPC.
// Protected by CRON_SECRET (see lib/cron-auth.ts).
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  try {
    const {data, error} = await supabaseAdmin().rpc('purge_rate_limits');
    if (error) throw error;
    return NextResponse.json({ok: true, purged: data ?? 0});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server error'},
      {status: 500}
    );
  }
}
