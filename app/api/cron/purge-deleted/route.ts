import {NextResponse, type NextRequest} from 'next/server';
import {purgeExpiredSoftDeletes} from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel Cron calls this daily. Purges users + referral_contacts whose
// deleted_at is older than 10 days. Protected by CRON_SECRET header.
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
    const result = await purgeExpiredSoftDeletes();
    return NextResponse.json({ok: true, result});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server error'},
      {status: 500}
    );
  }
}
