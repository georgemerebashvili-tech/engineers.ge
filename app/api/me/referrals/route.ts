import {NextResponse, type NextRequest} from 'next/server';
import {findUserByEmail, listReferralsFor} from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/me/referrals?email=... — returns the current user's ref_code
// plus the list of users who registered via that link.
// MVP: email passed as query because there's no server-side user session yet.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email) {
    return NextResponse.json({error: 'missing_email'}, {status: 400});
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({error: 'not_found'}, {status: 404});

    const invited = await listReferralsFor(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ref_code: user.ref_code,
        verified_engineer: user.verified_engineer,
        email_verified: user.email_verified
      },
      invited,
      stats: {
        total: invited.length,
        verified: invited.filter((u) => u.email_verified).length,
        engineers: invited.filter((u) => u.verified_engineer).length,
        reward_gel: Math.min(invited.filter((u) => u.email_verified).length * 10, 3000)
      }
    });
  } catch (e) {
    console.error('[me/referrals] failed', e);
    return NextResponse.json({error: 'server'}, {status: 500});
  }
}
