import {NextResponse} from 'next/server';
import {z} from 'zod';
import {verifyCredentials, issueSession} from '@/lib/auth';

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
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

  const ok = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!ok) {
    return NextResponse.json({error: 'invalid_credentials'}, {status: 401});
  }

  await issueSession(parsed.data.username);
  return NextResponse.json({ok: true});
}
