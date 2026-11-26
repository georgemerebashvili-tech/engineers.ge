import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {
  MAGIC_IP_GAP_MS,
  buildMagicLink,
  claimSendSlot,
  ipRateKey,
  magicLinkOrigin,
  mintMagicToken,
  safeEqual,
  sendMagicMail
} from '@/lib/admin-magic-link';
import {readEnv} from '@/lib/admin-session-token';
import {getIp, logAdminAction} from '@/lib/admin-audit';
import {checkMinGap, stampAttempt} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200)
});

const OK = () => NextResponse.json({ok: true});

/**
 * POST /api/admin/magic-link/request {email}
 *
 * Sends a one-time login link, but only when `email` equals
 * ADMIN_RECOVERY_EMAIL. Every request that gets past the per-IP gap answers
 * `200 {ok:true}` whether or not the address matched (no account oracle); the
 * only non-200 answers are global states (not configured, throttled, provider
 * down, store down) — see the notes on each branch.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const recoveryEmail = readEnv('ADMIN_RECOVERY_EMAIL').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';
  const configured =
    Boolean(recoveryEmail) &&
    Boolean(readEnv('ADMIN_USER')) &&
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (!isProd || Boolean(readEnv('RESEND_API_KEY')));

  // Global configuration state, independent of the submitted address, so it
  // reveals nothing about any mailbox.
  if (!configured && isProd) {
    return NextResponse.json({error: 'email_not_configured'}, {status: 503});
  }

  // Per-client gap for everybody, matched or not.
  const ip = getIp(req.headers);
  const gapKey = `admin-magic:ip:${ipRateKey(ip)}`;
  const gate = await checkMinGap('verify_resend', gapKey, MAGIC_IP_GAP_MS);
  if (!gate.allowed) {
    return NextResponse.json(
      {error: 'throttled', wait_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }
  await stampAttempt('verify_resend', gapKey);

  if (!configured) {
    console.warn(
      '[admin-magic] request ignored: ADMIN_RECOVERY_EMAIL, ADMIN_USER or AUTH_SECRET is not set'
    );
    return OK();
  }

  if (!safeEqual(body.email, recoveryEmail)) return OK();

  // Matched: at most 6 mails per clock hour for the whole site, claimed
  // atomically. No slot left → send nothing, still 200 (no oracle). A store
  // error → send nothing and say so (only reachable on a match, accepted).
  const slot = await claimSendSlot();
  if (slot === 'error') {
    return NextResponse.json({error: 'temporarily_unavailable'}, {status: 503});
  }
  if (slot === 'taken') return OK();

  const token = await mintMagicToken();
  if (!token) {
    return NextResponse.json({error: 'email_not_configured'}, {status: 503});
  }
  const link = buildMagicLink(magicLinkOrigin(req.url), token);

  const sent = await sendMagicMail({to: recoveryEmail, link});
  if (sent === 'failed') {
    return NextResponse.json({error: 'send_failed'}, {status: 502});
  }

  await logAdminAction({
    actor: 'anonymous',
    action: 'admin.magic_link_request',
    target_type: 'admin_magic_link',
    target_id: null,
    metadata: {delivery: sent},
    ip
  });
  return OK();
}
