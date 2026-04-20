import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {toggleErrorResolved} from '@/lib/error-events';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({resolved: z.boolean()});

export async function PATCH(
  req: Request,
  ctx: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  const {id} = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
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

  try {
    await toggleErrorResolved(idNum, parsed.data.resolved);
    await logAdminAction({
      actor: session.user,
      action: parsed.data.resolved ? 'error.resolve' : 'error.reopen',
      target_type: 'error_events',
      target_id: String(idNum),
      metadata: {},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
