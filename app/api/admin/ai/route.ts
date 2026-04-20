import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {getAiSettings, updateAiSettings} from '@/lib/ai-settings';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  const settings = await getAiSettings();
  if (!settings) {
    return NextResponse.json({
      settings: null,
      message:
        'ai_settings table არ არის. გაუშვი migration 0008_ai_settings.sql.'
    });
  }
  return NextResponse.json({
    settings: {
      ...settings,
      anthropic_api_key: settings.anthropic_api_key
        ? mask(settings.anthropic_api_key)
        : null,
      has_key: !!settings.anthropic_api_key
    }
  });
}

const Body = z.object({
  anthropic_api_key: z.string().min(10).max(500).optional().nullable(),
  default_model: z.string().min(3).max(120).optional(),
  enabled: z.boolean().optional(),
  clear_key: z.boolean().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const {clear_key, ...patch} = parsed.data;
  if (clear_key) {
    (patch as {anthropic_api_key?: string | null}).anthropic_api_key = null;
  }
  try {
    const updated = await updateAiSettings(patch);
    await logAdminAction({
      actor: session.user,
      action: 'ai.update',
      target_type: 'ai_settings',
      target_id: '1',
      metadata: {
        key_changed: 'anthropic_api_key' in patch || !!clear_key,
        clear_key: !!clear_key,
        default_model: patch.default_model,
        enabled: patch.enabled
      },
      ip: getIp(req.headers)
    });
    return NextResponse.json({
      ok: true,
      settings: {
        ...updated,
        anthropic_api_key: updated.anthropic_api_key
          ? mask(updated.anthropic_api_key)
          : null,
        has_key: !!updated.anthropic_api_key
      }
    });
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}

function mask(key: string) {
  if (key.length <= 12) return '••••';
  return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
}
