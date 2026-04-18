import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {authenticateBody} from '@/lib/me-auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  confirm: z.literal('DELETE')
});

// Soft-delete: sets deleted_at = now(). The cron job purges rows older than 10 days.
// Until purged, the row is hidden from listUsers() (deleted_at is null filter).
export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      {error: 'bad_request', message: 'DELETE confirmation required'},
      {status: 400}
    );
  }

  const auth = await authenticateBody(body);
  if (!auth.ok) {
    return NextResponse.json(
      {error: auth.error, message: auth.message},
      {status: auth.status}
    );
  }

  try {
    const {error} = await supabaseAdmin()
      .from('users')
      .update({deleted_at: new Date().toISOString()})
      .eq('id', auth.user.id);
    if (error) throw error;
    return NextResponse.json({ok: true, soft_deleted: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'server', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
