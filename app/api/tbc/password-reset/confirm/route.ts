import {NextResponse} from 'next/server';
import {z} from 'zod';
import {consumeTbcResetToken} from '@/lib/tbc/password-reset';

export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(6).max(128)
});

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const res = await consumeTbcResetToken(parsed.data.token, parsed.data.password);
  if (!res.ok) {
    return NextResponse.json({error: res.reason}, {status: 400});
  }

  return NextResponse.json({ok: true, username: res.username});
}
