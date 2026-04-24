import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  photos: z.array(z.string().min(32)).min(1).max(5),
  hint: z
    .object({
      category: z.string().max(128).optional(),
      subtype: z.string().max(128).optional()
    })
    .optional(),
  // Optional product catalog to match against (tbc_products rows: id/code/name/dimension/tags)
  catalog: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        code: z.string().max(64).nullable().optional(),
        name: z.string().min(1).max(200),
        dimension: z.string().max(64).nullable().optional(),
        tags: z.array(z.string().max(48)).max(16).optional()
      })
    )
    .max(500)
    .optional()
});

type VisionResult = {
  category: string | null;
  subtype: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  notes: string | null;
  missing: string[]; // fields where Claude said "არ იკითხება"
  // What this product IS, in clear Georgian (e.g. "2-მილიანი ფანკოილი")
  georgian_description: string | null;
  // Match against caller-supplied catalog
  product_id: string | null;
  match_confidence: 'high' | 'medium' | 'low' | 'none';
  match_reasoning: string | null;
  // Top alternatives Claude considered (ids only) — used for the picker modal fallback
  candidates: string[];
};

export async function POST(req: Request) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  if (!(await isAiEnabled()))
    return NextResponse.json({error: 'ai_disabled'}, {status: 503});

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const key = await resolveAnthropicKey();
  if (!key) return NextResponse.json({error: 'no_ai_key'}, {status: 503});

  const model = await resolveAiModel();

  // Resolve every photo to {mediaType, data}. Accepts data URLs (legacy) or http(s) URLs (Supabase Storage).
  const resolved = await Promise.all(parsed.data.photos.map(resolvePhotoSource));
  const images = resolved
    .filter((x): x is {mediaType: string; data: string} => x !== null)
    .slice(0, 5);

  if (images.length === 0)
    return NextResponse.json({error: 'no_valid_images'}, {status: 400});

  const catalog = parsed.data.catalog || [];
  const catalogIds = new Set(catalog.map((c) => c.id));
  const catalogJson = catalog.length
    ? JSON.stringify(
        catalog.map((c) => ({
          id: c.id,
          code: c.code || '',
          name: c.name,
          dimension: c.dimension || '',
          tags: (c.tags || []).slice(0, 8)
        }))
      )
    : '';

  const systemPrompt = `You are an expert HVAC equipment identifier. You write all human-readable text in Georgian Mkhedruli (ქართული).

PRIORITY ORDER when reading a photo:
1. FIRST — scan for a nameplate / label / serial sticker (usually silver/white sticker on the side or back of the unit). This is the source of truth.
2. SECOND — any printed model number on the front panel.
3. THIRD — general visual appearance (outdoor vs indoor, wall-mounted vs ducted).

After reading the label, USE YOUR KNOWLEDGE of the manufacturer + model number to figure out what the device actually IS (e.g. "2-pipe fancoil" vs "4-pipe fancoil", "DC inverter VRF outdoor unit", "plate heat exchanger", etc.) and write that description in Georgian.

${
  catalog.length
    ? `Then MATCH the device against this product catalog (the operator must pick one of these or skip). Catalog rows are JSON; each has id/code/name/dimension/tags. Use the device kind (fancoil, gateway, pump, boiler, recuperator, thermostat, etc.) to find the best fitting catalog row by NAME and TAGS — the code is just an internal SKU.

CATALOG = ${catalogJson}

