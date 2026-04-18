import {NextResponse, type NextRequest} from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Referral landing: /r/{code} → set cookie, redirect home.
// Cookie is read by /api/register to attribute the signup.
export async function GET(
  req: NextRequest,
  ctx: {params: Promise<{code: string}>}
) {
  const {code} = await ctx.params;
  const clean = (code || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);

  const res = NextResponse.redirect(new URL('/?ref=' + clean, req.url));
  if (clean) {
    res.cookies.set('eng_ref', clean, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      httpOnly: false // readable by client for UI acknowledgement
    });
  }
  return res;
}
