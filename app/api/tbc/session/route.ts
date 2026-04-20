import {NextResponse} from 'next/server';
import {getTbcSession} from '@/lib/tbc/auth';

export async function GET() {
  const s = await getTbcSession();
  if (!s) return NextResponse.json({authenticated: false}, {status: 401});
  return NextResponse.json({
    authenticated: true,
    user: {
      username: s.username,
      role: s.role,
      displayName: s.displayName
    }
  });
}
