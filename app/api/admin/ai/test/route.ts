import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {resolveAnthropicKey, resolveAiModel} from '@/lib/ai-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  const apiKey = await resolveAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      {ok: false, error: 'no_key', message: 'API key არ არის დაყენებული'},
      {status: 400}
    );
  }
  const model = await resolveAiModel();
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
        max_tokens: 40,
        messages: [
          {role: 'user', content: 'Say "OK" in Georgian (ქართულად) and nothing else.'}
        ]
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'upstream',
          status: res.status,
          message: (body as {error?: {message?: string}})?.error?.message ?? 'unknown'
        },
        {status: 502}
      );
    }
    const text =
      (body as {content?: {type: string; text?: string}[]}).content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('') ?? '';
    return NextResponse.json({ok: true, model, response: text.trim()});
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: 'exception',
        message: e instanceof Error ? e.message : 'unknown'
      },
      {status: 500}
    );
  }
}
