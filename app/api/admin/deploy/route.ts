import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/deploy — triggers a Vercel Deploy Hook.
// Env: VERCEL_DEPLOY_HOOK_URL  (create in Vercel → Settings → Git → Deploy Hooks)
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'VERCEL_DEPLOY_HOOK_URL env არ არის დაყენებული. Vercel Dashboard → Settings → Git → Deploy Hooks.'
      },
      {status: 400}
    );
  }

  try {
    const res = await fetch(hook, {method: 'POST'});
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[admin/deploy] hook returned', res.status, txt);
      return NextResponse.json(
        {error: 'hook_failed', status: res.status, detail: txt.slice(0, 400)},
        {status: 502}
      );
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ok: true, hook: data});
  } catch (e) {
    return NextResponse.json(
      {error: 'network', message: e instanceof Error ? e.message : 'error'},
      {status: 500}
    );
  }
}
