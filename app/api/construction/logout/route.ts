import {NextResponse} from 'next/server';
import {destroyConstructionSession, getConstructionSession} from '@/lib/construction/auth';
import {writeConstructionAudit} from '@/lib/construction/audit';

export async function POST() {
  const s = await getConstructionSession();
  await destroyConstructionSession();
  if (s) {
    await writeConstructionAudit({
      actor: s.username,
      action: 'logout',
      summary: `${s.displayName || s.username} გავიდა`
    });
  }
  return NextResponse.json({ok: true});
}
