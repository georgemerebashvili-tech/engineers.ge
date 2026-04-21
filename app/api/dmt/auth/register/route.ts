import {NextResponse} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  createDmtUser,
  issueDmtSession,
  getCurrentDmtUser,
  isPrivilegedRole
} from '@/lib/dmt/auth';
import {logDmtAudit, extractRequestMeta} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional()
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
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }

  // First-user bootstrap: if table is empty → register as owner without auth.
  const {count} = await supabaseAdmin()
    .from('dmt_users')
    .select('id', {count: 'exact', head: true});
  const isFirst = (count ?? 0) === 0;

  let invited_by: string | null = null;
  let role = parsed.data.role ?? 'member';
  let current: Awaited<ReturnType<typeof getCurrentDmtUser>> = null;

  if (isFirst) {
    role = 'owner';
  } else {
    current = await getCurrentDmtUser();
    if (!current || !isPrivilegedRole(current.role)) {
      return NextResponse.json(
        {error: 'forbidden', message: 'მხოლოდ admin/owner-ს შეუძლია ახალი მომხმარებლის დამატება'},
        {status: 403}
      );
    }
    invited_by = current.id;
  }

  const {user, error} = await createDmtUser({...parsed.data, role, invited_by});
  if (!user) return NextResponse.json({error: error ?? 'register_failed'}, {status: 400});

  if (isFirst) {
    await issueDmtSession(user.id, user.email, user.role);
  }

  await logDmtAudit({
    action: isFirst ? 'register.bootstrap' : 'register.invite',
    entity_type: 'dmt_user',
    entity_id: user.id,
    actor_id: current?.id ?? user.id,
    actor_email: current?.email ?? user.email,
    actor_role: current?.role ?? user.role,
    payload: {
      new_user: {id: user.id, email: user.email, name: user.name, role: user.role}
    },
    ...meta
  });

  return NextResponse.json({user, bootstrap: isFirst});
}
