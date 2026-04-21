import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const {count} = await supabaseAdmin()
      .from('dmt_users')
      .select('id', {count: 'exact', head: true});
    return NextResponse.json({isEmpty: (count ?? 0) === 0});
  } catch {
    return NextResponse.json({isEmpty: false});
  }
}
