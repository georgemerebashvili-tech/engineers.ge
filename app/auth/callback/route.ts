import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  const errorDesc = url.searchParams.get('error_description');

  if (errorDesc) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(errorDesc)}`, url.origin)
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', url.origin));
  }

  const sb = await supabaseServer();
  const {data, error} = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent(error?.message ?? 'exchange_failed')}`,
        url.origin
      )
    );
  }

  const u = data.user;
  const email = (u.email ?? '').toLowerCase();
  const name =
    (u.user_metadata?.full_name as string | undefined) ??
    (u.user_metadata?.name as string | undefined) ??
    email.split('@')[0];
  const provider = u.app_metadata?.provider ?? 'oauth';
  const avatar = (u.user_metadata?.avatar_url as string | undefined) ?? null;

  try {
    const admin = supabaseAdmin();
    const {data: existing} = await admin
      .from('users')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();

    if (!existing && email) {
      await admin.from('users').insert({
        email,
        name,
        country_id: null,
        language: 'ka',
        profession: null,
        password_hash: `oauth:${provider}`,
        password_salt: 'oauth',
        hash_algo: 'oauth',
        email_verified: true,
        visitor_id: null
      });
    } else if (existing) {
      await admin
        .from('users')
        .update({last_login_at: new Date().toISOString()})
        .eq('id', existing.id);
    }
  } catch {
    // non-blocking
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
