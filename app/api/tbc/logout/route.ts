import {NextResponse} from 'next/server';
import {destroyTbcSession} from '@/lib/tbc/auth';

export async function POST() {
  await destroyTbcSession();
  return NextResponse.json({ok: true});
}
