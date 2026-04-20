import {NextResponse} from 'next/server';
import {z} from 'zod';
import {
  verifyLogin,
  issueTbcSession,
  logLoginEvent
} from '@/lib/tbc/auth';
import {writeAudit} from '@/lib/tbc/audit';

const Body = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
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

  const username = parsed.data.username.trim().toLowerCase();
  const user = await verifyLogin(username, parsed.data.password);

  if (!user) {
    await logLoginEvent({username, success: false});
    await writeAudit({
      actor: username,
      action: 'login.fail',
      summary: `ცდა შემოვიდე username-ით "${username}"`
    });
    return NextResponse.json({error: 'invalid_credentials'}, {status: 401});
  }

  await issueTbcSession(user);
  await logLoginEvent({username, userId: user.id, success: true});
  await writeAudit({
    actor: user.username,
    action: 'login.success',
    targetType: 'user',
    targetId: user.id,
    summary: `${user.displayName || user.username} შემოვიდა`,
    metadata: {role: user.role}
  });

  return NextResponse.json({
    ok: true,
    user: {
      username: user.username,
      role: user.role,
      displayName: user.displayName
    }
  });
}
