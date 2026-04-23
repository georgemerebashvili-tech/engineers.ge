import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {getConstructionSession} from '@/lib/construction/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {writeConstructionAudit} from '@/lib/construction/audit';

const PatchBody = z.object({
  display_name: z.string().max(128).nullable().optional(),
  email: z.string().email().max(256).nullable().optional().or(z.literal('')),
  role: z.enum(['admin', 'user']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).max(128).optional()
});

export async function PATCH(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  const target = await db.from('construction_users').select('id, username, is_static, role').eq('id', id).maybeSingle();
  if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  if (target.data.is_static) {
    if (parsed.data.role && parsed.data.role !== 'admin') return NextResponse.json({error: 'static_admin_locked'}, {status: 403});
    if (parsed.data.active === false) return NextResponse.json({error: 'static_admin_locked'}, {status: 403});
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.display_name !== undefined) update.display_name = parsed.data.display_name;
  if (parsed.data.email !== undefined) update.email = parsed.data.email ? String(parsed.data.email).trim().toLowerCase() : null;
  if (parsed.data.role !== undefined) update.role = parsed.data.role;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;
  if (parsed.data.password) update.password_hash = await bcrypt.hash(parsed.data.password, 10);
  if (Object.keys(update).length === 0) return NextResponse.json({ok: true, noop: true});

  const res = await db.from('construction_users').update(update).eq('id', id).select('id, username, display_name, role, active').single();
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  const changes: Record<string, unknown> = {};
  for (const k of Object.keys(update)) {
    changes[k] = k === 'password_hash' ? '***changed***' : update[k];
  }
  await writeConstructionAudit({
    actor: session.username,
    action: update.password_hash ? 'user.reset_password' : 'user.update',
    targetType: 'user',
    targetId: id,
    summary: update.password_hash
      ? `პაროლი შეცვალა ${res.data.username}-ს`
      : `განაახლა ${res.data.username}: ${Object.keys(changes).join(', ')}`,
    metadata: {username: res.data.username, changes}
  });

  return NextResponse.json({ok: true, user: res.data});
}

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {id} = await params;
  const db = supabaseAdmin();
  const target = await db.from('construction_users').select('id, username, is_static, role, email, display_name').eq('id', id).maybeSingle();
  if (!target.data) return NextResponse.json({error: 'not_found'}, {status: 404});
  if (target.data.is_static) return NextResponse.json({error: 'static_admin_locked'}, {status: 403});

  const res = await db.from('construction_users').delete().eq('id', id);
  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});

  await writeConstructionAudit({
    actor: session.username,
    action: 'user.delete',
    targetType: 'user',
    targetId: id,
    summary: `წაშალა მომხმარებელი "${target.data.username}"`,
    metadata: {username: target.data.username, role: target.data.role}
  });

  return NextResponse.json({ok: true});
}
