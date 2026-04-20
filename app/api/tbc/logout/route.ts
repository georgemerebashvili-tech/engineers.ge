import {NextResponse} from 'next/server';
import {destroyTbcSession, getTbcSession} from '@/lib/tbc/auth';
import {writeAudit} from '@/lib/tbc/audit';

export async function POST() {
  const s = await getTbcSession();
  await destroyTbcSession();
  if (s) {
    await writeAudit({
      actor: s.username,
      action: 'logout',
      summary: `${s.displayName || s.username} გავიდა`
    });
  }
  return NextResponse.json({ok: true});
}
