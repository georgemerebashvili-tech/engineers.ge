import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';
import {rsLookup} from '@/lib/construction/rsge';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const code = new URL(req.url).searchParams.get('code') ?? '';
  if (!code) return NextResponse.json({error: 'code_required'}, {status: 400});

  try {
    const company = await rsLookup(code);
    return NextResponse.json(company);
  } catch (e) {
    return NextResponse.json({error: (e as Error).message}, {status: 422});
  }
}
