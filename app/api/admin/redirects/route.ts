import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {createRedirect, normalizeSource} from '@/lib/redirects';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  source: z.string().min(1).max(500),
  destination: z.string().min(1).max(500),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  note: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request', issues: parsed.error.flatten()}, {status: 400});
  }

  const normalized = normalizeSource(parsed.data.source);
  if (!normalized) {
    return NextResponse.json({error: 'bad_request', message: 'source cannot be empty'}, {status: 400});
  }

  try {
    const created = await createRedirect({
      ...parsed.data,
      source: normalized,
      created_by: session.user
    });
    await logAdminAction({
      actor: session.user,
      action: 'redirect.create',
      target_type: 'redirects',
      target_id: String(created.id),
      metadata: {source: created.source, destination: created.destination, status: created.status_code},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true, redirect: created});
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    const isDup = /duplicate key|unique constraint/i.test(msg);
    const isMissing = /relation .* does not exist|redirects/i.test(msg);
    return NextResponse.json(
      {
        error: 'failed',
        message: msg,
        hint: isDup
          ? 'ეს source უკვე არსებობს — განაახლე ან წაშალე.'
          : isMissing
          ? 'migration 0020_redirects.sql-ი უნდა გაიდევნოს Supabase-ზე.'
          : undefined
      },
      {status: isDup ? 409 : 500}
    );
  }
}
