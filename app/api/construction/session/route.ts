import {NextResponse} from 'next/server';
import {getConstructionSession} from '@/lib/construction/auth';

export async function GET() {
  const s = await getConstructionSession();
  if (!s) return NextResponse.json({authenticated: false}, {status: 401});
  return NextResponse.json({
    authenticated: true,
    user: {username: s.username, role: s.role, displayName: s.displayName}
  });
}
