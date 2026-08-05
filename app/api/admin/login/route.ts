import {NextResponse} from 'next/server';
import {z} from 'zod';
import {verifyCredentials, issueSession} from '@/lib/auth';
import {getIp} from '@/lib/admin-audit';
import {checkRateLimit, clearRateLimit, recordFailure} from '@/lib/rate-limit';

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// Brute-force guard. The admin panel is one hardcoded account (ADMIN_USER +
// ADMIN_PASS_HASH) on a public URL, so an unthrottled POST here is an open
// door. The 'login' bucket already existed in lib/rate-limit.ts (6 fails ->
// 10 min lock) but no route used it. Locks are per-IP, degrade open when the
// DB is unreachable, and can be cleared from /admin/rate-limits.
function rateKey(ip: string | null) {
  return `admin-login:${ip ?? 'unknown'}`;
}

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const key = rateKey(getIp(req.headers));

  const gate = await checkRateLimit('login', key);
  if (gate.locked) {
    return NextResponse.json(
      {error: 'too_many_attempts', retry_after_seconds: gate.retry_after_seconds},
      {
        status: 429,
        headers: {'retry-after': String(gate.retry_after_seconds)}
      }
    );
  }

  const ok = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!ok) {
    const fail = await recordFailure('login', key);
    if (fail.locked) {
      return NextResponse.json(
        {
          error: 'too_many_attempts',
          retry_after_seconds: fail.retry_after_seconds
        },
        {
          status: 429,
          headers: {'retry-after': String(fail.retry_after_seconds ?? 600)}
        }
      );
    }
    return NextResponse.json({error: 'invalid_credentials'}, {status: 401});
  }

  await clearRateLimit('login', key);
  await issueSession(parsed.data.username);
  return NextResponse.json({ok: true});
}
