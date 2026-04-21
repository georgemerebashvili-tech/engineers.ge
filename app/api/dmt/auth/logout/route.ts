import {NextResponse} from 'next/server';
import {destroyDmtSession, getCurrentDmtUser} from '@/lib/dmt/auth';
import {logDmtAudit, extractRequestMeta} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const meta = extractRequestMeta(req);
  const me = await getCurrentDmtUser();
  await destroyDmtSession();
  if (me) {
    await logDmtAudit({
      action: 'logout',
      entity_type: 'session',
      entity_id: me.id,
      actor_id: me.id,
      actor_email: me.email,
      actor_role: me.role,
      ...meta
    });
  }
  return NextResponse.json({ok: true});
}
