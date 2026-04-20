import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {
  FEATURE_REGISTRY,
  getFeatureFlagsDetailed,
  setFeatureFlag,
  isValidStatus
} from '@/lib/feature-flags';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  const flags = await getFeatureFlagsDetailed();
  return NextResponse.json({registry: FEATURE_REGISTRY, flags});
}

const Body = z.object({
  key: z.string().min(1).max(120),
  status: z.enum(['active', 'test', 'hidden']),
  note: z.string().max(500).optional().nullable()
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
  if (!parsed.success || !isValidStatus(parsed.data.status)) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  try {
    const updated = await setFeatureFlag(
      parsed.data.key,
      parsed.data.status,
      session.user,
      parsed.data.note ?? undefined
    );
    await logAdminAction({
      actor: session.user,
      action: 'feature.set',
      target_type: 'feature_flag',
      target_id: parsed.data.key,
      metadata: {status: parsed.data.status, note: parsed.data.note ?? null},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true, flag: updated});
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    const isMissingTable = /relation .* does not exist|feature_flags/i.test(msg);
    return NextResponse.json(
      {
        error: 'failed',
        message: msg,
        hint: isMissingTable
          ? 'გაუშვი migration: supabase/migrations/0015_feature_flags.sql'
          : undefined
      },
      {status: 500}
    );
  }
}
