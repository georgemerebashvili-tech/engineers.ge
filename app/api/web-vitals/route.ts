import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {recordWebVital} from '@/lib/web-vitals';
import {checkRateLimit} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  metric: z.string().min(1).max(40),
  value: z.number().finite(),
  rating: z.string().max(40).optional().nullable(),
  pathname: z.string().min(1).max(500),
  navigation_type: z.string().max(40).optional().nullable(),
  viewport: z.string().max(30).optional().nullable()
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

  // Rate-limit per IP — web-vitals fires 5 metrics per page load; bot traffic
  // or buggy clients could flood us. Silent drop when locked.
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `vitals:${ip}`);
  if (gate.locked) {
    return NextResponse.json({ok: true, dropped: true});
  }

  await recordWebVital({
    ...parsed.data,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    visitor_id: req.cookies.get('eng_vid')?.value ?? null
  });
  return NextResponse.json({ok: true});
}
