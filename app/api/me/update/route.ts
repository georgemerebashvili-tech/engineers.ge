import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {authenticateBody} from '@/lib/me-auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LANGS = ['ka', 'en', 'ru', 'tr', 'az', 'hy'] as const;

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  name: z.string().min(2).max(120).optional(),
  language: z.enum(LANGS).optional(),
  profession: z.string().max(120).nullable().optional()
});

export async function PATCH(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const auth = await authenticateBody(body);
  if (!auth.ok) {
    return NextResponse.json(
      {error: auth.error, message: auth.message},
      {status: auth.status}
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.language !== undefined) patch.language = body.language;
  if (body.profession !== undefined) patch.profession = body.profession;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ok: true, noop: true});
  }

  try {
    const {error} = await supabaseAdmin()
      .from('users')
      .update(patch)
      .eq('id', auth.user.id);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
