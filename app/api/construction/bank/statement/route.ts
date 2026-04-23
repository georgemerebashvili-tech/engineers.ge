import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {getBogConfig, bogStatement} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const cfg = await getBogConfig();
  if (!cfg) return NextResponse.json({error: 'BOG credentials not configured'}, {status: 503});

  const {searchParams} = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  if (!from || !to) return NextResponse.json({error: 'from and to required (YYYY-MM-DD)'}, {status: 400});

  try {
    const data = await bogStatement(cfg.account_iban, cfg.account_currency, from, to);
    return NextResponse.json({statement: data, iban: cfg.account_iban, currency: cfg.account_currency, from, to});
  } catch (e) {
    return NextResponse.json({error: String(e)}, {status: 502});
  }
}
