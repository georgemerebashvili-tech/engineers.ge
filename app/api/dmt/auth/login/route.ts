import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticateDmt, issueDmtSession} from '@/lib/dmt/auth';
import {logDmtAudit, extractRequestMeta} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  const meta = extractRequestMeta(req);
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
  const email = parsed.data.email.trim().toLowerCase();
  const {user, error} = await authenticateDmt(email, parsed.data.password);
  if (!user) {
    await logDmtAudit({
      action: 'login.fail',
      entity_type: 'session',
      actor_email: email,
      payload: {reason: error ?? 'auth_failed'},
      ...meta
    });
    return NextResponse.json({error: error ?? 'auth_failed'}, {status: 401});
  }
  await issueDmtSession(user.id, user.email, user.role);
  await logDmtAudit({
    action: 'login.success',
    entity_type: 'session',
    entity_id: user.id,
    actor_id: user.id,
    actor_email: user.email,
    actor_role: user.role,
    ...meta
  });
  return NextResponse.json({user});
}
