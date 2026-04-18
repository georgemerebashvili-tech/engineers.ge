import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {findUserByEmail} from '@/lib/users';
import {issueResetToken, sendResetEmail} from '@/lib/password-reset';
import {checkMinGap, stampAttempt} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({email: z.string().email().max(200)});
const MIN_GAP_MS = 120_000; // 2 min between reset requests per email

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const email = body.email.toLowerCase().trim();

  // 2-minute throttle per email (DB-backed)
  const gate = await checkMinGap('verify_resend', `reset:${email}`, MIN_GAP_MS);
  if (!gate.allowed) {
    return NextResponse.json(
      {error: 'throttled', wait_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  // Enumeration-safe: always 200 regardless of existence.
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const {token} = await issueResetToken(user.id, user.email, getIp(req));
      const resetUrl = `${req.nextUrl.origin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendResetEmail({to: user.email, name: user.name, resetUrl});
    }
    await stampAttempt('verify_resend', `reset:${email}`);
  } catch (e) {
    console.error('[password/request] failed', e);
  }

  return NextResponse.json({ok: true});
}
