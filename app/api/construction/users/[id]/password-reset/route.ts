import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {issueConstructionResetToken, sendConstructionResetEmail} from '@/lib/construction/password-reset';
import {writeConstructionAudit} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const db = supabaseAdmin();
  const row = await db.from('construction_users').select('id, username, email, display_name').eq('id', id).maybeSingle();
  if (!row.data) return NextResponse.json({error: 'not_found'}, {status: 404});
  if (!row.data.email) return NextResponse.json({error: 'no_email'}, {status: 400});

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host') || 'engineers.ge';

  const {token} = await issueConstructionResetToken({
    userId: row.data.id as string,
    email: row.data.email as string,
    ip,
    createdBy: session.username
  });

  const resetUrl = `${proto}://${host}/construction/reset-password?token=${encodeURIComponent(token)}`;

  const mail = await sendConstructionResetEmail({
    to: row.data.email as string,
    username: row.data.username as string,
    displayName: (row.data.display_name as string) || null,
    resetUrl
  });

  await writeConstructionAudit({
    actor: session.username,
    action: 'password_reset.admin_send',
    targetType: 'user',
    targetId: id,
    summary: `ადმინმა გაუგზავნა reset ბმული ${row.data.username}-ს`,
    metadata: {email_sent: mail.ok}
  });

  return NextResponse.json({
    ok: true,
    stubbed: 'stubbed' in mail ? mail.stubbed : false,
    resetUrl: 'stubbed' in mail && mail.stubbed ? resetUrl : undefined
  });
}
