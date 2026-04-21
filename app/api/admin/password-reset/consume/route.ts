import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {
  consumeAdminResetToken,
  peekAdminResetToken,
  updateAdminPassHashOnVercel
} from '@/lib/admin-password-reset';
import {getIp, logAdminAction} from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(10).max(200),
  newPassword: z.string().min(6).max(200)
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  // Verify token is valid before hitting Vercel API — avoids unnecessary writes.
  const peek = await peekAdminResetToken(body.token);
  if (!peek.ok) {
    return NextResponse.json({error: peek.reason}, {status: 400});
  }

  const vercel = await updateAdminPassHashOnVercel(body.newPassword);
  if (!vercel.ok) {
    return NextResponse.json(
      {error: vercel.error, message: vercel.message},
      {status: vercel.error === 'vercel_config_missing' ? 500 : 502}
    );
  }

  const consumed = await consumeAdminResetToken(body.token);
  if (!consumed.ok) {
    return NextResponse.json({error: consumed.reason}, {status: 400});
  }

  const ip = getIp(req.headers);
  await logAdminAction({
    actor: consumed.email,
    action: 'admin.password_reset_consume',
    target_type: 'vercel_env',
    target_id: 'ADMIN_PASS_HASH',
    metadata: {redeployTriggered: vercel.redeployTriggered},
    ip
  });

  return NextResponse.json({
    ok: true,
    redeployTriggered: vercel.redeployTriggered,
    note: vercel.redeployTriggered
      ? 'პაროლი შეცვლილია. redeploy-ი მიმდინარეობს ~60 წამში ძალაში შევა.'
      : 'პაროლი შეცვლილია env-ში. ძალაში შევა მომდევნო deployment-ის შემდეგ.'
  });
}
