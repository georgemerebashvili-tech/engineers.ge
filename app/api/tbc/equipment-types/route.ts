import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const res = await supabaseAdmin()
    .from('tbc_equipment_types')
    .select('category, subtype')
    .order('category')
    .order('subtype');

  if (res.error) return NextResponse.json({error: 'db_error'}, {status: 500});
  return NextResponse.json({types: res.data || []});
}
