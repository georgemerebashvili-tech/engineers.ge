import {NextResponse} from 'next/server';
import {z} from 'zod';
import {
  deleteDmtUser,
  getCurrentDmtUser,
  isPrivilegedRole,
  listDmtUsers,
  updateDmtUser
} from '@/lib/dmt/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  const users = await listDmtUsers();
  return NextResponse.json({users});
}

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(120).optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
  status: z.enum(['active', 'invited', 'suspended']).optional()
});

export async function PATCH(req: Request) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const {id, ...patch} = parsed.data;
  try {
    await updateDmtUser(id, patch);
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'update_failed', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }
}

export async function DELETE(req: Request) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({error: 'missing_id'}, {status: 400});
  if (id === me.id)
    return NextResponse.json({error: 'cannot_delete_self'}, {status: 400});

  try {
    await deleteDmtUser(id);
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'delete_failed', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }
}
