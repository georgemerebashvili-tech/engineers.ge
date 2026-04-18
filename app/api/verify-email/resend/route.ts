import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {findUserByEmail} from '@/lib/users';
import {issueVerifyToken, sendVerifyEmail} from '@/lib/email-verify';
import {checkMinGap, stampAttempt} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({email: z.string().email().max(200)});

const MIN_GAP_MS = 60_000;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const email = body.email.toLowerCase().trim();

  // Durable per-email min-gap throttle
  const gate = await checkMinGap('verify_resend', email, MIN_GAP_MS);
  if (!gate.allowed) {
    return NextResponse.json(
      {error: 'throttled', wait_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  // Always return ok to avoid email enumeration; perform send only if user exists.
  try {
    const user = await findUserByEmail(email);
    if (user && !user.email_verified) {
      const {token} = await issueVerifyToken(user.id, user.email);
      const verifyUrl = `${req.nextUrl.origin}/api/verify-email?token=${encodeURIComponent(token)}`;
      await sendVerifyEmail({to: user.email, name: user.name, verifyUrl});
    }
    // Stamp attempt regardless so enumeration can't distinguish via timing.
    await stampAttempt('verify_resend', email);
  } catch (e) {
    console.error('[verify-email/resend] failed', e);
  }

  return NextResponse.json({ok: true});
}
