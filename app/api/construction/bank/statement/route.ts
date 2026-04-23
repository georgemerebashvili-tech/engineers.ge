import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {bogStatement} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session || session.role !== 'admin') return NextResponse.json({error: 'forbidden'}, {status: 403});

  const iban = process.env.CONSTRUCTION_BOG_IBAN;
  const currency = process.env.CONSTRUCTION_BOG_CURRENCY || 'GEL';
  if (!iban) return NextResponse.json({error: 'CONSTRUCTION_BOG_IBAN not configured'}, {status: 503});

  const {searchParams} = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({error: 'from and to required (YYYY-MM-DD)'}, {status: 400});

  try {
    const data = await bogStatement(iban, currency, from, to);
    return NextResponse.json({statement: data, iban, currency, from, to});
  } catch (e) {
    return NextResponse.json({error: String(e)}, {status: 502});
  }
}
