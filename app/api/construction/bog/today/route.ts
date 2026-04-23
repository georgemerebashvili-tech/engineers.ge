import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {bogToday} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const iban     = process.env.BOG_ACCOUNT_IBAN;
  const currency = process.env.BOG_ACCOUNT_CURRENCY || 'GEL';
  if (!iban) return NextResponse.json({error: 'BOG_ACCOUNT_IBAN not configured'}, {status: 503});

  try {
    const data = await bogToday(iban, currency);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({error: (e as Error).message}, {status: 502});
  }
}
