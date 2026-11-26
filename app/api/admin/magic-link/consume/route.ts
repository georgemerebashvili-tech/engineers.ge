import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {claimTokenUse, ipRateKey, verifyMagicToken} from '@/lib/admin-magic-link';
import {issueSession, getSession} from '@/lib/auth';
import {readEnv} from '@/lib/admin-session-token';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {checkRateLimit, recordFailure} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({t: z.string().min(1).max(4000)});

const NO_STORE = {'cache-control': 'no-store'};

/**
 * POST /api/admin/magic-link/consume {t}
 *
 * Exchanges a magic-link token for an admin session. The landing page calls it
 * only after a click, so a mail scanner that merely opens the link cannot use
 * it up. Single use is enforced server-side (see claimTokenUse); a store error
 * fails closed — password login keeps working.
 */
export async function POST(req: NextRequest) {
  // Double click / second tab: already signed in, nothing to consume.
  if (await getSession()) {
    return NextResponse.json({ok: true}, {headers: NO_STORE});
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400, headers: NO_STORE});
  }

  const ip = getIp(req.headers);
  const failKey = `admin-magic-consume:${ipRateKey(ip)}`;
  const lock = await checkRateLimit('login', failKey);
  if (lock.locked) {
    return NextResponse.json(
      {error: 'too_many_attempts', retry_after_seconds: lock.retry_after_seconds},
      {
        status: 429,
        headers: {...NO_STORE, 'retry-after': String(lock.retry_after_seconds)}
      }
    );
  }

  const verdict = await verifyMagicToken(body.t);
  if (!verdict.ok) {
    if (verdict.reason === 'expired') {
      // The signature verified, so this is a real (old) link: safe to log.
      await logAdminAction({
        actor: 'anonymous',
        action: 'admin.magic_link_failed',
        target_type: 'admin_magic_link',
        metadata: {reason: 'expired'},
        ip
      });
      return NextResponse.json({error: 'expired'}, {status: 400, headers: NO_STORE});
    }
    // Forged / garbled / wrong key: count it, never log it (no flooding).
    await recordFailure('login', failKey);
    return NextResponse.json({error: 'invalid'}, {status: 400, headers: NO_STORE});
  }

  const adminUser = readEnv('ADMIN_USER');
  if (!adminUser) {
    return NextResponse.json(
      {error: 'email_not_configured'},
      {status: 503, headers: NO_STORE}
    );
  }

  const claim = await claimTokenUse(verdict.jti);
  if (claim === 'error') {
    return NextResponse.json(
      {error: 'temporarily_unavailable'},
      {status: 503, headers: NO_STORE}
    );
  }
  if (claim === 'taken') {
    await logAdminAction({
      actor: 'anonymous',
      action: 'admin.magic_link_failed',
      target_type: 'admin_magic_link',
      target_id: verdict.jti,
      metadata: {reason: 'used'},
      ip
    });
    return NextResponse.json({error: 'used'}, {status: 400, headers: NO_STORE});
  }

  await issueSession(adminUser);
  await logAdminAction({
    actor: adminUser,
    action: 'admin.magic_link_login',
    target_type: 'admin_magic_link',
    target_id: verdict.jti,
    metadata: {},
    ip
  });
  return NextResponse.json({ok: true}, {headers: NO_STORE});
}
