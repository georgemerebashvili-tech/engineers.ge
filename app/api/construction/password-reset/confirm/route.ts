import {NextResponse} from 'next/server';
import {z} from 'zod';
import {consumeConstructionResetToken} from '@/lib/construction/password-reset';
import {issueConstructionSession, getConstructionSession} from '@/lib/construction/auth';
import {writeConstructionAudit} from '@/lib/construction/audit';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(1).max(256),
  password: z.string().min(6).max(128)
});

export async function POST(req: Request) {
  let data: unknown;
  try { data = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(data);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const result = await consumeConstructionResetToken(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({error: 'reset_failed', reason: result.reason}, {status: 400});
  }

  const db = supabaseAdmin();
  const row = await db.from('construction_users').select('id, username, role, display_name').eq('id', result.userId).maybeSingle();
  if (row.data) {
    await issueConstructionSession({
      id: row.data.id as string,
      username: row.data.username as string,
      role: (row.data.role as 'admin' | 'user') || 'user',
      displayName: (row.data.display_name as string) || null
    });
  }

  await writeConstructionAudit({
    actor: result.username,
    action: 'password_reset.confirm',
    targetType: 'user',
    targetId: result.userId,
    summary: `${result.username}-მ პაროლი შეცვალა reset ბმულით`
  });

  return NextResponse.json({ok: true});
}
