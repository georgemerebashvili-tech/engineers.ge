import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_lead_label_suggestions')
    .select('label')
    .order('use_count', {ascending: false})
    .order('label', {ascending: true})
    .limit(50);

  if (error) return jsonError(error);
  return NextResponse.json({labels: (data ?? []).map((row) => String(row.label))});
}
