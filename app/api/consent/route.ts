import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {createConsentLog, hashIp} from '@/lib/consent-log';
import {checkRateLimit} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(['decide', 'reopen']).optional(),
  pathname: z.string().max(500).optional()
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

  // Lightweight throttle — one click should be one log entry, not 1000.
  const ip = getClientIp(req);
  const gate = await checkRateLimit('generic', `consent:${ip}`);
  if (gate.locked) {
    return NextResponse.json({ok: true, dropped: true});
  }

  await createConsentLog({
    visitor_id: req.cookies.get('eng_vid')?.value ?? null,
    analytics: parsed.data.analytics,
    marketing: parsed.data.marketing,
    action: parsed.data.action ?? 'decide',
    pathname: parsed.data.pathname ?? null,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    ip_hash: ip === 'anon' ? null : hashIp(ip)
  });

  return NextResponse.json({ok: true});
}
