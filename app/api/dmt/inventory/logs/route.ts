import {NextResponse} from 'next/server';
import {getCurrentDmtUser} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/dmt/inventory/logs
export async function GET() {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {data, error} = await supabaseAdmin()
    .from('dmt_inventory_logs')
    .select('*')
    .order('created_at', {ascending: false})
    .limit(200);

  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({logs: data});
}
