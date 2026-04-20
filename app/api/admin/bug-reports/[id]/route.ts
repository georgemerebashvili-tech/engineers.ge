import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {updateBugReport} from '@/lib/bug-reports';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'archived']).optional(),
  admin_note: z.string().max(2000).optional().nullable()
});

export async function PATCH(
  req: Request,
  ctx: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  const {id} = await ctx.params;

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
    const updated = await updateBugReport(id, parsed.data);
    await logAdminAction({
      actor: session.user,
      action: 'bug.update',
      target_type: 'bug_report',
      target_id: id,
      metadata: parsed.data,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true, report: updated});
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return NextResponse.json({error: 'failed', message: msg}, {status: 500});
  }
}