Confidence rubric:
- "high" — you are sure (e.g. label clearly says "Fancoil" and catalog has a "Fancoil" entry).
- "medium" — likely but model has variants the catalog does not distinguish (e.g. 2-pipe vs 4-pipe both map to "Fancoil").
- "low" — only a weak signal (general category match but no strong evidence).
- "none" — no reasonable catalog row fits; the operator should pick manually or skip.`
    : 'No catalog provided — leave product_id null, match_confidence "none", candidates [].'
}

Return a single JSON object with these exact fields:
- category: high-level category. Use EXACTLY one of these category labels: "SPLIT / MULTISPLIT", "VRF/ VRV", "CHILLER", "AHU", "BOILER", "RECUPERAT", "AIR CURT", "PRECESION", "სხვა".
- subtype: specific unit type in Georgian (e.g. "გარე ბლოკი", "კედლის ბლოკი", "ჭერის ბლოკი", "სტაციონარული", "რეკუპერატორი", "ჰაერის ფარდა").
- brand: manufacturer name as printed (e.g. "Daikin", "Mitsubishi", "LG", "Ariston", "Gree", "Haier", "Carrier"). Keep Latin characters as-is.
- model: model number exactly as printed on the label.
- serial: serial number / S/N exactly as printed on the label.
- notes: one sentence in Georgian about anything important (სიმძლავრე, ფრეონი, ფუნქციები).
- missing: array of field names where you couldn't read the info (e.g. ["serial"]).
- georgian_description: short Georgian sentence describing WHAT the product is in plain language (e.g. "2-მილიანი ფანკოილი", "4-მილიანი ფანკოილი ჭერის მონტაჟით", "DC ინვერტორიანი VRF გარე ბლოკი", "მილწყვეთის რეკუპერატორი"). Always fill this if you can identify the device kind, even if the catalog has no match.
- product_id: id of the best matching catalog row, or null. MUST be one of the ids in CATALOG, or null.
- match_confidence: "high" | "medium" | "low" | "none".
- match_reasoning: short Georgian explanation (one short sentence) of why this match (or why none).
- candidates: array of up to 5 catalog ids that could plausibly match, ordered best-first. Empty if none.

Rules:
1. Only extract what you actually see on the label. Never guess a serial number.
2. If you can't read a field, set it to null and list it in "missing".
3. notes / subtype / georgian_description / match_reasoning must be in Georgian Mkhedruli. Keep technical units (kW, BTU, R32, 220V) in standard form.
4. NEVER invent a product_id — only use ids that appear in CATALOG.
5. Return ONLY the JSON object — no markdown fences, no prose.`;

  const userText = `Extract HVAC equipment info from ${images.length} photo(s)${
    parsed.data.hint?.category
      ? `. Hint: user thinks this is "${parsed.data.hint.category}"`
      : ''
  }${parsed.data.hint?.subtype ? ` / "${parsed.data.hint.subtype}"` : ''}.${
    catalog.length ? ` Then match against the ${catalog.length}-row catalog given in the system prompt.` : ''
  }`;

  const content: Array<
    | {type: 'image'; source: {type: 'base64'; media_type: string; data: string}}
    | {type: 'text'; text: string}
  > = [
    ...images.map((img) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType,
        data: img.data
      }
    })),
    {type: 'text', text: userText}
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1100,
      system: systemPrompt,
      messages: [{role: 'user', content}]
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[tbc vision] claude api', res.status, txt.slice(0, 300));
    return NextResponse.json(
      {error: 'ai_error', status: res.status},
      {status: 502}
    );
  }

  const data = (await res.json()) as {
    content?: Array<{type: string; text?: string}>;
  };
  const text =
    data.content?.find((c) => c.type === 'text')?.text?.trim() || '';

  const extracted = parseVisionJson(text);
  if (!extracted) {
    console.error('[tbc vision] unparsable response:', text.slice(0, 300));
    return NextResponse.json(
      {error: 'unparsable', raw: text.slice(0, 500)},
      {status: 502}
    );
  }

  // Defensive: drop any product_id / candidates Claude hallucinated outside the catalog.
  if (extracted.product_id && !catalogIds.has(extracted.product_id)) {
    extracted.product_id = null;
    if (extracted.match_confidence === 'high' || extracted.match_confidence === 'medium') {
      extracted.match_confidence = 'low';
    }
  }
  extracted.candidates = (extracted.candidates || []).filter((id) => catalogIds.has(id)).slice(0, 5);

  return NextResponse.json({ok: true, result: extracted});
}

function parseDataUrl(
  s: string
): {mediaType: string; data: string} | null {
  const m = s.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  return {mediaType: m[1], data: m[2]};
}

async function resolvePhotoSource(
  s: string
): Promise<{mediaType: string; data: string} | null> {
  if (!s) return null;
  if (s.startsWith('data:')) return parseDataUrl(s);
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const r = await fetch(s, {cache: 'no-store'});
    if (!r.ok) return null;
    const mediaType = r.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
    if (!mediaType.startsWith('image/')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return {mediaType, data: buf.toString('base64')};
  } catch (e) {
    console.warn('[tbc vision] fetch photo failed', e);
    return null;
  }
}

function parseVisionJson(text: string): VisionResult | null {
  // Claude usually returns clean JSON; strip markdown fences just in case.
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  }
  // Extract first JSON object if prose wraps it
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];

  try {
    const raw = JSON.parse(t) as Record<string, unknown>;
    const str = (k: string) => {
      const v = raw[k];
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s && s.toLowerCase() !== 'null' ? s : null;
    };
    const missing = Array.isArray(raw.missing)
      ? raw.missing.map((x) => String(x)).filter(Boolean)
      : [];
    const candidates = Array.isArray(raw.candidates)
      ? raw.candidates.map((x) => String(x)).filter(Boolean)
      : [];
    const conf = String(raw.match_confidence || 'none').toLowerCase();
    const match_confidence: VisionResult['match_confidence'] =
      conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'none';
    return {
      category: str('category'),
      subtype: str('subtype'),
      brand: str('brand'),
      model: str('model'),
      serial: str('serial'),
      notes: str('notes'),
      missing,
      georgian_description: str('georgian_description'),
      product_id: str('product_id'),
      match_confidence,
      match_reasoning: str('match_reasoning'),
      candidates
    };
  } catch {
    return null;
  }
}
