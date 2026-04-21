import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {
  isRecoveryEmail,
  issueAdminResetToken,
  sendAdminResetEmail
} from '@/lib/admin-password-reset';
import {checkMinGap, stampAttempt} from '@/lib/rate-limit';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({email: z.string().email().max(200)});
const MIN_GAP_MS = 120_000; // 2 min between reset requests per email

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const email = body.email.toLowerCase().trim();

  const gate = await checkMinGap('verify_resend', `admin-reset:${email}`, MIN_GAP_MS);
  if (!gate.allowed) {
    return NextResponse.json(
      {error: 'throttled', wait_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  // Enumeration-safe: always 200 regardless of match — but only actually
  // issue + send when the submitted email equals ADMIN_RECOVERY_EMAIL.
  try {
    if (isRecoveryEmail(email)) {
      const ip = getIp(req.headers);
      const {token} = await issueAdminResetToken(email, ip);
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;
      const resetUrl = `${origin}/admin/reset?token=${encodeURIComponent(token)}`;
      await sendAdminResetEmail({to: email, resetUrl});
      await logAdminAction({
        actor: 'anonymous',
        action: 'admin.password_reset_request',
        target_type: 'admin_password_reset_tokens',
        target_id: email,
        metadata: {},
        ip
      });
    }
    await stampAttempt('verify_resend', `admin-reset:${email}`);
  } catch (e) {
    console.error('[admin/password-reset/request] failed', e);
  }

  return NextResponse.json({ok: true});
}
