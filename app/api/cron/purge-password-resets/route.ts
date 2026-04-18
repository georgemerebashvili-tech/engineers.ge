import {NextResponse, type NextRequest} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Weekly cron: purge consumed/expired password reset tokens.
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
    const {data, error} = await supabaseAdmin().rpc('purge_password_reset_tokens');
    if (error) throw error;
    return NextResponse.json({ok: true, purged: data ?? 0});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server error'},
      {status: 500}
    );
  }
}
