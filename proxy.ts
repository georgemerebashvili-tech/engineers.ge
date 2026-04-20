import {NextResponse, type NextRequest} from 'next/server';
import {lookupRedirect, recordRedirectHit} from '@/lib/redirects-cache';

const VID_COOKIE = 'eng_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function proxy(req: NextRequest) {
  // Admin-editable redirects — exact-match on pathname only.
  // See lib/redirects-cache.ts for caching behavior (60s TTL, fail-open).
  const redirect = await lookupRedirect(req.nextUrl.pathname);
  if (redirect) {
    const url = redirect.destination.startsWith('http')
      ? redirect.destination
      : new URL(redirect.destination, req.url).toString();
    recordRedirectHit(redirect.id);
    return NextResponse.redirect(url, redirect.status_code);
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-pathname', req.nextUrl.pathname);
  const res = NextResponse.next({request: {headers: reqHeaders}});
  if (!req.cookies.get(VID_COOKIE)) {
    res.cookies.set(VID_COOKIE, crypto.randomUUID(), {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    });
  }
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|api/).*)'
  ]
};
