import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {
  createUser,
  findUserByEmail,
  findUserByRefCode,
  markUserFraud,
  upsertCountryByName
} from '@/lib/users';
import {checkEmail} from '@/lib/email-fraud';
import {issueVerifyToken, sendVerifyEmail} from '@/lib/email-verify';
import {checkRateLimit, recordFailure} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LANGS = ['ka', 'en', 'ru', 'tr', 'az', 'hy'] as const;

const Body = z.object({
  email: z.string().email().max(200),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  language: z.enum(LANGS),
  profession: z.string().max(120).optional().nullable(),
  interests: z.array(z.string().min(1).max(40)).max(12).optional(),
  country_id: z.number().int().positive().nullable().optional(),
  country_name: z.string().min(2).max(120).optional(),
  country_code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  ref: z.string().max(40).optional()
});

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'anon';
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }
  const data = parsed.data;

  // Durable per-IP throttle against mass-register attempts
  const ip = getClientIp(req);
  const gate = await checkRateLimit('register', `ip:${ip}`);
  if (gate.locked) {
    return NextResponse.json(
      {
        error: 'locked',
        message: 'ძალიან ბევრი მცდელობა ამ IP-დან. სცადე 5 წუთში.',
        retry_after_seconds: gate.retry_after_seconds
      },
      {status: 429}
    );
  }

  // Email fraud checks — reject clearly-disposable emails outright
  const fraud = checkEmail(data.email);
  if (fraud.disposable) {
    await recordFailure('register', `ip:${ip}`);
    return NextResponse.json(
      {
        error: 'disposable_email',
        message:
          'ერთჯერადი email-ებით რეგისტრაცია არ არის ნებადართული. გამოიყენე მუდმივი მისამართი.'
      },
      {status: 400}
    );
  }

  try {
    const existing = await findUserByEmail(data.email);
    if (existing) {
      await recordFailure('register', `ip:${ip}`);
      return NextResponse.json(
        {error: 'email_taken', message: 'ეს email უკვე დარეგისტრირებულია'},
        {status: 409}
      );
    }

    let countryId = data.country_id ?? null;
    if (!countryId && data.country_name) {
      const country = await upsertCountryByName({
        name_ka: data.country_name,
        name_en: data.country_name,
        code: data.country_code
      });
      countryId = country.id;
    }

    const visitorId = req.cookies.get('eng_vid')?.value ?? null;

    // Referral attribution — prefer body `ref`, fall back to cookie
    const refCode =
      (data.ref?.trim() || req.cookies.get('eng_ref')?.value || '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40);

    let referrerId: string | null = null;
    if (refCode) {
      const referrer = await findUserByRefCode(refCode);
      if (referrer) referrerId = referrer.id;
    }

    const cleanInterests = Array.isArray(data.interests)
      ? Array.from(
          new Set(
            data.interests
              .map((s) => s.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9_-]/g, ''))
              .filter((s) => s.length > 0)
          )
        ).slice(0, 12)
      : null;

    const user = await createUser({
      email: data.email,
      name: data.name,
      password: data.password,
      country_id: countryId,
      language: data.language,
      profession: data.profession ?? null,
      interests: cleanInterests,
      visitor_id: visitorId,
      referred_by_user_id: referrerId,
      source: referrerId ? 'referred' : 'self'
    });

    // Persist any fraud-flag signals for admin review queue
    if (fraud.score > 0 || fraud.reasons.length > 0) {
      await markUserFraud(user.id, {
        disposable_email: fraud.disposable,
        fraud_score: fraud.score
      });
    }

    // Issue verification token + send
    try {
      const {token} = await issueVerifyToken(user.id, user.email);
      const origin = req.nextUrl.origin;
      const verifyUrl = `${origin}/api/verify-email?token=${encodeURIComponent(token)}`;
      await sendVerifyEmail({to: user.email, name: user.name, verifyUrl});
    } catch (e) {
      console.error('[register] verify-email issuance failed', e);
    }

    const res = NextResponse.json({
      ok: true,
      user,
      needs_verification: true,
      referred_by: referrerId ? true : false
    });
    // Clear the ref cookie once attributed
    if (referrerId) {
      res.cookies.set('eng_ref', '', {maxAge: 0, path: '/'});
    }
    return res;
  } catch (e) {
    return NextResponse.json(
      {
        error: 'failed',
        message: e instanceof Error ? e.message : 'server error'
      },
      {status: 500}
    );
  }
}
