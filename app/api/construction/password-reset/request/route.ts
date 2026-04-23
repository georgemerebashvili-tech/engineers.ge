import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {issueConstructionResetToken, sendConstructionResetEmail} from '@/lib/construction/password-reset';
import {writeConstructionAudit} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';

const Body = z.object({
  identifier: z.string().min(1).max(256)
});

export async function POST(req: Request) {
  let data: unknown;
  try { data = await req.json(); } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(data);
  if (!parsed.success) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const id = parsed.data.identifier.trim().toLowerCase();
  const db = supabaseAdmin();

  const byUsername = await db.from('construction_users').select('id, username, email, display_name, active').eq('username', id).maybeSingle();
  let user = byUsername.data;
  if (!user) {
    const byEmail = await db.from('construction_users').select('id, username, email, display_name, active').ilike('email', id).maybeSingle();
    user = byEmail.data;
  }

  const okResponse = NextResponse.json({ok: true});
  if (!user || !user.active || !user.email) return okResponse;

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host') || 'engineers.ge';

  try {
    const {token} = await issueConstructionResetToken({
      userId: user.id as string,
      email: user.email as string,
      ip
    });
    const resetUrl = `${proto}://${host}/construction/reset-password?token=${encodeURIComponent(token)}`;
    await sendConstructionResetEmail({
      to: user.email as string,
      username: user.username as string,
      displayName: (user.display_name as string) || null,
      resetUrl
    });
    await writeConstructionAudit({
      actor: user.username as string,
      action: 'password_reset.request',
      targetType: 'user',
      targetId: user.id as string,
      summary: `${user.username}-მ ითხოვა პაროლის აღდგენა`,
      metadata: {via: 'public_forgot_form'}
    });
  } catch (e) {
    console.error('[construction password-reset] request failed', e);
  }

  return okResponse;
}
