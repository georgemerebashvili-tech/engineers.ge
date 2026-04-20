import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {createNotFoundEvent} from '@/lib/not-found-events';
import {checkRateLimit, recordFailure} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  pathname: z.string().min(1).max(500),
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

  // Throttle — crawlers hitting random URLs could flood us.
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `404:${ip}`);
  if (gate.locked) {
    return NextResponse.json({ok: true, dropped: true});
  }

  try {
    await createNotFoundEvent({
      ...parsed.data,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      visitor_id: req.cookies.get('eng_vid')?.value ?? null
    });
    return NextResponse.json({ok: true});
  } catch {
    await recordFailure('generic', `404:${ip}`);
    return NextResponse.json({ok: true, stored: false});
  }
}
