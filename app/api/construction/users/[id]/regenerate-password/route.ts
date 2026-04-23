import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import bcrypt from 'bcryptjs';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit} from '@/lib/construction/audit';
import {generateConstructionPassword, sendConstructionOnboardingEmail} from '@/lib/construction/otp-password';

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
  const row = await db.from('construction_users').select('id, username, email, display_name, is_static').eq('id', id).maybeSingle();
  if (!row.data) return NextResponse.json({error: 'not_found'}, {status: 404});
  if (row.data.is_static) return NextResponse.json({error: 'static_admin_locked'}, {status: 403});
  if (!row.data.email) return NextResponse.json({error: 'no_email'}, {status: 400});

  const tempPassword = generateConstructionPassword();
  const hash = await bcrypt.hash(tempPassword, 10);
  const upd = await db.from('construction_users').update({password_hash: hash}).eq('id', id);
  if (upd.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host') || 'engineers.ge';
  const loginUrl = `${proto}://${host}/construction`;

  const mail = await sendConstructionOnboardingEmail({
    to: row.data.email as string,
    username: row.data.username as string,
    displayName: (row.data.display_name as string) || null,
    tempPassword,
    loginUrl
  });

  await writeConstructionAudit({
    actor: session.username,
    action: 'user.regenerate_password',
    targetType: 'user',
    targetId: id,
    summary: `ახალი პაროლი ${row.data.username}-სთვის + ${mail.ok ? 'მეილი გაიგზავნა' : 'მეილი ვერ გაიგზავნა'}`,
    metadata: {username: row.data.username, email: row.data.email, email_sent: mail.ok}
  });

  return NextResponse.json({
    ok: true,
    email_sent: mail.ok,
    stubbed: 'stubbed' in mail ? mail.stubbed : false,
    temp_password: 'stubbed' in mail && mail.stubbed ? tempPassword : undefined
  });
}
