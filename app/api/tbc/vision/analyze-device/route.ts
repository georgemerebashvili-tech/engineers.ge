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

  const systemPrompt = `You are an expert HVAC equipment identifier specialized in Georgian Mkhedruli text output.

PRIORITY ORDER when reading a photo:
1. FIRST — scan for a nameplate / label / serial sticker (usually silver/white sticker on the side or back of the unit). This is the source of truth.
2. SECOND — any printed model number on the front panel.
3. THIRD — general visual appearance (outdoor vs indoor, wall-mounted vs ducted).

Return a single JSON object with these exact fields:
- category: high-level category. Use EXACTLY one of these Georgian/English category labels: "SPLIT / MULTISPLIT", "VRF/ VRV", "CHILLER", "AHU", "BOILER", "RECUPERAT", "AIR CURT", "PRECESION", "სხვა".
- subtype: specific unit type in GEORGIAN (e.g. "გარე ბლოკი", "კედლის ბლოკი", "ჭერის ბლოკი", "სტაციონარული", "რეკუპერატორი", "ჰაერის ფარდა").
- brand: manufacturer name as printed (e.g. "Daikin", "Mitsubishi", "LG", "Ariston", "Gree", "Haier", "Carrier"). Keep Latin characters as-is.
- model: model number exactly as printed on the label.
- serial: serial number / S/N exactly as printed on the label.
- notes: one sentence IN GEORGIAN about anything important (სიმძლავრე, ფრეონი, ფუნქციები).
- missing: array of field names where you couldn't read the info (e.g. ["serial"]).

Rules:
1. Only extract what you actually see on the label. Never guess a serial number.
2. If you can't read a field, set it to null and list it in "missing".
3. notes and subtype must be in Georgian Mkhedruli (ქართული). Keep technical units (kW, BTU, R32, 220V) in standard form.
4. Return ONLY the JSON object — no markdown fences, no prose.`;

  const userText = `Extract HVAC equipment info from ${images.length} photo(s)${
    parsed.data.hint?.category
      ? `. Hint: user thinks this is "${parsed.data.hint.category}"`
      : ''
  }${parsed.data.hint?.subtype ? ` / "${parsed.data.hint.subtype}"` : ''}.`;

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
      max_tokens: 600,
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
    return {
      category: str('category'),
      subtype: str('subtype'),
      brand: str('brand'),
      model: str('model'),
      serial: str('serial'),
      notes: str('notes'),
      missing
    };
  } catch {
    return null;
  }
}
