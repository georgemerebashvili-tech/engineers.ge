import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {
  issueTbcResetToken,
  sendTbcResetEmail
} from '@/lib/tbc/password-reset';

export const dynamic = 'force-dynamic';

const Body = z.object({
  identifier: z.string().min(1).max(256) // username or email
});

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const id = parsed.data.identifier.trim().toLowerCase();
  const db = supabaseAdmin();

  // Match by username or email
  const byUsername = await db
    .from('tbc_users')
    .select('id, username, email, display_name, active')
    .eq('username', id)
    .maybeSingle();

  let user = byUsername.data;
  if (!user) {
    const byEmail = await db
      .from('tbc_users')
      .select('id, username, email, display_name, active')
      .ilike('email', id)
      .maybeSingle();
    user = byEmail.data;
  }

  // Always reply 200 to avoid account enumeration
  const okResponse = NextResponse.json({ok: true});

  if (!user || !user.active) return okResponse;
  if (!user.email) {
    // No email on file — nothing we can do. Admin must set email first.
    console.log('[tbc password-reset] no email for user', user.username);
    return okResponse;
  }

  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null;

  try {
    const {token} = await issueTbcResetToken({
      userId: user.id as string,
      email: user.email as string,
      ip
    });

    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('host') || 'engineers.ge';
    const resetUrl = `${proto}://${host}/tbc/reset-password?token=${encodeURIComponent(token)}`;

    await sendTbcResetEmail({
      to: user.email as string,
      username: user.username as string,
      displayName: (user.display_name as string) || null,
      resetUrl
    });
  } catch (e) {
    console.error('[tbc password-reset] request failed', e);
  }

  return okResponse;
}
