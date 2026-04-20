import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {getSession} from '@/lib/auth';
import {setVerifiedEngineer} from '@/lib/users';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({verified: z.boolean()});

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  if (!id) return NextResponse.json({error: 'bad_request'}, {status: 400});

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  try {
    await setVerifiedEngineer({
      user_id: id,
      verified: body.verified,
      admin_id: null
    });
    await logAdminAction({
      actor: session.user,
      action: 'user.verify_engineer',
      target_type: 'users',
      target_id: id,
      metadata: {verified: body.verified},
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server'},
      {status: 500}
    );
  }
}
