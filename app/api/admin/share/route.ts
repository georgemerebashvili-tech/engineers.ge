import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  facebook: z.boolean(),
  x: z.boolean(),
  linkedin: z.boolean(),
  telegram: z.boolean(),
  whatsapp: z.boolean(),
  copy_link: z.boolean()
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({error: 'bad body', detail: String(e)}, {status: 400});
  }

  const {error} = await supabaseAdmin()
    .from('share_settings')
    .upsert({id: 1, ...body, updated_at: new Date().toISOString()});

  if (error) {
    console.error('[admin/share] upsert failed', error.message);
    return NextResponse.json({error: 'db'}, {status: 500});
  }

  return NextResponse.json({ok: true});
}
