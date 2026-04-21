import {NextResponse} from 'next/server';
import {getCurrentDmtUser, isPrivilegedRole} from '@/lib/dmt/auth';
import {listDmtAudit} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const me = await getCurrentDmtUser();
  if (!me) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  if (!isPrivilegedRole(me.role))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '100');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const actor_id = url.searchParams.get('actor_id') ?? undefined;
  const action = url.searchParams.get('action') ?? undefined;
  const entity_type = url.searchParams.get('entity_type') ?? undefined;
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;

  const {rows, total} = await listDmtAudit({
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
    actor_id,
    action,
    entity_type,
    from,
    to
  });

  return NextResponse.json({rows, total});
}
