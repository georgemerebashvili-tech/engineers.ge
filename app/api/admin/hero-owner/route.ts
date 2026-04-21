import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  image_url: z.string().max(2000).default(''),
  name: z.string().min(1).max(120),
  title: z.string().max(160).default(''),
  bio: z.string().max(2000).default('')
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

  try {
    const {error} = await supabaseAdmin()
      .from('hero_owner')
      .upsert(
        {
          id: 1,
          image_url: body.image_url,
          name: body.name,
          title: body.title,
          bio: body.bio,
          updated_at: new Date().toISOString()
        },
        {onConflict: 'id'}
      );

    if (error) throw error;
    await logAdminAction({
      actor: session.user,
      action: 'hero_owner.upsert',
      target_type: 'hero_owner',
      target_id: '1',
      metadata: {name: body.name, title: body.title, has_image: Boolean(body.image_url)},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[admin/hero-owner] upsert failed', error);
    return NextResponse.json({error: 'db'}, {status: 500});
  }
}
