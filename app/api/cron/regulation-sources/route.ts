import {NextResponse, type NextRequest} from 'next/server';
import {isAuthorizedCron} from '@/lib/cron-auth';
import {runRegulationChecks} from '@/lib/regulation-sources';
import {sendRegulationChangeNotification} from '@/lib/email-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
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
