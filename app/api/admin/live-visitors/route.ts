import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const {data, error} = await supabaseAdmin()
    .from('visitor_sessions')
    .select('visitor_id, path, last_seen, country, device')
    .gte('last_seen', cutoff)
    .order('last_seen', {ascending: false});

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  // Group by path
  const byPath = new Map<string, number>();
  for (const row of data ?? []) {
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  }
  const pages = Array.from(byPath.entries())
    .map(([path, count]) => ({path, count}))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total: data?.length ?? 0,
    pages,
    updated_at: new Date().toISOString(),
  });
}
