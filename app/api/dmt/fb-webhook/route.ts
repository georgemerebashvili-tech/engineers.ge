import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Meta Lead Ads webhook.
//
// Setup (Meta for Developers):
//   1. App → Webhooks → Page → Subscribe with:
//        Callback URL  = https://engineers.ge/api/dmt/fb-webhook
//        Verify Token  = process.env.FB_VERIFY_TOKEN
//        Fields        = leadgen
//   2. After verification, subscribe each Page to the app's leadgen field.
//   3. Set FB_PAGE_ACCESS_TOKEN (long-lived Page token) so we can fetch
//      individual leads via Graph API (the webhook only sends leadgen_id).
//   4. Set FB_APP_SECRET so we can verify X-Hub-Signature-256 on POSTs.

const GRAPH_VERSION = 'v20.0';

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// GET — Meta verification handshake.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.FB_VERIFY_TOKEN;

  if (!expected) {
    return NextResponse.json(
      {error: 'not_configured', message: 'FB_VERIFY_TOKEN is not set on the server'},
      {status: 503}
    );
  }

  if (mode === 'subscribe' && token && safeEq(token, expected) && challenge) {
    return new Response(challenge, {status: 200, headers: {'content-type': 'text/plain'}});
  }

  return NextResponse.json({error: 'verify_failed'}, {status: 403});
}

// POST — lead delivery.
export async function POST(req: Request) {
  const appSecret = process.env.FB_APP_SECRET;
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!appSecret) {
    return NextResponse.json(
      {error: 'not_configured', message: 'FB_APP_SECRET missing'},
      {status: 503}
    );
  }

  // Read raw body for HMAC verification — must be the exact bytes Meta sent.
  const raw = await req.text();
  const sigHeader = req.headers.get('x-hub-signature-256') ?? '';
  if (!sigHeader.startsWith('sha256=')) {
    return NextResponse.json({error: 'missing_signature'}, {status: 401});
  }
  const expectedSig =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
  if (!safeEq(sigHeader, expectedSig)) {
    return NextResponse.json({error: 'invalid_signature'}, {status: 401});
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({error: 'bad_json'}, {status: 400});
  }

  const object = (body as {object?: string})?.object;
  if (object !== 'page') {
    // Still ACK so Meta doesn't retry; unsupported object.
    return NextResponse.json({ok: true, skipped: 'non_page_object'});
  }

  const entries = (body as {entry?: Array<unknown>}).entry ?? [];
  const results: Array<{leadgen_id: string; ok: boolean; error?: string}> = [];

  for (const entry of entries) {
    const e = entry as {
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          leadgen_id?: string;
          page_id?: string;
          ad_id?: string;
          adgroup_id?: string;
          form_id?: string;
          created_time?: number;
        };
      }>;
    };
    for (const ch of e.changes ?? []) {
      if (ch.field !== 'leadgen') continue;
      const v = ch.value;
      const leadgen_id = v?.leadgen_id;
      if (!leadgen_id) continue;

      try {
        let enriched: Record<string, unknown> | null = null;
        if (pageToken) {
          const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgen_id)}?fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data&access_token=${encodeURIComponent(pageToken)}`;
          const r = await fetch(url);
          if (r.ok) enriched = (await r.json()) as Record<string, unknown>;
        }

        const fieldData =
          (enriched?.field_data as Array<{name?: string; values?: string[]}> | undefined) ??
          [];
        const byName = (name: string) =>
          fieldData.find((f) => f.name === name)?.values?.[0] ?? null;

        const row = {
          leadgen_id,
          page_id: v?.page_id ?? (e.id ?? ''),
          ad_id: v?.ad_id ?? (enriched?.ad_id as string | undefined) ?? null,
          adset_id: (enriched?.adset_id as string | undefined) ?? null,
          campaign_id: (enriched?.campaign_id as string | undefined) ?? null,
          form_id: v?.form_id ?? (enriched?.form_id as string | undefined) ?? null,
          form_name: null as string | null,
          created_time: enriched?.created_time
            ? new Date(enriched.created_time as string).toISOString()
            : v?.created_time
              ? new Date(v.created_time * 1000).toISOString()
              : new Date().toISOString(),
          field_data: fieldData,
          full_name: byName('full_name') ?? byName('first_name'),
          phone: byName('phone_number') ?? byName('phone'),
          email: byName('email'),
          raw: enriched ?? {webhook_value: v}
        };

        const {error} = await supabaseAdmin()
          .from('dmt_fb_leads')
          .upsert(row, {onConflict: 'leadgen_id'});

        results.push({leadgen_id, ok: !error, error: error?.message});
      } catch (err) {
        results.push({
          leadgen_id,
          ok: false,
          error: err instanceof Error ? err.message : 'unknown'
        });
      }
    }
  }

  // Always 200 to prevent Meta from retrying storms; log outcome in response.
  return NextResponse.json({ok: true, processed: results.length, results});
}
