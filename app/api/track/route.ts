import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {UAParser} from 'ua-parser-js';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  path: z.string().min(1).max(2000),
  referrer: z.string().url().nullable().optional().default(null),
  utm_source: z.string().max(200).nullable().optional().default(null),
  utm_medium: z.string().max(200).nullable().optional().default(null),
  utm_campaign: z.string().max(200).nullable().optional().default(null)
});

const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|preview|slackbot|twitterbot|telegrambot|lighthouse|pagespeed|headlesschrome/i;

export async function POST(req: NextRequest) {
  const visitorId = req.cookies.get('eng_vid')?.value;
  if (!visitorId || !isUuid(visitorId)) {
    return NextResponse.json({error: 'no visitor cookie'}, {status: 400});
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad body'}, {status: 400});
  }

  const ua = req.headers.get('user-agent') || '';
  const bot = BOT_RE.test(ua);
  if (bot) {
    return NextResponse.json({id: null, bot: true});
  }

  const parsed = UAParser(ua);
  const osName = parsed.os.name ?? null;
  const device =
    parsed.device.type ||
    (osName && /android|ios/i.test(osName) ? 'mobile' : 'desktop');
  const browser = parsed.browser.name ?? null;

  let referrer: string | null = body.referrer ?? null;
  let referrerDomain: string | null = null;
  if (referrer) {
    try {
      const u = new URL(referrer);
      const host = (req.headers.get('host') || '').split(':')[0];
      if (host && u.hostname === host) {
        referrer = null;
      } else {
        referrerDomain = u.hostname;
      }
    } catch {
      referrer = null;
    }
  }

  const country = req.headers.get('x-vercel-ip-country') || null;
  const cityHeader = req.headers.get('x-vercel-ip-city');
  const city = cityHeader ? safeDecode(cityHeader) : null;

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
    const {data, error} = await supabaseAdmin()
      .from('page_views')
      .insert({
        visitor_id: visitorId,
        path: body.path,
        referrer,
        referrer_domain: referrerDomain,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        country,
        city,
        device,
        browser,
        os: osName,
        ua_hash: uaHash
      })
      .select('id')
      .single();

    if (error) {
      console.error('[track] insert failed', error.message);
      return NextResponse.json({id: null, skipped: true});
    }

    return NextResponse.json({id: data.id});
  } catch (e) {
    console.warn('[track] supabase unavailable:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({id: null, skipped: true});
  }
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
