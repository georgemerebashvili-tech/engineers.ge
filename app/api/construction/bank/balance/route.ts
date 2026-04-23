import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {bogBalance} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const iban = process.env.CONSTRUCTION_BOG_IBAN;
  const currency = process.env.CONSTRUCTION_BOG_CURRENCY || 'GEL';
  if (!iban) return NextResponse.json({error: 'CONSTRUCTION_BOG_IBAN not configured'}, {status: 503});

  try {
    const data = await bogBalance(iban, currency);
    return NextResponse.json({balance: data, iban, currency});
  } catch (e) {
    return NextResponse.json({error: String(e)}, {status: 502});
  }
}
