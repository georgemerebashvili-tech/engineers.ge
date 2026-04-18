import {NextResponse, type NextRequest} from 'next/server';
import {getSession} from '@/lib/auth';
import {purgeUser, softDeleteUser} from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  const {id} = await params;
  if (!id) return NextResponse.json({error: 'bad_request'}, {status: 400});

  const url = new URL(req.url);
  const purge = url.searchParams.get('purge') === '1';

  try {
    if (purge) {
      await purgeUser(id);
    } else {
      await softDeleteUser(id);
    }
    return NextResponse.json({ok: true});
  } catch (e) {
    return NextResponse.json(
      {error: 'failed', message: e instanceof Error ? e.message : 'server error'},
      {status: 500}
    );
  }
}
