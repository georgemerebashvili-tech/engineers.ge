import {NextResponse, type NextRequest} from 'next/server';
import {runRegulationChecks} from '@/lib/regulation-sources';
import {sendRegulationChangeNotification} from '@/lib/email-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const result = await runRegulationChecks();
    void sendRegulationChangeNotification(result);
    return NextResponse.json({ok: true, ...result});
  } catch (error) {
    return NextResponse.json(
      {
        error: 'failed',
        message: error instanceof Error ? error.message : 'server error'
      },
      {status: 500}
    );
  }
}
