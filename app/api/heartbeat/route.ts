import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  visitor_id: z.string().uuid(),
  path: z.string().min(1).max(500),
  country: z.string().max(10).optional().nullable(),
  device: z.string().max(20).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ok: false}, {status: 400});
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ok: false}, {status: 400});

  const {visitor_id, path, country, device} = parsed.data;

  const db = supabaseAdmin();
  await db.from('visitor_sessions').upsert(
    {visitor_id, path, last_seen: new Date().toISOString(), country: country ?? null, device: device ?? null},
    {onConflict: 'visitor_id'}
  );

  // Periodic cleanup — ~10% of requests trigger it to avoid a cron dependency
  if (Math.random() < 0.1) {
    await db.rpc('cleanup_stale_visitor_sessions');
  }

  return NextResponse.json({ok: true});
}
