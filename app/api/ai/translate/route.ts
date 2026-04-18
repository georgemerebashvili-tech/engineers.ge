import {NextResponse} from 'next/server';
import {z} from 'zod';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LANG_NAMES: Record<string, string> = {
  ka: 'Georgian',
  en: 'English',
  ru: 'Russian',
  tr: 'Turkish',
  az: 'Azerbaijani',
  hy: 'Armenian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian'
};

const Body = z.object({
  text: z.string().min(1).max(8000),
  target: z.string().min(2).max(5),
  source: z.string().min(2).max(5).optional(),
  tone: z.enum(['neutral', 'technical', 'casual']).optional()
});

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
      {
        error: 'ai_not_configured',
        message: 'ANTHROPIC_API_KEY არ არის დაყენებული. Admin → AI → დაამატე key.'
      },
      {status: 503}
    );
  }
  const model = await resolveAiModel();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }

  const {text, target, source, tone} = parsed.data;
  const targetName = LANG_NAMES[target] ?? target;
  const sourceHint = source
    ? ` from ${LANG_NAMES[source] ?? source}`
    : ' (detect the source language)';
  const toneLine = tone
    ? `\nTone: ${tone}. Keep terminology accurate (engineering context: HVAC, heat loss, ventilation, standards like EN 12101, ASHRAE, ISO 6946).`
    : '';

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
        max_tokens: 2000,
        system: `You are a professional translator for engineers.ge, a Georgian HVAC/engineering platform. Translate the user's text${sourceHint} to ${targetName}. Output ONLY the translated text, no preamble, no quotes, no notes.${toneLine}`,
        messages: [{role: 'user', content: text}]
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

    const translated =
      data.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('') ?? '';

    return NextResponse.json({
      translated,
      target,
      source: source ?? 'auto',
      tokens: data.usage
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'exception',
        message: e instanceof Error ? e.message : 'unknown'
      },
      {status: 500}
    );
  }
}
