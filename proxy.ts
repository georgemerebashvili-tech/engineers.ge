import {NextResponse, type NextRequest} from 'next/server';
import {jwtVerify} from 'jose';
import {lookupRedirect, recordRedirectHit} from '@/lib/redirects-cache';

const VID_COOKIE = 'eng_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;

const PUBLIC_DMT_PATHS = ['/dmt/login', '/dmt/register', '/dmt/forgot', '/dmt/reset'];

function isPublicDmtPath(pathname: string) {
  return PUBLIC_DMT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

async function gateDmt(req: NextRequest): Promise<NextResponse | null> {
  const {pathname} = req.nextUrl;
  if (!pathname.startsWith('/dmt')) return null;
  if (isPublicDmtPath(pathname)) return null;

  const token = req.cookies.get('dmt_session')?.value;
  const loginUrl = new URL('/dmt/login', req.url);
  if (pathname !== '/dmt') loginUrl.searchParams.set('next', pathname);

  if (!token) return NextResponse.redirect(loginUrl);

  const secretStr = process.env.AUTH_SECRET;
  if (!secretStr) return NextResponse.redirect(loginUrl);

  try {
    const {payload} = await jwtVerify(
      token,
      new TextEncoder().encode(secretStr)
    );
    if (payload.scope !== 'dmt') return NextResponse.redirect(loginUrl);
    return null;
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export async function proxy(req: NextRequest) {
  // DMT session gate — runs first so unauthenticated /dmt/* never reaches the
  // redirect lookup or VID cookie path.
  const dmtRedirect = await gateDmt(req);
  if (dmtRedirect) return dmtRedirect;

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
