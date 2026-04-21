import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {runRegulationChecks} from '@/lib/regulation-sources';
import {sendRegulationChangeNotification} from '@/lib/email-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  try {
    const result = await runRegulationChecks();
    void sendRegulationChangeNotification(result);
    await logAdminAction({
      actor: session.user,
      action: 'regulations.run',
      target_type: 'regulation_sources',
      metadata: result,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true, result});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error';
    const missingTable = /regulation_sources|relation .* does not exist/i.test(message);
    return NextResponse.json(
      {
        error: 'failed',
        message,
        hint: missingTable
          ? 'გაუშვი migration: supabase/migrations/0027_regulation_sources.sql'
          : undefined
      },
      {status: 500}
    );
  }
}
