import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {deleteRedirect, updateRedirect} from '@/lib/redirects';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  destination: z.string().min(1).max(500).optional(),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  note: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional()
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: {params: Promise<{id: string}>}) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await ctx.params;
  const idNum = parseId(id);
  if (!idNum) return NextResponse.json({error: 'bad_request'}, {status: 400});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  try {
    const updated = await updateRedirect(idNum, parsed.data);
    await logAdminAction({
      actor: session.user,
      action: 'redirect.update',
      target_type: 'redirects',
      target_id: String(idNum),
      metadata: parsed.data,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true, redirect: updated});
  } catch (e) {
    return NextResponse.json({error: 'failed', message: e instanceof Error ? e.message : 'error'}, {status: 500});
  }
}

export async function DELETE(req: Request, ctx: {params: Promise<{id: string}>}) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await ctx.params;
  const idNum = parseId(id);
  if (!idNum) return NextResponse.json({error: 'bad_request'}, {status: 400});

  try {
    await deleteRedirect(idNum);
    await logAdminAction({
      actor: session.user,
      action: 'redirect.delete',
      target_type: 'redirects',
      target_id: String(idNum),
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json({error: 'failed', message: e instanceof Error ? e.message : 'error'}, {status: 500});
  }
}
