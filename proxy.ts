import {NextResponse, type NextRequest} from 'next/server';
import {jwtVerify} from 'jose';
import {lookupRedirect, recordRedirectHit} from '@/lib/redirects-cache';
import {ADMIN_COOKIE_NAME, verifyAdminToken} from '@/lib/admin-session-token';

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

// Admin gate. A layout-only `redirect()` is NOT a gate: layout and page render
// in parallel, so the page's server data still streams in the RSC payload next
// to the layout's NEXT_REDIRECT (`curl -H 'RSC: 1' /admin/launch-checklist`
// with no cookie answered 200 with the page content). The check has to run
// before rendering, i.e. here. The layouts keep their own getSession() checks
// as defence in depth.
//
// Gated: every /admin/* page except the public ones below, plus /sazeo/*,
// /tag-console/* and /audit.sazeo (the page AND its static blueprints under
// public/audit.sazeo, which this proxy answers before the file is served).
// A root also matches when followed by `.` and not only `/` (`/sazeo.rsc`,
// `/sazeo.segments/_tree.segment.rsc`: Next's RSC and segment-prefetch
// variants of the same page), so a future change to those features cannot
// reopen the leak. /sazeo/api/* is NOT gated here: `events` (developer bearer
// token) and `github-webhook` (HMAC) are machine endpoints that authenticate
// themselves, the other three check getSession() and answer 401 JSON.
// Not covered: /api/* (the matcher excludes it; every admin route checks
// getSession() itself).
const PUBLIC_ADMIN_PATHS = new Set(['/admin', '/admin/forgot', '/admin/magic']);

function canonicalPath(pathname: string): string {
  let p = pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    // malformed escape — keep the raw path; it simply will not match a public path
  }
  p = p.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return p || '/';
}

/** `/root`, `/root/...` and the dotted variants `/root.rsc`, `/root.segments/...`. */
function isUnder(p: string, root: string): boolean {
  return p === root || p.startsWith(root + '/') || p.startsWith(root + '.');
}

function isAdminGatedPath(pathname: string): boolean {
  const p = canonicalPath(pathname);
  if (isUnder(p, '/admin')) return !PUBLIC_ADMIN_PATHS.has(p);
  if (isUnder(p, '/sazeo')) {
    return !(p === '/sazeo/api' || p.startsWith('/sazeo/api/'));
  }
  return isUnder(p, '/tag-console') || isUnder(p, '/audit.sazeo');
}

async function gateAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!isAdminGatedPath(req.nextUrl.pathname)) return null;
  const session = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (session) return null;
  const res = NextResponse.redirect(new URL('/admin', req.url));
  res.headers.set('cache-control', 'no-store');
  return res;
}

export async function proxy(req: NextRequest) {
  // DMT session gate — runs first so unauthenticated /dmt/* never reaches the
  // redirect lookup or VID cookie path.
  const dmtRedirect = await gateDmt(req);
  if (dmtRedirect) return dmtRedirect;

  const adminRedirect = await gateAdmin(req);
  if (adminRedirect) return adminRedirect;

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
