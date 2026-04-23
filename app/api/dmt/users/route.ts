import {NextResponse} from 'next/server';
import {z} from 'zod';
import {
  deleteDmtUser,
  getCurrentDmtUser,
  isPrivilegedRole,
  listDmtUsers,
  updateDmtUser
} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {logDmtAudit, extractRequestMeta} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  const users = await listDmtUsers();
  return NextResponse.json({
    users,
    me: {id: me.id, name: me.name, email: me.email, role: me.role, settings: me.settings}
  });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(120).optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
  status: z.enum(['active', 'invited', 'suspended']).optional()
});

async function countOwners(): Promise<number> {
  const {count} = await supabaseAdmin()
    .from('dmt_users')
    .select('id', {count: 'exact', head: true})
    .eq('role', 'owner')
    .eq('status', 'active');
  return count ?? 0;
}

async function fetchTarget(id: string) {
  const {data} = await supabaseAdmin()
    .from('dmt_users')
    .select('id,email,name,role,status')
    .eq('id', id)
    .maybeSingle();
  return data as
    | {id: string; email: string; name: string; role: string; status: string}
    | null;
}

export async function PATCH(req: Request) {
  const meta = extractRequestMeta(req);
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
  const target = await fetchTarget(id);
  if (!target) return NextResponse.json({error: 'not_found'}, {status: 404});

  // Protect the last owner: nobody (not even themselves) can demote/suspend.
  const demotingOwner =
    target.role === 'owner' &&
    ((patch.role && patch.role !== 'owner') ||
      (patch.status && patch.status !== 'active'));
  if (demotingOwner) {
    const owners = await countOwners();
    if (owners <= 1) {
      await logDmtAudit({
        action: 'user.update',
        entity_type: 'dmt_user',
        entity_id: id,
        payload: {denied: 'last_owner', attempted: patch, target: target.email},
        ...meta
      });
      return NextResponse.json(
        {error: 'last_owner', message: 'ბოლო owner-ის დაქვეითება/გაყინვა დაუშვებელია'},
        {status: 400}
      );
    }
  }

  // Only owner can change roles. Admins can update name/status only.
  if (patch.role && me.role !== 'owner') {
    return NextResponse.json(
      {error: 'forbidden', message: 'როლის შეცვლა მხოლოდ owner-ს შეუძლია'},
      {status: 403}
    );
  }

  try {
    await updateDmtUser(id, patch);
    await logDmtAudit({
      action: 'user.update',
      entity_type: 'dmt_user',
      entity_id: id,
      payload: {
        before: {name: target.name, role: target.role, status: target.status},
        patch
      },
      ...meta
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'update_failed', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }
}

export async function DELETE(req: Request) {
  const meta = extractRequestMeta(req);
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  // Destructive action — owner only. Admin cannot delete.
  if (me.role !== 'owner') {
    await logDmtAudit({
      action: 'user.delete.denied',
      entity_type: 'dmt_user',
      payload: {reason: 'owner_only', attempted_role: me.role},
      ...meta
    });
    return NextResponse.json(
      {error: 'forbidden', message: 'მომხმარებლის წაშლა მხოლოდ owner-ს შეუძლია'},
      {status: 403}
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({error: 'missing_id'}, {status: 400});
  if (id === me.id)
    return NextResponse.json({error: 'cannot_delete_self'}, {status: 400});

  const target = await fetchTarget(id);
  if (!target) return NextResponse.json({error: 'not_found'}, {status: 404});

  // Never delete the last active owner.
  if (target.role === 'owner') {
    const owners = await countOwners();
    if (owners <= 1) {
      await logDmtAudit({
        action: 'user.delete.denied',
        entity_type: 'dmt_user',
        entity_id: id,
        payload: {reason: 'last_owner', target: target.email},
        ...meta
      });
      return NextResponse.json(
        {error: 'last_owner', message: 'ბოლო owner-ის წაშლა დაუშვებელია'},
        {status: 400}
      );
    }
  }

  try {
    await deleteDmtUser(id);
    await logDmtAudit({
      action: 'user.delete',
      entity_type: 'dmt_user',
      entity_id: id,
      payload: {
        deleted: {id: target.id, email: target.email, name: target.name, role: target.role}
      },
      ...meta
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'delete_failed', message: e instanceof Error ? e.message : 'unknown'},
      {status: 500}
    );
  }
}
