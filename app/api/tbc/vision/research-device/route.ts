import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getTbcSession} from '@/lib/tbc/auth';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';
import {writeAudit} from '@/lib/tbc/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const Body = z.object({
  category: z.string().max(128).optional(),
  subtype: z.string().max(128).optional(),
  brand: z.string().max(128).optional(),
  model: z.string().max(128).optional(),
  serial: z.string().max(128).optional(),
  // Optional photo to ground the research
  photos: z.array(z.string().min(32)).max(3).optional()
});

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

  const {category, subtype, brand, model, serial} = parsed.data;
  const label = [brand, model, serial].filter(Boolean).join(' ');
  if (!brand && !model && !(parsed.data.photos && parsed.data.photos.length)) {
    return NextResponse.json({error: 'no_input'}, {status: 400});
  }

  const modelName = await resolveAiModel();

  const systemPrompt = `You are an HVAC equipment expert. Given identifying info about a device (and optionally a photo of its nameplate), research and return technical specifications that are NOT typically captured in a basic inventory table.

Return a single JSON object with these fields (set to null if unknown or can't be determined):
- serial_format: explanation of what the serial number encodes (production year, factory, variant)
- capacity_kw: cooling/heating capacity in kW (e.g. "2.5 kW cooling / 3.2 kW heating")
- capacity_btu: capacity in BTU/h
- refrigerant: refrigerant type (e.g. "R32", "R410A")
- power_supply: voltage / phase (e.g. "220V / 1ph / 50Hz")
- power_consumption: rated power draw
- seer_cop: efficiency rating (SEER, EER, COP if known)
- production_year: inferred production year
- weight_kg: weight if known
- dimensions: size (WxHxD)
- features: array of 2-5 notable features (e.g. "inverter", "Wi-Fi", "plasma filter")
- typical_price: approximate market price range in GEL (e.g. "1200–1800 ₾")
- notes: 1-2 sentence summary about this specific unit, quirks or common issues

Rules:
1. Use only what you actually know about this brand/model. Never invent a serial format you haven't seen.
2. If uncertain, prefer null over a guess.
3. Return ONLY the JSON object. No prose, no markdown fences.`;

  const userText = label
    ? `Research device: ${label}${
        category ? ` · category: ${category}` : ''
      }${subtype ? ` · subtype: ${subtype}` : ''}`
    : 'Research the device in the photo.';

  const content: Array<
    | {type: 'image'; source: {type: 'base64'; media_type: string; data: string}}
    | {type: 'text'; text: string}
  > = [];

  const photos = parsed.data.photos || [];
  for (const p of photos) {
    const parsedImg = parseDataUrl(p);
    if (parsedImg)
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: parsedImg.mediaType,
          data: parsedImg.data
        }
      });
  }
  content.push({type: 'text', text: userText});

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 900,
      system: systemPrompt,
      messages: [{role: 'user', content}]
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[tbc research] claude api', res.status, txt.slice(0, 300));
    return NextResponse.json(
      {error: 'ai_error', status: res.status},
      {status: 502}
    );
  }

  const data = (await res.json()) as {
    content?: Array<{type: string; text?: string}>;
    usage?: {input_tokens?: number; output_tokens?: number};
  };
  const text =
    data.content?.find((c) => c.type === 'text')?.text?.trim() || '';

  const extracted = parseJson(text);
  if (!extracted) {
    return NextResponse.json(
      {error: 'unparsable', raw: text.slice(0, 500)},
      {status: 502}
    );
  }

  await writeAudit({
    actor: session.username,
    action: 'ai.research',
    targetType: 'device',
    summary: `ცოდიდან ინფო: ${label || '(photo)'}`,
    metadata: {
      input: {category, subtype, brand, model, serial},
      result: extracted,
      tokens: data.usage
    }
  });

  return NextResponse.json({ok: true, result: extracted});
}

function parseDataUrl(s: string): {mediaType: string; data: string} | null {
  const m = s.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  return m ? {mediaType: m[1], data: m[2]} : null;
}

function parseJson(text: string): Record<string, unknown> | null {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
}
