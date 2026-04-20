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

  const systemPrompt = `You are an HVAC equipment expert who writes in Georgian (ქართული Mkhedruli). You will receive identifying info about a device (and optionally a photo of its nameplate/label). PRIORITY: if a photo with a nameplate is provided, read the nameplate FIRST — model/serial/rating on the label beats any database assumption.

Research and return technical specifications that are NOT typically captured in a basic inventory table.

Return a single JSON object with these fields (set to null if unknown). TEXT FIELDS MUST BE IN GEORGIAN:
- serial_format: ქართულად — ახსნა, რას ნიშნავს სერიული ნომრის ნაწილები (წარმოების წელი, ქარხანა, ვარიანტი).
- capacity_kw: სიმძლავრე kW-ში (მაგ. "2.5 კვტ ცივი / 3.2 კვტ თბილი").
- capacity_btu: სიმძლავრე BTU/h-ში.
- refrigerant: ფრეონის ტიპი (მაგ. "R32", "R410A").
- power_supply: ძაბვა/ფაზა (მაგ. "220V / 1 ფაზა / 50 Hz").
- power_consumption: მოხმარება kW-ში.
- seer_cop: ეფექტურობა (SEER/EER/COP).
- production_year: წარმოების სავარაუდო წელი.
- weight_kg: წონა კგ-ში.
- dimensions: ზომა (სიგრ×სიმა×სიღრ, მმ).
- features: 2-5 თვისების მასივი ქართულად (მაგ. ["ინვერტორი", "Wi-Fi მართვა", "R32 ფრეონი"]).
- typical_price: საბაზრო ფასი ლარში ("1200–1800 ₾").
- notes: 1-2 წინადადება ქართულად ამ კონკრეტული მოდელის შესახებ — ცნობილი პრობლემები, განსაკუთრებული მახასიათებლები.

წესები:
1. ტექნიკური ერთეულები (kW, BTU, R32, 220V, Hz, dB, SEER, COP) ლათინურად/სტანდარტული ფორმით დატოვე. სხვა ყველა ტექსტი — ქართულად.
2. თუ არ იცი — დააწერე null, არ გამოიცნო.
3. მხოლოდ JSON ობიექტი დააბრუნე, არანაირი proza ან markdown fences.`;

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
