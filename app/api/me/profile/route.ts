import {NextResponse, type NextRequest} from 'next/server';
import {findUserByEmail} from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/me/profile?email=... — public fields only (no credentials required).
// For mutations use PATCH /api/me/update with password verification.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) return NextResponse.json({error: 'missing_email'}, {status: 400});

  try {
    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({error: 'not_found'}, {status: 404});
    return NextResponse.json({
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
