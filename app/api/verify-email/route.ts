import {NextResponse, type NextRequest} from 'next/server';
import {consumeVerifyToken} from '@/lib/email-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/verify-email?token=... — called from email link.
// Redirects to / with a flash query param so UI can show confirmation.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim() ?? '';
  if (!token) {
    return NextResponse.redirect(new URL('/?verify=missing', req.url));
  }

  const result = await consumeVerifyToken(token);
  const status = result.ok ? 'ok' : result.reason;
  return NextResponse.redirect(new URL(`/?verify=${status}`, req.url));
}
