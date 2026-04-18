import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CALC_SLUGS = [
  'wall-thermal',
  'heat-loss',
  'hvac',
  'ahu-ashrae',
  'silencer',
  'silencer-kaya'
] as const;

const Body = z.object({
  slug: z.enum(CALC_SLUGS),
  action: z.enum(['open', 'pdf'])
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ok: false, error: 'bad body'}, {status: 400});
  }

  const visitorId = req.cookies.get('eng_vid')?.value ?? null;
  const country = req.headers.get('x-vercel-ip-country');
  const ua = req.headers.get('user-agent') ?? '';
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '';
  const daySalt = new Date().toISOString().slice(0, 10);
  const uaHash = crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${daySalt}`)
    .digest('hex')
    .slice(0, 32);

  try {
    await supabaseAdmin().from('calc_events').insert({
      slug: body.slug,
      action: body.action,
      visitor_id: visitorId && /^[0-9a-f-]{36}$/i.test(visitorId) ? visitorId : null,
      country,
      ua_hash: uaHash
    });
  } catch {
    // supabase unavailable — silently skip
  }

  return NextResponse.json({ok: true});
}
