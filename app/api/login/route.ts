import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {findUserByEmail, verifyPassword} from '@/lib/users';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  checkRateLimit,
  clearRateLimit,
  recordFailure
} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200)
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const email = body.email.toLowerCase().trim();

  // DB-backed durable throttle (survives cold starts + multi-instance)
  const gate = await checkRateLimit('login', email);
  if (gate.locked) {
    return NextResponse.json(
      {
        error: 'locked',
        message: 'ძალიან ბევრი მცდელობა. სცადე ცოტა ხანში.',
        retry_after_seconds: gate.retry_after_seconds
      },
      {status: 429}
    );
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      const fail = await recordFailure('login', email);
      return NextResponse.json(
        {
          error: fail.locked ? 'locked' : 'bad_credentials',
          message: fail.locked
            ? 'ძალიან ბევრი მცდელობა. სცადე 10 წუთში.'
            : 'Email ან პაროლი არასწორია'
        },
        {status: fail.locked ? 429 : 401}
      );
    }

    const ok = verifyPassword(body.password, user.password_hash, user.password_salt);
    if (!ok) {
      const fail = await recordFailure('login', email);
      return NextResponse.json(
        {
          error: fail.locked ? 'locked' : 'bad_credentials',
          message: fail.locked
            ? 'ძალიან ბევრი მცდელობა. სცადე 10 წუთში.'
            : 'Email ან პაროლი არასწორია'
        },
        {status: fail.locked ? 429 : 401}
      );
    }

    // Clear throttle + refresh last_login_at
    await clearRateLimit('login', email);
    await supabaseAdmin()
      .from('users')
      .update({last_login_at: new Date().toISOString()})
      .eq('id', user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        language: user.language,
        ref_code: user.ref_code,
        email_verified: user.email_verified,
        verified_engineer: user.verified_engineer ?? false,
        registered_at: user.registered_at
      }
    });
  } catch (e) {
    console.error('[login] failed', e);
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
