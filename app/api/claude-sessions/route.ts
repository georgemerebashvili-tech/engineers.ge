import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  session_id: z.string().min(1).max(200),
  kind: z.enum(['start', 'end', 'stop', 'heartbeat']),
  client_at: z.string().datetime().optional(),
  project: z.string().max(200).nullable().optional(),
  cwd: z.string().max(1000).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  raw: z.unknown().optional()
});

export async function POST(req: NextRequest) {
  const secret = process.env.CLAUDE_HOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {error: 'CLAUDE_HOOK_SECRET not configured'},
      {status: 503}
    );
  }

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== secret) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      {error: 'bad body', detail: e instanceof Error ? e.message : 'parse error'},
      {status: 400}
    );
  }

  const ua = req.headers.get('user-agent') || null;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  try {
    const {data, error} = await supabaseAdmin()
      .from('claude_session_events')
      .insert({
        session_id: body.session_id,
        kind: body.kind,
        client_at: body.client_at ?? null,
        project: body.project ?? null,
        cwd: body.cwd ?? null,
        model: body.model ?? null,
        user_agent: ua,
        source_ip: ip,
        raw: body.raw ?? null
      })
      .select('id, event_at')
      .single();

    if (error) {
      console.error('[claude-sessions] insert failed', error.message);
      return NextResponse.json({error: error.message}, {status: 500});
    }
    return NextResponse.json({id: data.id, event_at: data.event_at});
  } catch (e) {
    console.error('[claude-sessions] supabase error', e);
    return NextResponse.json(
      {error: e instanceof Error ? e.message : 'supabase error'},
      {status: 500}
    );
  }
}
