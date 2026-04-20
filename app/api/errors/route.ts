import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {createErrorEvent} from '@/lib/error-events';
import {checkRateLimit, recordFailure} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Accepts both JSON and text/plain beacon bodies — sendBeacon may coerce.
const Body = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional().nullable(),
  digest: z.string().max(200).optional().nullable(),
  pathname: z.string().min(1).max(500),
  kind: z.enum(['route', 'global', 'api']).optional(),
  viewport: z.string().max(30).optional().nullable(),
  referrer: z.string().max(500).optional().nullable()
});

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() ?? 'anon';
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    const text = await req.text();
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  // Per-IP rate limit — a crashy client could spam us into oblivion.
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `err:${ip}`);
  if (gate.locked) {
    // Don't 429 the user page — silently drop excess reports.
    return NextResponse.json({ok: true, dropped: true});
  }

  try {
    await createErrorEvent({
      ...parsed.data,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      visitor_id: req.cookies.get('eng_vid')?.value ?? null
    });
    return NextResponse.json({ok: true});
  } catch {
    await recordFailure('generic', `err:${ip}`);
    // Always return 200 — this endpoint is fire-and-forget from beacon.
    return NextResponse.json({ok: true, stored: false});
  }
}
