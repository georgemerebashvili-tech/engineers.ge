import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';
import {restoreUser} from '@/lib/users';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  if (!id) return NextResponse.json({error: 'bad_request'}, {status: 400});

  try {
    await restoreUser(id);
    await logAdminAction({
      actor: session.user,
      action: 'user.restore',
      target_type: 'users',
      target_id: id,
      ip: getIp(req.headers)
    });
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server error'},
      {status: 500}
    );
  }
}
