import {NextResponse} from 'next/server';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {count: fbLeads} = await supabaseAdmin()
    .from('dmt_fb_leads')
    .select('id', {count: 'exact', head: true});

  return NextResponse.json({fbLeads: fbLeads ?? 0});
}
