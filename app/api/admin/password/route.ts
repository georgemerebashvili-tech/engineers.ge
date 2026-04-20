import {NextResponse} from 'next/server';
import {z} from 'zod';
import bcrypt from 'bcryptjs';
import {getSession, verifyCredentials} from '@/lib/auth';
import {getIp, logAdminAction} from '@/lib/admin-audit';

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4).max(200)
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

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

  const {currentPassword, newPassword} = parsed.data;

  const ok = await verifyCredentials(session.user, currentPassword);
  if (!ok) {
    return NextResponse.json({error: 'invalid_current_password'}, {status: 401});
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json(
      {
        error: 'vercel_config_missing',
        message:
          'VERCEL_TOKEN და VERCEL_PROJECT_ID env-ები არ არის დაყენებული. Vercel dashboard-ზე დაამატე ისინი, შემდეგ სცადე თავიდან.'
      },
      {status: 500}
    );
  }

  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`,
    {headers: {Authorization: `Bearer ${token}`}}
  );
  if (!listRes.ok) {
    const msg = await listRes.text();
    return NextResponse.json(
      {error: 'vercel_list_failed', message: msg},
      {status: 502}
    );
  }
  const list = (await listRes.json()) as {
    envs: {id: string; key: string; target: string[]}[];
  };
  const existing = list.envs.find(
    (e) => e.key === 'ADMIN_PASS_HASH' && e.target.includes('production')
  );

  if (existing) {
    const patchRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamQuery}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({value: newHash, target: ['production']})
      }
    );
    if (!patchRes.ok) {
      const msg = await patchRes.text();
      return NextResponse.json(
        {error: 'vercel_patch_failed', message: msg},
        {status: 502}
      );
    }
  } else {
    const postRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          key: 'ADMIN_PASS_HASH',
          value: newHash,
          type: 'encrypted',
          target: ['production']
        })
      }
    );
    if (!postRes.ok) {
      const msg = await postRes.text();
      return NextResponse.json(
        {error: 'vercel_post_failed', message: msg},
        {status: 502}
      );
    }
  }

  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  let redeployTriggered = false;
  if (deployHook) {
    const hookRes = await fetch(deployHook, {method: 'POST'});
    redeployTriggered = hookRes.ok;
  }

  await logAdminAction({
    actor: session.user,
    action: 'admin.password_change',
    target_type: 'vercel_env',
    target_id: 'ADMIN_PASS_HASH',
    metadata: {redeployTriggered},
    ip: getIp(req.headers)
  });

  return NextResponse.json({
    ok: true,
    redeployTriggered,
    note: redeployTriggered
      ? 'პაროლი შეცვლილია. redeploy-ი მიმდინარეობს ~60 წამში ძალაში შევა.'
      : 'პაროლი შეცვლილია env-ში. ძალაში შევა მომდევნო deployment-ის შემდეგ (Vercel dashboard → Deployments → Redeploy).'
  });
}
