import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  issueTbcResetToken,
  sendTbcResetEmail
} from '@/lib/tbc/password-reset';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin')
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const db = supabaseAdmin();
  const row = await db
    .from('tbc_users')
    .select('id, username, email, display_name, active')
    .eq('id', id)
    .maybeSingle();

  if (!row.data) return NextResponse.json({error: 'not_found'}, {status: 404});
  if (!row.data.email)
    return NextResponse.json({error: 'no_email'}, {status: 400});

  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null;

  const {token} = await issueTbcResetToken({
    userId: row.data.id as string,
    email: row.data.email as string,
    ip,
    createdBy: session.username
  });

  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host') || 'engineers.ge';
  const resetUrl = `${proto}://${host}/tbc/reset-password?token=${encodeURIComponent(token)}`;

  const send = await sendTbcResetEmail({
    to: row.data.email as string,
    username: row.data.username as string,
    displayName: (row.data.display_name as string) || null,
    resetUrl
  });

  return NextResponse.json({
    ok: true,
    emailSent: send.ok,
    stubbed: 'stubbed' in send ? send.stubbed : false,
    resetUrl: send.ok && 'stubbed' in send && send.stubbed ? resetUrl : undefined
  });
}
