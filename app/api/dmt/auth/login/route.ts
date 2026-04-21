import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticateDmt, issueDmtSession} from '@/lib/dmt/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const {user, error} = await authenticateDmt(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({error: error ?? 'auth_failed'}, {status: 401});
  await issueDmtSession(user.id, user.email, user.role);
  return NextResponse.json({user});
}
