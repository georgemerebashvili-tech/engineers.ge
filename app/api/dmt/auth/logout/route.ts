import {NextResponse} from 'next/server';
import {destroyDmtSession} from '@/lib/dmt/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await destroyDmtSession();
  return NextResponse.json({ok: true});
}
