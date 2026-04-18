import {NextResponse} from 'next/server';
import {z} from 'zod';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  imageBase64: z.string().min(100).max(12 * 1024 * 1024),    // ≤12 MB base64
  mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp']).default('image/png'),
  // Real-world scale hint; user provides an approximate width/height in meters
  scaleM: z.number().positive().max(500).optional(),
  // Layer filter hint (only "WALLS" or all) — forwarded to prompt
  hint: z.string().max(200).optional()
});

const SYSTEM_PROMPT = `You are an architectural CAD assistant for engineers.ge.

You receive a floor-plan image (black lines on white, or CAD screenshot) and MUST output ONLY a single JSON object describing the interior wall segments. Strict rules:

1. Output exactly one JSON object (no prose, no markdown fences, no preamble).
2. The JSON schema:
   {
     "walls": [{ "start": [x, y], "end": [x, y], "thickness": 0.12 }, ...],
     "scale": { "unit": "m", "estimatedWidth": <number in meters>, "estimatedHeight": <number in meters> },
     "confidence": 0..1,
     "notes": "short explanation"
   }
3. Coordinates must be in meters with origin at top-left of the image. Y grows downward.
4. Thickness in meters; default 0.12 for interior partitions, 0.20 for exterior.
5. Only straight wall segments. Skip doors, windows, furniture, dimensions, labels, hatching.
6. Skip duplicate segments. If a wall has a door/window cut, still output it as ONE continuous wall.
7. If scale is ambiguous, estimate real-world width based on typical residential units (30-150m² floor).
8. If you cannot identify any walls, return {"walls":[], "scale":{...}, "confidence":0, "notes":"reason"}.

Maximum output: 200 walls. Keep JSON compact (no pretty-print).`;

export async function POST(req: Request) {
  if (!(await isAiEnabled())) {
    return NextResponse.json(
      {error: 'ai_disabled', message: 'AI სერვისი გათიშულია admin-ში.'},
      {status: 503}
    );
  }
  const apiKey = await resolveAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      {error: 'ai_not_configured', message: 'ANTHROPIC_API_KEY არ არის დაყენებული. Admin → AI → დაამატე key.'},
      {status: 503}
    );
  }
  const model = (await resolveAiModel()) || 'claude-sonnet-4-6';

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_json'}, {status: 400});
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request', details: parsed.error.flatten()}, {status: 400});
  }
  const {imageBase64, mediaType, scaleM, hint} = parsed.data;

  // Strip potential data-URL prefix
  const clean = imageBase64.replace(/^data:image\/[a-z+.-]+;base64,/, '');

  const hints: string[] = [];
  if (scaleM != null) hints.push(`Image width ≈ ${scaleM} meters (use to compute real coordinates).`);
  if (hint) hints.push(`User hint: ${hint}`);
  const userText = hints.length
    ? hints.join('\n') + '\n\nExtract walls as JSON.'
    : 'Extract walls as JSON.';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {type: 'base64', media_type: mediaType, data: clean}
              },
              {type: 'text', text: userText}
            ]
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {error: 'upstream_failed', status: res.status, message: errText},
        {status: 502}
      );
    }

    const data = (await res.json()) as {
      content?: {type: string; text?: string}[];
      usage?: {input_tokens: number; output_tokens: number};
    };

    const raw =
      data.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('') ?? '';

    // Strip markdown fences if the model added them anyway.
    const clean2 = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let json: unknown;
    try {
      json = JSON.parse(clean2);
    } catch (e) {
      return NextResponse.json(
        {error: 'parse_failed', raw: clean2.slice(0, 2000)},
        {status: 502}
      );
    }

    // Minimal runtime validation on the returned structure
    const Result = z.object({
      walls: z
        .array(
          z.object({
            start: z.tuple([z.number(), z.number()]),
            end: z.tuple([z.number(), z.number()]),
            thickness: z.number().positive().max(5).default(0.12)
          })
        )
        .max(500),
      scale: z
        .object({
          unit: z.string().default('m'),
          estimatedWidth: z.number().optional(),
          estimatedHeight: z.number().optional()
        })
        .optional(),
      confidence: z.number().min(0).max(1).optional(),
      notes: z.string().max(500).optional()
    });
    const validated = Result.safeParse(json);
    if (!validated.success) {
      return NextResponse.json(
        {error: 'schema_mismatch', details: validated.error.flatten(), raw: json},
        {status: 502}
      );
    }

    return NextResponse.json({
      ...validated.data,
      tokens: data.usage,
      model
    });
  } catch (e) {
    return NextResponse.json(
      {error: 'exception', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }
}
