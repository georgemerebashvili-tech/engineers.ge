import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {clearRateLimit, type RateLimitBucket} from '@/lib/rate-limit';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  bucket: z.enum(['login', 'verify_resend', 'register', 'generic']),
  key: z.string().min(1).max(200)
});

/** DELETE — unlock a specific rate-limit bucket/key pair. */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  try {
    await clearRateLimit(parsed.data.bucket as RateLimitBucket, parsed.data.key);
    await logAdminAction({
      actor: session.user,
      action: 'rate_limit.unlock',
      target_type: 'rate_limits',
      target_id: `${parsed.data.bucket}:${parsed.data.key}`,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
