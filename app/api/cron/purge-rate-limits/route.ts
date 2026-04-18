import {NextResponse, type NextRequest} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel Cron calls this weekly. Purges stale rate-limit rows (non-locked,
// older than 30 days) via the purge_rate_limits() RPC.
// Protected by CRON_SECRET header or x-vercel-cron: 1.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const vercelCron = req.headers.get('x-vercel-cron') === '1';

  if (!vercelCron) {
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
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
