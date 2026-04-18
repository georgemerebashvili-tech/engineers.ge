import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {authenticateBody} from '@/lib/me-auth';
import {hashPassword} from '@/lib/users';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200), // current password
  new_password: z.string().min(8).max(200)
});

export async function POST(req: NextRequest) {
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

  if (body.password === body.new_password) {
    return NextResponse.json(
      {error: 'same_password', message: 'ახალი პაროლი ძველისგან უნდა განსხვავდებოდეს'},
      {status: 400}
    );
  }

  try {
    const {hash, salt} = hashPassword(body.new_password);
    const {error} = await supabaseAdmin()
      .from('users')
      .update({password_hash: hash, password_salt: salt})
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
