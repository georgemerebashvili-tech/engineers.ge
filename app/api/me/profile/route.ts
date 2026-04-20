import {NextResponse, type NextRequest} from 'next/server';
import {findUserByEmail} from '@/lib/users';
import {checkRateLimit} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}

// GET /api/me/profile?email=... — dashboard profile loader.
//
// Privacy: rate-limited per-IP to prevent email enumeration. Unknown emails
// return 200 with `{exists: false}` (same shape + status as a known email)
// so attackers can't distinguish via HTTP code alone.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) return NextResponse.json({error: 'missing_email'}, {status: 400});

  const ip = extractIp(req);
  const gate = await checkRateLimit('generic', `profile:${ip}`);
  if (gate.locked) {
    return NextResponse.json(
      {error: 'rate_limited', retry_after_seconds: gate.retry_after_seconds},
      {status: 429}
    );
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Same 200 shape; attackers can't enumerate via status codes.
      return NextResponse.json({exists: false});
    }
    return NextResponse.json({
      exists: true,
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      profession: user.profession,
      country_id: user.country_id,
      registered_at: user.registered_at,
      last_login_at: user.last_login_at,
      email_verified: user.email_verified,
      ref_code: user.ref_code,
      source: user.source,
      verified_engineer: user.verified_engineer ?? false
    });
  } catch (e) {
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
