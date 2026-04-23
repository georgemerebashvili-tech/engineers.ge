import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {getBogConfig, bogBalance} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const cfg = await getBogConfig();
  if (!cfg) return NextResponse.json({error: 'BOG credentials not configured — go to ⚙️ კონფიგურაცია'}, {status: 503});

  try {
    const data = await bogBalance(cfg.account_iban, cfg.account_currency);
    return NextResponse.json({balance: data, iban: cfg.account_iban, currency: cfg.account_currency});
  } catch (e) {
    return NextResponse.json({error: String(e)}, {status: 502});
  }
}
