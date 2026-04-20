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

  // Parse each data URL into {mediaType, data} for Claude API
  const images = parsed.data.photos
    .map(parseDataUrl)
    .filter((x): x is {mediaType: string; data: string} => x !== null)
    .slice(0, 5);

  if (images.length === 0)
    return NextResponse.json({error: 'no_valid_images'}, {status: 400});

  const systemPrompt = `You are an expert HVAC equipment identifier. You look at photos of heating, ventilation, air-conditioning, and refrigeration equipment and extract information from visible nameplates, labels, and serial number stickers.

Return a single JSON object with these exact fields:
- category: high-level category (e.g. "SPLIT / MULTISPLIT", "VRF/ VRV", "CHILLER", "AHU", "BOILER", "RECUPERAT", "AIR CURT", "PRECESION", "სხვა სისტემა")
- subtype: specific unit type (e.g. "Outdoor Unit", "კედლის ბლოკი", "ჭერის ბლოკი", "სტაციონარული", "რეკუპერატორი", "ჰაერის ფარდა", "გარე ბლოკი")
- brand: manufacturer (e.g. "Daikin", "Mitsubishi", "LG", "Samsung", "Gree", "Haier", "Carrier", "Trane", "York")
- model: model number/name exactly as printed
- serial: serial number or S/N exactly as printed
- notes: one-sentence human note about anything else important (power rating, capacity, etc.)
- missing: array of field names where you couldn't read the info (e.g. ["serial", "model"])

Rules:
1. Only extract what you actually see. Never guess a serial number.
2. If you can't read a field, set it to null and list it in "missing".
3. For category/subtype: you may infer from visual clues (outdoor vs indoor, ducted vs wall-mounted).
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
