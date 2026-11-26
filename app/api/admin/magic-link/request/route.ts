import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {
  MAGIC_IP_GAP_MS,
  buildMagicLink,
  claimSendSlot,
  ipRateKey,
  magicLinkOrigin,
  mintMagicToken,
  rejectUnsafeJsonPost,
  safeEqual,
  secondsUntilNextSlotHour,
  sendMagicMail,
  sendSlotsExhausted
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

const hourlyLimit = () => {
  const wait = secondsUntilNextSlotHour();
  return NextResponse.json(
    {error: 'throttled', wait_seconds: wait},
    {status: 429, headers: {'retry-after': String(wait)}}
  );
};

/**
 * POST /api/admin/magic-link/request {email}
 *
 * Sends a one-time login link, but only when `email` equals
 * ADMIN_RECOVERY_EMAIL. Every request that gets past the per-IP gap and the
 * hourly cap answers `200 {ok:true}` whether or not the address matched (no
 * account oracle); the only non-200 answers are global states (not
 * configured, throttled, provider down, store down) — see the notes on each
 * branch.
 *
 * The hourly cap (6 mails per clock hour for the whole site) is answered
 * honestly: once it is used up EVERY request gets `429 throttled` with the
 * seconds to the next hour, whatever address it carries. A silent 200 there
 * would tell the owner "sent" while nothing was sent, and anyone who knows the
 * address could use the 6 slots up and keep him out without a sign. The price:
 * someone guessing addresses learns a guess was right once the cap trips (it
 * costs him 6 mails to the owner and 6 minutes per guess from one IP); an
 * address is not a secret, so that is accepted. If the owner is ever locked out
 * this way the fallbacks are the password login, or rotating ADMIN_PASS_HASH in
 * the Vercel environment.
 */
export async function POST(req: NextRequest) {
  const unsafe = rejectUnsafeJsonPost(req.headers);
  if (unsafe) return NextResponse.json({error: unsafe.error}, {status: unsafe.status});

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

  // Hourly cap already used up → say so, to everybody, before looking at the
  // address (global state, so it reveals nothing about any mailbox).
  if (await sendSlotsExhausted()) return hourlyLimit();

  if (!safeEqual(body.email, recoveryEmail)) return OK();

  // Matched: at most 6 mails per clock hour for the whole site, claimed
  // atomically. The slot can still be gone here when requests race for the
  // last one → the same honest 429. A store error → send nothing and say so
  // (only reachable on a match, accepted).
  const slot = await claimSendSlot();
  if (slot === 'error') {
    return NextResponse.json({error: 'temporarily_unavailable'}, {status: 503});
  }
  if (slot === 'taken') return hourlyLimit();

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
