import {NextResponse} from 'next/server';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  try {
    const {data, error} = await supabaseAdmin()
      .from('dmt_fb_leads')
      .select(
        'id, leadgen_id, page_id, ad_id, adset_id, campaign_id, form_id, form_name, created_time, full_name, phone, email, lead_status, field_data, received_at'
      )
      .order('created_time', {ascending: false})
      .limit(500);
    if (error) return NextResponse.json({error: error.message, leads: []});
    return NextResponse.json({leads: data ?? []});
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'fetch_failed',
      leads: []
    });
  }
}
