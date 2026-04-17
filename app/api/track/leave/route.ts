import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  id: z.number().int().positive(),
  duration_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000)
});

export async function POST(req: NextRequest) {
  const visitorId = req.cookies.get('eng_vid')?.value;
  if (!visitorId) return new NextResponse(null, {status: 204});

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return new NextResponse(null, {status: 204});
  }

  try {
    await supabaseAdmin()
      .from('page_views')
      .update({
        left_at: new Date().toISOString(),
        duration_ms: body.duration_ms
      })
      .eq('id', body.id)
      .eq('visitor_id', visitorId);
  } catch {
    // supabase unavailable — silently drop, this is a fire-and-forget beacon
  }

  return new NextResponse(null, {status: 204});
}
