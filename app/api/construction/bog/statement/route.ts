import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {bogStatement} from '@/lib/construction/bog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {searchParams} = new URL(req.url);
  const from     = searchParams.get('from');
  const to       = searchParams.get('to');
  const iban     = process.env.BOG_ACCOUNT_IBAN;
  const currency = process.env.BOG_ACCOUNT_CURRENCY || 'GEL';

  if (!from || !to) return NextResponse.json({error: 'from / to required'}, {status: 400});
  if (!iban)        return NextResponse.json({error: 'BOG_ACCOUNT_IBAN not configured'}, {status: 503});

  try {
    const data = await bogStatement(iban, currency, from, to);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({error: (e as Error).message}, {status: 502});
  }
}
