import {NextResponse} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  createDmtUser,
  issueDmtSession,
  getCurrentDmtUser,
  isPrivilegedRole
} from '@/lib/dmt/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional()
});

export async function POST(req: Request) {
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

  if (isFirst) {
    role = 'owner';
  } else {
    // Subsequent registrations require a logged-in admin/owner.
    const current = await getCurrentDmtUser();
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

  return NextResponse.json({user, bootstrap: isFirst});
}
