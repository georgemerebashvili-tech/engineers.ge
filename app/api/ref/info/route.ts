import {NextResponse, type NextRequest} from 'next/server';
import {findUserByRefCode} from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ref/info?code=ge_abc123 — minimal referrer lookup for welcome banner.
// Exposes only first name to avoid leaking email/full info via enumeration.
export async function GET(req: NextRequest) {
  const code =
    req.nextUrl.searchParams
      .get('code')
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 40) ?? '';

  if (!code) return NextResponse.json({error: 'missing_code'}, {status: 400});

  try {
    const user = await findUserByRefCode(code);
    if (!user) return NextResponse.json({error: 'not_found'}, {status: 404});
    // First name only — no email / id exposure.
    const first = (user.name || '').split(/\s+/)[0] || 'ინჟინერი';
    return NextResponse.json({code: user.ref_code, referrer_first_name: first});
  } catch {
    return NextResponse.json({error: 'server'}, {status: 500});
  }
}
