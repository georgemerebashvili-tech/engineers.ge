import {NextResponse} from 'next/server';
import {getCurrentDmtUser, isPrivilegedRole} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Returns webhook configuration status for owners/admins.
// Verify token is shown in full (needed to paste in Meta Dashboard);
// page token + app secret are shown as ***…last4 so you can confirm they're set.
function mask(v?: string | null) {
  if (!v) return null;
  if (v.length <= 8) return '***';
  return '***' + v.slice(-4);
}

export async function GET(req: Request) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const origin = new URL(req.url).origin;
  const callbackUrl = `${origin}/api/dmt/fb-webhook`;
  const verifyToken = process.env.FB_VERIFY_TOKEN ?? null;
  const appSecret = process.env.FB_APP_SECRET ?? null;
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN ?? null;

  let leadCount = 0;
  let latestLeadAt: string | null = null;
  try {
    const {count} = await supabaseAdmin()
      .from('dmt_fb_leads')
      .select('id', {count: 'exact', head: true});
    leadCount = count ?? 0;
    const {data} = await supabaseAdmin()
      .from('dmt_fb_leads')
      .select('received_at')
      .order('received_at', {ascending: false})
      .limit(1)
      .maybeSingle();
    latestLeadAt = (data as {received_at?: string} | null)?.received_at ?? null;
  } catch {}

  return NextResponse.json({
    callbackUrl,
    verifyToken,
    appSecret: mask(appSecret),
    pageToken: mask(pageToken),
    ready: !!(verifyToken && appSecret),
    leadCount,
    latestLeadAt,
    graphVersion: 'v20.0'
  });
}
