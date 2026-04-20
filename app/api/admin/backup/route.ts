import {NextResponse, type NextRequest} from 'next/server';
import {getSession} from '@/lib/auth';
import {buildBackup} from '@/lib/db-backup';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const tablesParam = req.nextUrl.searchParams.get('tables') ?? '';
  const selected = tablesParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (selected.length === 0) {
    return NextResponse.json({error: 'bad_request', message: 'tables=a,b,c required'}, {status: 400});
  }

  const payload = await buildBackup(selected);
  await logAdminAction({
    actor: session.user,
    action: 'backup.export',
    target_type: 'tables',
    target_id: selected.join(','),
    metadata: {
      tables: Object.fromEntries(
        Object.entries(payload.tables).map(([k, v]) => [k, v.count])
      )
    },
    ip: getIp(req.headers)
  });

  const json = JSON.stringify(payload, null, 2);
  const filename = `engineers-ge-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  return new NextResponse(json, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store'
    }
  });
}
