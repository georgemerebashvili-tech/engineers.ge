import {NextResponse} from 'next/server';
import {
  getCurrentDmtUser,
  getDmtSession,
  isPrivilegedRole,
  verifyPassword
} from '@/lib/dmt/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {logDmtAudit} from '@/lib/dmt/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory throttle: 5 failed attempts / 15 min per user. Resets per instance,
// which is fine — the bar is "slow down a stolen session", not DoS protection.
const FAILED = new Map<string, {count: number; firstAt: number}>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function noteFail(userId: string) {
  const now = Date.now();
  const prev = FAILED.get(userId);
  if (!prev || now - prev.firstAt > WINDOW_MS) {
    FAILED.set(userId, {count: 1, firstAt: now});
    return 1;
  }
  prev.count += 1;
  return prev.count;
}

function clearFail(userId: string) {
  FAILED.delete(userId);
}

function isLocked(userId: string) {
  const p = FAILED.get(userId);
  if (!p) return false;
  if (Date.now() - p.firstAt > WINDOW_MS) {
    FAILED.delete(userId);
    return false;
  }
  return p.count >= MAX_FAILS;
}

export async function POST(req: Request) {
  const me = await getCurrentDmtUser();
  const session = await getDmtSession();
  if (!me || !session) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }
  if (!isPrivilegedRole(me.role)) {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }
  if (isLocked(me.id)) {
    return NextResponse.json(
      {error: 'locked', message: 'ბევრი ცდა — სცადე 15 წუთში'},
      {status: 429}
    );
  }

  let body: {password?: string};
  try {
    body = (await req.json()) as {password?: string};
  } catch {
    return NextResponse.json({error: 'bad_json'}, {status: 400});
  }
  const password = body?.password;
  if (!password || typeof password !== 'string') {
    return NextResponse.json({error: 'password_required'}, {status: 400});
  }

  const {data, error} = await supabaseAdmin()
    .from('dmt_users')
    .select('password_hash,status')
    .eq('id', me.id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({error: 'lookup_failed'}, {status: 500});
  }
  if (data.status === 'suspended') {
    return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const ok = await verifyPassword(password, data.password_hash);
  if (!ok) {
    const count = noteFail(me.id);
    void logDmtAudit({
      action: 'fb_webhook.reveal_failed',
      entity_type: 'secret',
      entity_id: 'fb_webhook_config',
      payload: {attempt: count},
      actor_id: me.id,
      actor_email: me.email,
      actor_role: me.role
    });
    return NextResponse.json({error: 'wrong_password'}, {status: 401});
  }

  clearFail(me.id);
  void logDmtAudit({
    action: 'fb_webhook.reveal',
    entity_type: 'secret',
    entity_id: 'fb_webhook_config',
    actor_id: me.id,
    actor_email: me.email,
    actor_role: me.role
  });

  return NextResponse.json({
    verifyToken: process.env.FB_VERIFY_TOKEN ?? null,
    appSecret: process.env.FB_APP_SECRET ?? null,
    pageToken: process.env.FB_PAGE_ACCESS_TOKEN ?? null
  });
}
