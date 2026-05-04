import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {contactAuditFromDb, jsonError, requireDmtUser} from '@/lib/dmt/shared-state-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDmtUser();
  if (auth.response) return auth.response;

  const {data, error} = await supabaseAdmin()
    .from('dmt_contacts_audit')
    .select('*')
    .order('at', {ascending: false})
    .limit(500);

  if (error) return jsonError(error);
  return NextResponse.json({audit: (data ?? []).map(contactAuditFromDb)});
}
